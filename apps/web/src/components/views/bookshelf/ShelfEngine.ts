import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Item } from "../../../lib/api";
import { packShelfGroups, stableBookHash } from "../../../lib/bookshelf-layout";

export type ShelfTone = "suggestions" | "in_progress" | "finished" | "archived";

export interface ShelfEngineOptions {
  canvas: HTMLCanvasElement;
  groups: Array<{ label: string; items: Item[] }>;
  tone: ShelfTone;
  reducedMotion: boolean;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onActivate: (item: Item) => void;
  onToggleSelection: (id: string) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
}

interface BookNode {
  item: Item;
  root: THREE.Group;
  home: THREE.Vector3;
  selectedOutline: THREE.Mesh;
}

const TEMPLATE_COLORS = [
  0x355c54, 0x536b5c, 0x334c63, 0x6b3f3a, 0x865b3e, 0x73505a, 0x424f65,
  0x3d655f, 0x7d6946, 0x5c3e52, 0x35546b, 0x684b3e, 0x445d48, 0x7b4a45,
  0x4b4f68, 0x856d4f, 0x4c695e, 0x65534a, 0x3c5962,
];

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
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
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
  private selectionMode: boolean;
  private selectedIds: Set<string>;
  private reducedMotion: boolean;
  private onActivate: (item: Item) => void;
  private onToggleSelection: (id: string) => void;
  private resizeObserver: ResizeObserver;

  constructor(options: ShelfEngineOptions) {
    this.canvas = options.canvas;
    this.selectionMode = options.selectionMode;
    this.selectedIds = new Set(options.selectedIds);
    this.reducedMotion = options.reducedMotion;
    this.onActivate = options.onActivate;
    this.onToggleSelection = options.onToggleSelection;

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch (error) {
      options.onError?.(error instanceof Error ? error.message : "WebGL is unavailable");
      throw error;
    }
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    const tone = TONES[options.tone];
    this.scene.background = new THREE.Color(tone.background);
    this.scene.fog = new THREE.Fog(tone.background, 11, 22);
    this.scene.add(new THREE.HemisphereLight(tone.ambient, 0x493526, 2.2));
    const key = new THREE.DirectionalLight(tone.accent, 3.6);
    key.position.set(-4, 8, 8);
    this.scene.add(key);
    const warm = new THREE.PointLight(options.tone === "in_progress" ? 0xffb85c : 0xffedd0, 3.2, 14);
    warm.position.set(4, 3, 5);
    this.scene.add(warm);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enabled = false;
    this.controls.enableDamping = true;
    this.controls.minDistance = 2.7;
    this.controls.maxDistance = 8;
    this.controls.enablePan = true;

    this.build(options.groups, options.tone);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
    this.bindEvents();
    this.resize();
    this.frame = requestAnimationFrame(this.tick);
    options.onReady?.();
  }

  private build(groups: Array<{ label: string; items: Item[] }>, tone: ShelfTone) {
    const layout = packShelfGroups(groups, this.canvas.clientWidth < 640 ? 4.2 : 8.4);
    this.rowCount = Math.max(1, layout.rowCount);
    this.shelfWidth = layout.shelfWidth;
    const totalHeight = this.rowCount * 2.45;
    const yTop = totalHeight / 2 - 0.9;

    for (let row = 0; row < this.rowCount; row += 1) {
      const y = yTop - row * 2.45 - 1.02;
      const shelf = this.createShelf(this.shelfWidth + 0.75);
      shelf.position.set(0, y - 0.04, 0);
      this.scene.add(shelf);
    }

    for (const group of layout.groups) {
      if (!group.books.length) continue;
      for (const layoutBook of group.books) {
        const y = yTop - layoutBook.row * 2.45 - 0.94;
        const root = this.createBook(layoutBook.item, layoutBook.thickness, layoutBook.height, tone);
        root.position.set(layoutBook.x, y, 0);
        root.rotation.z = ((stableBookHash(layoutBook.item.id) % 9) - 4) * 0.004;
        this.scene.add(root);
        const outline = root.getObjectByName("selection-outline") as THREE.Mesh;
        this.bookNodes.push({ item: layoutBook.item, root, home: root.position.clone(), selectedOutline: outline });
      }
    }

    this.camera.position.set(0, 0, this.shelfCameraDistance());
    this.camera.lookAt(0, 0, 0);
  }

  private createShelf(width: number) {
    const group = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4227, roughness: 0.7, metalness: 0.03 });
    const edge = new THREE.MeshStandardMaterial({ color: 0x3f2819, roughness: 0.82 });
    const slabGeometry = new THREE.BoxGeometry(width, 0.16, 0.82);
    const lipGeometry = new THREE.BoxGeometry(width + 0.12, 0.12, 0.12);
    this.track(slabGeometry, lipGeometry, wood, edge);
    group.add(new THREE.Mesh(slabGeometry, wood));
    const lip = new THREE.Mesh(lipGeometry, edge);
    lip.position.set(0, -0.09, 0.42);
    group.add(lip);
    return group;
  }

  private createBook(item: Item, thickness: number, height: number, tone: ShelfTone) {
    const root = new THREE.Group();
    root.userData.itemId = item.id;
    const hash = stableBookHash(item.id);
    const template = hash % TEMPLATE_COLORS.length;
    const saturation = tone === "archived" ? 0.48 : 1;
    const baseColor = new THREE.Color(TEMPLATE_COLORS[template]!).lerp(new THREE.Color(0x8b867c), 1 - saturation);
    const cloth = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.88, metalness: 0.02 });
    const pages = new THREE.MeshStandardMaterial({ color: 0xe9dfc8, roughness: 0.92 });
    const foil = new THREE.MeshStandardMaterial({ color: 0xd3ad62, roughness: 0.42, metalness: 0.55 });
    const coverGeometry = new THREE.BoxGeometry(thickness, height, 0.54);
    const pageGeometry = new THREE.BoxGeometry(Math.max(0.08, thickness - 0.045), height - 0.1, 0.47);
    this.track(coverGeometry, pageGeometry, cloth, pages, foil);
    const cover = new THREE.Mesh(coverGeometry, cloth);
    cover.position.y = height / 2;
    cover.userData.itemId = item.id;
    root.add(cover);
    const pageBlock = new THREE.Mesh(pageGeometry, pages);
    pageBlock.position.set(0.018, height / 2, 0.035);
    pageBlock.userData.itemId = item.id;
    root.add(pageBlock);

    const bandGeometry = new THREE.BoxGeometry(Math.max(0.04, thickness * 0.48), 0.025, 0.57);
    this.track(bandGeometry);
    for (const factor of [0.22, 0.78]) {
      const band = new THREE.Mesh(bandGeometry, foil);
      band.position.set(0, height * factor, 0);
      band.userData.itemId = item.id;
      root.add(band);
    }

    if (tone === "in_progress" && item.progressPercent != null) {
      const markerGeometry = new THREE.BoxGeometry(Math.max(0.035, thickness * 0.18), Math.max(0.04, height * item.progressPercent / 100), 0.575);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xf6b94d });
      this.track(markerGeometry, markerMaterial);
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(0, Math.max(0.03, height * item.progressPercent / 200), 0);
      marker.userData.itemId = item.id;
      root.add(marker);
    }

    const outlineGeometry = new THREE.BoxGeometry(thickness + 0.055, height + 0.055, 0.6);
    const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x39d9ff, wireframe: true, transparent: true, opacity: 0.95 });
    this.track(outlineGeometry, outlineMaterial);
    const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
    outline.name = "selection-outline";
    outline.position.y = height / 2;
    outline.visible = this.selectedIds.has(item.id);
    root.add(outline);

    this.addGeneratedCover(root, item, thickness, height, baseColor, template);
    if (item.coverUrl) this.addCoverTexture(root, item, thickness, height);
    return root;
  }

  private addGeneratedCover(root: THREE.Group, item: Item, thickness: number, height: number, baseColor: THREE.Color, template: number) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 768;
    const context = canvas.getContext("2d")!;
    context.fillStyle = `#${baseColor.getHexString()}`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(226,188,105,.85)";
    context.lineWidth = 5;
    context.strokeRect(45, 45, 422, 678);
    context.beginPath();
    const motif = 105 + (template % 5) * 18;
    context.arc(256, 245, motif, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = "rgba(255,242,211,.95)";
    context.textAlign = "center";
    context.font = "600 38px Georgia, serif";
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
    lines.slice(0, 5).forEach((entry, index) => context.fillText(entry, 256, 455 + index * 46));
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.PlaneGeometry(0.5, height - 0.08);
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    this.track(texture, geometry, material);
    const cover = new THREE.Mesh(geometry, material);
    cover.rotation.y = Math.PI / 2;
    cover.position.set(thickness / 2 + 0.002, height / 2, 0);
    cover.userData.itemId = item.id;
    root.add(cover);
  }

  private addCoverTexture(root: THREE.Group, item: Item, thickness: number, height: number) {
    this.textureLoader.load(
      item.coverUrl!,
      (texture) => {
        if (this.disposed) return texture.dispose();
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
        const geometry = new THREE.PlaneGeometry(0.5, height - 0.08);
        const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
        this.track(texture, geometry, material);
        const cover = new THREE.Mesh(geometry, material);
        cover.rotation.y = Math.PI / 2;
        cover.position.set(thickness / 2 + 0.004, height / 2, 0);
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
  }

  focusIndex(index: number) {
    if (!this.bookNodes.length) return;
    this.activeIndex = THREE.MathUtils.clamp(index, 0, this.bookNodes.length - 1);
  }

  inspect(id: string) {
    const node = this.bookNodes.find((entry) => entry.item.id === id);
    if (!node) return;
    this.inspectionId = id;
    this.controls.enabled = true;
    this.controls.target.copy(node.home).add(new THREE.Vector3(0, 0.9, 1.2));
    this.camera.position.set(node.home.x + 2.4, node.home.y + 1.15, 4.2);
    this.camera.lookAt(this.controls.target);
    this.onActivate(node.item);
  }

  returnToShelf() {
    this.inspectionId = null;
    this.controls.enabled = false;
    this.camera.position.set(0, 0, this.shelfCameraDistance());
    this.camera.lookAt(0, 0, 0);
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
    this.camera.updateProjectionMatrix();
  }

  private shelfCameraDistance() {
    const sceneHeight = this.rowCount * 2.45 + 1.5;
    return Math.max(10, (sceneHeight / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)))) * 1.04);
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
      const targetX = node.home.x;
      const targetZ = inspecting ? 1.55 : index === this.activeIndex ? 0.16 : 0;
      const targetY = node.home.y + (inspecting ? 0.12 : 0);
      node.root.position.x = THREE.MathUtils.lerp(node.root.position.x, targetX, smoothing);
      node.root.position.y = THREE.MathUtils.lerp(node.root.position.y, targetY, smoothing);
      node.root.position.z = THREE.MathUtils.lerp(node.root.position.z, targetZ, smoothing);
      node.root.rotation.y = THREE.MathUtils.lerp(node.root.rotation.y, inspecting ? -1.05 : 0, smoothing);
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
