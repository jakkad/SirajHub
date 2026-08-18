import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Item } from "../../../lib/api";
import { inspectionCameraDistance, packShelfGroups, stableBookHash } from "../../../lib/bookshelf-layout";

export type ShelfTone = "suggestions" | "in_progress" | "finished" | "archived";

export interface ShelfEngineOptions {
  canvas: HTMLCanvasElement;
  groups: Array<{ label: string; items: Item[] }>;
  tone: ShelfTone;
  reducedMotion: boolean;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onActivate: (item: Item) => void;
  onInspectionChange?: (inspecting: boolean) => void;
  onToggleSelection: (id: string) => void;
  continuous?: boolean;
  onReady?: () => void;
  onError?: (message: string) => void;
}

interface BookNode {
  item: Item;
  root: THREE.Group;
  home: THREE.Vector3;
  selectedOutline: THREE.Mesh;
  row: number;
  thickness: number;
  height: number;
  coverWidth: number;
  showcaseX: number;
  showcaseScaleX: number;
}

const TEMPLATE_COLORS = [
  0x65a08d, 0x182f55, 0xe96b2f, 0x9b1832, 0x213958, 0xeee9dd, 0xed765b,
  0x272723, 0x73937e, 0xc18c3c, 0x5f2548, 0x315f70, 0xb65336, 0x3e684d,
  0xd6b85d, 0x722f36, 0x294868, 0xa95545, 0x496f63,
];

const COVER_BOARD_DEPTH = 0.045;
const COVER_SURFACE_GAP = 0.003;

function coverFaceX(thickness: number, layerOffset = 0) {
  return thickness / 2 + COVER_BOARD_DEPTH / 2 + COVER_SURFACE_GAP + layerOffset;
}

const TONES: Record<ShelfTone, { background: number; accent: number; ambient: number }> = {
  suggestions: { background: 0xe7eee9, accent: 0x92b9bd, ambient: 0xb7d0c9 },
  in_progress: { background: 0xf2e6d3, accent: 0xe0a45b, ambient: 0xe8c18d },
  finished: { background: 0xf1eadc, accent: 0xd2b48c, ambient: 0xe5d8bd },
  archived: { background: 0xe3dfd7, accent: 0x8d8b84, ambient: 0xb8b3aa },
};

export class ShelfEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly scene = new THREE.Scene();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  private readonly controls: OrbitControls;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly textureLoader = new THREE.TextureLoader();
  private readonly bookNodes: BookNode[] = [];
  private readonly disposables = new Set<THREE.Texture | THREE.Material | THREE.BufferGeometry>();
  private frame = 0;
  private paused = false;
  private disposed = false;
  private activeIndex = -1;
  private inspectionId: string | null = null;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private rowCount = 1;
  private lastFrameAt = performance.now();
  private shelfWidth = 8;
  private viewportShelfWidth = 7.2;
  private readonly continuous: boolean;
  private selectionMode: boolean;
  private selectedIds: Set<string>;
  private reducedMotion: boolean;
  private onActivate: (item: Item) => void;
  private onInspectionChange?: (inspecting: boolean) => void;
  private onToggleSelection: (id: string) => void;
  private resizeObserver: ResizeObserver;

  constructor(options: ShelfEngineOptions) {
    this.canvas = options.canvas;
    this.selectionMode = options.selectionMode;
    this.selectedIds = new Set(options.selectedIds);
    this.reducedMotion = options.reducedMotion;
    this.onActivate = options.onActivate;
    this.onInspectionChange = options.onInspectionChange;
    this.onToggleSelection = options.onToggleSelection;
    this.continuous = options.continuous ?? false;
    this.textureLoader.setCrossOrigin("use-credentials");

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (error) {
      options.onError?.(error instanceof Error ? error.message : "WebGL is unavailable");
      throw error;
    }
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const tone = TONES[options.tone];
    this.scene.background = null;
    this.scene.add(new THREE.HemisphereLight(tone.ambient, 0x493526, 2.45));
    const key = new THREE.DirectionalLight(tone.accent, 3.6);
    key.position.set(-4, 7, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -7;
    this.scene.add(key);
    const warm = new THREE.PointLight(options.tone === "in_progress" ? 0xffb85c : 0xffedd0, 3.2, 14);
    warm.position.set(4, 3, 5);
    this.scene.add(warm);
    const rim = new THREE.DirectionalLight(0xc8d5e5, 1.8);
    rim.position.set(5, 3, -4);
    this.scene.add(rim);
    const shadowGeometry = new THREE.PlaneGeometry(30, 16);
    const shadowMaterial = new THREE.ShadowMaterial({ color: 0x5b4939, opacity: 0.11 });
    this.track(shadowGeometry, shadowMaterial);
    const shadowCatcher = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowCatcher.position.set(0, 3, -2.8);
    shadowCatcher.receiveShadow = true;
    this.scene.add(shadowCatcher);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enabled = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 9;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = true;
    this.controls.minPolarAngle = Math.PI * 0.22;
    this.controls.maxPolarAngle = Math.PI * 0.78;

    this.build(options.groups, options.tone);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
    this.bindEvents();
    this.resize();
    this.frame = requestAnimationFrame(this.tick);
    options.onReady?.();
  }

  private build(groups: Array<{ label: string; items: Item[] }>, tone: ShelfTone) {
    this.viewportShelfWidth = this.canvas.clientWidth < 640 ? 3.8 : 7.2;
    const layout = packShelfGroups(groups, this.viewportShelfWidth, { continuous: this.continuous });
    this.rowCount = Math.max(1, layout.rowCount);
    this.shelfWidth = layout.shelfWidth;
    const rowSpacing = 3.15;
    const totalHeight = this.rowCount * rowSpacing;
    const yTop = totalHeight / 2 - 1.25;

    for (let row = 0; row < this.rowCount; row += 1) {
      const y = yTop - row * rowSpacing - 1.38;
      const shelf = this.createShelf(this.shelfWidth + 0.75);
      shelf.position.set(this.continuous ? Math.max(0, (this.shelfWidth - this.viewportShelfWidth) / 2) : 0, y - 0.04, 0);
      this.scene.add(shelf);
    }

    for (const group of layout.groups) {
      if (!group.books.length) continue;
      for (const layoutBook of group.books) {
        const y = yTop - layoutBook.row * rowSpacing - 1.28;
        const root = this.createBook(layoutBook.item, layoutBook.thickness, layoutBook.height, tone);
        root.position.set(layoutBook.x, y, 0);
        root.rotation.z = ((stableBookHash(layoutBook.item.id) % 9) - 4) * 0.004;
        this.scene.add(root);
        const outline = root.getObjectByName("selection-outline") as THREE.Mesh;
        this.bookNodes.push({
          item: layoutBook.item,
          root,
          home: root.position.clone(),
          selectedOutline: outline,
          row: layoutBook.row,
          thickness: layoutBook.thickness,
          height: layoutBook.height,
          coverWidth: layoutBook.height * 0.66,
          showcaseX: root.position.x,
          showcaseScaleX: 1,
        });
      }
    }

    this.activeIndex = this.bookNodes.length ? 0 : -1;
    this.updateShowcaseLayout();
    this.resetCamera();
    if (this.activeIndex >= 0) this.onActivate(this.bookNodes[this.activeIndex]!.item);
  }

  private createShelf(width: number) {
    const group = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x86563b, roughness: 0.56, metalness: 0.02 });
    const edge = new THREE.MeshStandardMaterial({ color: 0x382116, roughness: 0.72 });
    const slabGeometry = new RoundedBoxGeometry(width, 0.24, 2.05, 3, 0.055);
    const lipGeometry = new RoundedBoxGeometry(width + 0.16, 0.13, 0.16, 3, 0.035);
    this.track(slabGeometry, lipGeometry, wood, edge);
    const slab = new THREE.Mesh(slabGeometry, wood);
    slab.receiveShadow = true;
    group.add(slab);
    const lip = new THREE.Mesh(lipGeometry, edge);
    lip.position.set(0, -0.15, 1.02);
    lip.receiveShadow = true;
    group.add(lip);
    return group;
  }

  private createBook(item: Item, thickness: number, height: number, tone: ShelfTone) {
    const root = new THREE.Group();
    root.userData.itemId = item.id;
    const hash = stableBookHash(item.id);
    const template = hash % TEMPLATE_COLORS.length;
    const coverWidth = height * 0.66;
    const saturation = tone === "archived" ? 0.48 : 1;
    const baseColor = new THREE.Color(TEMPLATE_COLORS[template]!).lerp(new THREE.Color(0x8b867c), 1 - saturation);
    const cloth = new THREE.MeshPhysicalMaterial({
      color: baseColor,
      roughness: 0.76,
      metalness: 0.01,
      sheen: 0.34,
      sheenColor: baseColor.clone().offsetHSL(0, -0.08, 0.16),
      sheenRoughness: 0.82,
      clearcoat: template % 7 === 0 ? 0.1 : 0.025,
      clearcoatRoughness: 0.7,
    });
    const pages = new THREE.MeshStandardMaterial({ color: 0xeee7d8, roughness: 0.9 });
    const foil = new THREE.MeshStandardMaterial({ color: 0xd5ad67, roughness: 0.36, metalness: 0.5 });
    const boardGeometry = new RoundedBoxGeometry(COVER_BOARD_DEPTH, height, coverWidth, 4, 0.025);
    const spineGeometry = new RoundedBoxGeometry(thickness, height, 0.055, 4, 0.025);
    const pageGeometry = new RoundedBoxGeometry(Math.max(0.08, thickness - 0.075), height - 0.115, coverWidth - 0.105, 3, 0.018);
    this.track(boardGeometry, spineGeometry, pageGeometry, cloth, pages, foil);

    const pageBlock = new THREE.Mesh(pageGeometry, pages);
    pageBlock.position.set(0.018, height / 2, -0.018);
    pageBlock.userData.itemId = item.id;
    pageBlock.castShadow = true;
    root.add(pageBlock);

    for (const side of [-1, 1]) {
      const board = new THREE.Mesh(boardGeometry, cloth);
      board.position.set(side * thickness / 2, height / 2, 0);
      board.userData.itemId = item.id;
      board.castShadow = true;
      root.add(board);
    }

    const spine = new THREE.Mesh(spineGeometry, cloth);
    spine.position.set(0, height / 2, coverWidth / 2 - 0.005);
    spine.userData.itemId = item.id;
    spine.castShadow = true;
    root.add(spine);

    const hingeGeometry = new THREE.BoxGeometry(0.022, height - 0.08, 0.035);
    this.track(hingeGeometry);
    for (const side of [-1, 1]) {
      const hinge = new THREE.Mesh(hingeGeometry, foil);
      hinge.position.set(side * Math.max(0.02, thickness / 2 - 0.04), height / 2, coverWidth / 2 + 0.03);
      hinge.userData.itemId = item.id;
      root.add(hinge);
    }

    this.addSpineLabel(root, item, thickness, height, coverWidth, baseColor);

    const headbandGeometry = new THREE.CylinderGeometry(0.018, 0.018, coverWidth - 0.12, 10);
    headbandGeometry.rotateX(Math.PI / 2);
    this.track(headbandGeometry);
    for (const y of [0.055, height - 0.055]) {
      const headband = new THREE.Mesh(headbandGeometry, foil);
      headband.position.set(0, y, 0);
      headband.userData.itemId = item.id;
      root.add(headband);
    }

    if (tone === "in_progress" && item.progressPercent != null) {
      const markerGeometry = new THREE.BoxGeometry(Math.max(0.035, thickness * 0.13), Math.max(0.04, height * item.progressPercent / 100), 0.022);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xf6b94d });
      this.track(markerGeometry, markerMaterial);
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(0, Math.max(0.03, height * item.progressPercent / 200), coverWidth / 2 + 0.064);
      marker.userData.itemId = item.id;
      root.add(marker);
    }

    const outlineGeometry = new THREE.BoxGeometry(thickness + 0.07, height + 0.07, coverWidth + 0.07);
    const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x39d9ff, wireframe: true, transparent: true, opacity: 0.95 });
    this.track(outlineGeometry, outlineMaterial);
    const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
    outline.name = "selection-outline";
    outline.position.y = height / 2;
    outline.visible = this.selectedIds.has(item.id);
    root.add(outline);

    this.addGeneratedCover(root, item, thickness, height, coverWidth, baseColor, template);
    if (item.coverUrl) this.addCoverTexture(root, item, thickness, height, coverWidth);
    return root;
  }

  private addSpineLabel(root: THREE.Group, item: Item, thickness: number, height: number, coverWidth: number, baseColor: THREE.Color) {
    const canvas = document.createElement("canvas");
    const labelWidth = Math.max(0.08, thickness - 0.025);
    const labelHeight = height - 0.08;
    canvas.height = 1536;
    canvas.width = Math.round(THREE.MathUtils.clamp(canvas.height * (labelWidth / labelHeight), 128, 320));
    const context = canvas.getContext("2d")!;
    context.fillStyle = `#${baseColor.getHexString()}`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(220,169,82,.9)";
    context.lineWidth = Math.max(5, canvas.width * 0.045);
    context.beginPath();
    context.moveTo(canvas.width * 0.14, 54);
    context.lineTo(canvas.width * 0.14, canvas.height - 54);
    context.stroke();

    const titleCharacters = Array.from(item.title.replace(/\s+/g, " ").trim());
    const title = titleCharacters.length > 28 ? `${titleCharacters.slice(0, 27).join("")}…` : titleCharacters.join("");
    const foreground = baseColor.getHSL({ h: 0, s: 0, l: 0 }).l > 0.6 ? "#211f1a" : "#fff8e8";
    const outline = baseColor.getHSL({ h: 0, s: 0, l: 0 }).l > 0.6 ? "rgba(255,248,232,.38)" : "rgba(25,22,18,.45)";
    context.save();
    context.translate(canvas.width * 0.61, canvas.height / 2);
    context.rotate(-Math.PI / 2);
    context.fillStyle = foreground;
    context.strokeStyle = outline;
    context.lineWidth = Math.max(2, canvas.width * 0.018);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `700 ${Math.round(THREE.MathUtils.clamp(canvas.width * 0.45, 58, 112))}px Georgia, "Noto Naskh Arabic", serif`;
    context.strokeText(title, 0, 0, canvas.height - 250);
    context.fillText(title, 0, 0, canvas.height - 250);
    context.restore();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const geometry = new THREE.PlaneGeometry(labelWidth, labelHeight);
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    this.track(texture, geometry, material);
    const label = new THREE.Mesh(geometry, material);
    label.position.set(0, height / 2, coverWidth / 2 + 0.029);
    label.userData.itemId = item.id;
    root.add(label);
  }

  private addGeneratedCover(root: THREE.Group, item: Item, thickness: number, height: number, coverWidth: number, baseColor: THREE.Color, template: number) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 768;
    const context = canvas.getContext("2d")!;
    context.fillStyle = `#${baseColor.getHexString()}`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(226,188,105,.85)";
    context.lineWidth = 4;
    context.strokeRect(38, 38, 436, 692);
    context.beginPath();
    const motif = 88 + (template % 5) * 16;
    for (let ring = 0; ring < 4; ring += 1) {
      context.beginPath();
      context.ellipse(256 + ring * 12, 265 + ring * 20, motif + ring * 22, motif * 0.72 + ring * 11, ring * 0.31, 0, Math.PI * 2);
      context.stroke();
    }
    context.fillStyle = "rgba(255,242,211,.95)";
    context.textAlign = "center";
    context.font = "600 36px Georgia, serif";
    const words = item.title.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = `${line} ${word}`.trim();
      if (context.measureText(candidate).width > 380 && line) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) lines.push(line);
    lines.slice(0, 5).forEach((entry, index) => context.fillText(entry, 256, 455 + index * 44));
    context.font = "500 22px Arial, sans-serif";
    context.fillText(item.creator ?? "SIRAJHUB LIBRARY", 256, 684);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.PlaneGeometry(coverWidth - 0.075, height - 0.085);
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    this.track(texture, geometry, material);
    const cover = new THREE.Mesh(geometry, material);
    cover.rotation.y = Math.PI / 2;
    cover.position.set(coverFaceX(thickness), height / 2, 0);
    cover.userData.itemId = item.id;
    root.add(cover);
  }

  private addCoverTexture(root: THREE.Group, item: Item, thickness: number, height: number, coverWidth: number) {
    this.textureLoader.load(
      `/api/items/${encodeURIComponent(item.id)}/cover?v=${item.updatedAt}`,
      (texture) => {
        if (this.disposed) return texture.dispose();
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        const geometry = new THREE.PlaneGeometry(coverWidth - 0.075, height - 0.085);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          toneMapped: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        });
        this.track(texture, geometry, material);
        const cover = new THREE.Mesh(geometry, material);
        cover.rotation.y = Math.PI / 2;
        cover.position.set(coverFaceX(thickness, 0.002), height / 2, 0);
        cover.renderOrder = 3;
        cover.userData.itemId = item.id;
        root.add(cover);
      },
      undefined,
      () => undefined
    );
  }

  private track(...resources: Array<THREE.Texture | THREE.Material | THREE.BufferGeometry>) {
    resources.forEach((resource) => this.disposables.add(resource));
  }

  private bindEvents() {
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.canvas.addEventListener("keydown", this.onKeyDown);
  }

  private onPointerDown = (event: PointerEvent) => {
    this.pointerDownX = event.clientX;
    this.pointerDownY = event.clientY;
    this.canvas.focus();
  };

  private onPointerUp = (event: PointerEvent) => {
    const dx = event.clientX - this.pointerDownX;
    const dy = event.clientY - this.pointerDownY;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
      this.browseBy(dx > 0 ? -1 : 1);
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.scene.children, true).find((entry) => entry.object.userData.itemId);
    const id = hit?.object.userData.itemId as string | undefined;
    if (!id) return;
    if (this.selectionMode) this.onToggleSelection(id);
    else this.inspect(id);
  };

  private onWheel = (event: WheelEvent) => {
    if (document.activeElement !== this.canvas || this.inspectionId) return;
    event.preventDefault();
    this.browseBy(event.deltaY > 0 || event.deltaX > 0 ? 1 : -1);
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      this.browseBy(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      this.browseBy(-1);
    } else if (event.key === "Enter" && this.activeIndex >= 0) {
      this.inspect(this.bookNodes[this.activeIndex]!.item.id);
    } else if (event.key === "Escape") {
      this.returnToShelf();
    }
  };

  browseBy(delta: number) {
    if (!this.bookNodes.length || this.inspectionId) return;
    this.activeIndex = (this.activeIndex + delta + this.bookNodes.length) % this.bookNodes.length;
    this.updateShowcaseLayout();
    this.onActivate(this.bookNodes[this.activeIndex]!.item);
  }

  focusIndex(index: number) {
    if (!this.bookNodes.length) return;
    this.activeIndex = THREE.MathUtils.clamp(index, 0, this.bookNodes.length - 1);
    this.updateShowcaseLayout();
    this.onActivate(this.bookNodes[this.activeIndex]!.item);
  }

  inspect(id: string) {
    const node = this.bookNodes.find((entry) => entry.item.id === id);
    if (!node) return;
    this.activeIndex = this.bookNodes.indexOf(node);
    this.updateShowcaseLayout();
    this.inspectionId = id;
    this.controls.enabled = true;
    this.frameInspection(node);
    this.onActivate(node.item);
    this.onInspectionChange?.(true);
  }

  returnToShelf() {
    this.inspectionId = null;
    this.controls.enabled = false;
    this.camera.clearViewOffset();
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 9;
    this.resetCamera();
    if (this.activeIndex >= 0) this.onActivate(this.bookNodes[this.activeIndex]!.item);
    this.onInspectionChange?.(false);
  }

  setInteraction(selectionMode: boolean, selectedIds: Set<string>) {
    this.selectionMode = selectionMode;
    this.selectedIds = new Set(selectedIds);
    for (const node of this.bookNodes) node.selectedOutline.visible = this.selectedIds.has(node.item.id);
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (!paused && !this.frame) this.frame = requestAnimationFrame(this.tick);
  }

  private resize() {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = width < 600 ? 33 : width < 920 ? 30 : 27;
    this.camera.updateProjectionMatrix();
    if (!this.inspectionId) this.resetCamera();
    else {
      const inspected = this.bookNodes.find((node) => node.item.id === this.inspectionId);
      if (inspected) this.frameInspection(inspected);
    }
  }

  private shelfCameraDistance() {
    const sceneHeight = this.rowCount * 3.15 + 0.35;
    const responsiveMinimum = this.canvas.clientWidth < 760 ? 8.3 : 6.65;
    return Math.max(responsiveMinimum, (sceneHeight / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)))) * 1.01);
  }

  private resetCamera() {
    const targetY = 0.35;
    this.camera.clearViewOffset();
    this.camera.position.set(0, targetY, this.shelfCameraDistance());
    this.camera.lookAt(0, targetY, 0);
  }

  private frameInspection(node: BookNode) {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    const compact = width < 640;
    const contextWidth = Math.min(this.shelfWidth, Math.max(node.coverWidth * 2.8, 3.8));
    const distance = inspectionCameraDistance({
      bookHeight: node.height,
      contextWidth,
      verticalFovDegrees: this.camera.fov,
      viewportAspect: width / height,
      usableHorizontalRatio: compact ? 0.9 : 0.64,
    });
    const target = new THREE.Vector3(node.showcaseX, node.home.y + node.height / 2, 1.15);

    if (compact) this.camera.clearViewOffset();
    else {
      const detailWidth = Math.min(430, width * 0.36);
      this.camera.setViewOffset(width, height, -detailWidth * 0.46, 0, width, height);
    }

    this.controls.target.copy(target);
    this.controls.minDistance = distance * 0.72;
    this.controls.maxDistance = distance * 1.45;
    this.camera.position.set(target.x, target.y + node.height * 0.025, target.z + distance);
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private updateShowcaseLayout() {
    for (const node of this.bookNodes) {
      node.showcaseX = node.home.x;
      node.showcaseScaleX = 1;
    }
    const active = this.bookNodes[this.activeIndex];
    if (!active) return;
    const compact = this.canvas.clientWidth < 640;
    const heroX = compact ? -0.25 : 0.15;
    active.showcaseX = heroX;
    const neighbors = this.bookNodes.filter((node) => node !== active && node.row === active.row);
    const gap = 0.045;
    const start = heroX + active.coverWidth / 2 + 0.06;
    if (this.continuous) {
      let cursor = start;
      for (const node of neighbors) {
        node.showcaseScaleX = 1;
        node.showcaseX = cursor + node.thickness / 2;
        cursor += node.thickness + gap;
      }
      return;
    }
    const available = Math.max(0.5, this.shelfWidth / 2 + 0.28 - start);
    const naturalWidth = neighbors.reduce((sum, node) => sum + node.thickness + gap, 0);
    const scale = naturalWidth > 0 ? THREE.MathUtils.clamp(available / naturalWidth, 0.48, 1.35) : 1;
    let cursor = start;
    for (const node of neighbors) {
      node.showcaseScaleX = scale;
      node.showcaseX = cursor + node.thickness * scale / 2;
      cursor += node.thickness * scale + gap;
    }
  }

  private tick = () => {
    this.frame = 0;
    if (this.disposed || this.paused) return;
    const now = performance.now();
    const delta = Math.min(0.04, Math.max(0.001, (now - this.lastFrameAt) / 1000));
    this.lastFrameAt = now;
    const smoothing = this.reducedMotion ? 1 : 1 - Math.pow(0.0005, delta);
    for (const [index, node] of this.bookNodes.entries()) {
      const inspecting = node.item.id === this.inspectionId;
      const active = index === this.activeIndex;
      const targetX = node.row === this.bookNodes[this.activeIndex]?.row ? node.showcaseX : node.home.x;
      const targetZ = inspecting ? 1.15 : active ? 0.28 : 0;
      const targetY = node.home.y + (inspecting ? 0.12 : 0);
      node.root.position.x = THREE.MathUtils.lerp(node.root.position.x, targetX, smoothing);
      node.root.position.y = THREE.MathUtils.lerp(node.root.position.y, targetY, smoothing);
      node.root.position.z = THREE.MathUtils.lerp(node.root.position.z, targetZ, smoothing);
      node.root.rotation.y = THREE.MathUtils.lerp(node.root.rotation.y, active ? -Math.PI / 2 : 0, smoothing);
      const targetScaleX = active ? 1 : node.showcaseScaleX;
      node.root.scale.x = THREE.MathUtils.lerp(node.root.scale.x, targetScaleX, smoothing);
    }
    if (this.controls.enabled) this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.tick);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("keydown", this.onKeyDown);
    this.controls.dispose();
    this.disposables.forEach((resource) => resource.dispose());
    this.disposables.clear();
    this.scene.clear();
    this.renderer.dispose();
  }
}
