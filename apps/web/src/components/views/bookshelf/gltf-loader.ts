import { LoadingManager } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const DRACO_DECODER_PATH = "https://cdn.mint.gg/runtime/draco/gltf/three-0.184.0/";

/** Shared loader boundary for the project-scoped Mint GLBs once OAuth asset generation is available. */
export function createShelfGltfLoader(manager?: LoadingManager) {
  const draco = new DRACOLoader(manager);
  draco.setDecoderPath(DRACO_DECODER_PATH);
  const loader = new GLTFLoader(manager);
  loader.setDRACOLoader(draco);
  return { loader, dispose: () => draco.dispose() };
}
