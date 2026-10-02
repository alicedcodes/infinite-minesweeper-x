import { createRenderer } from "./renderer";
import type { Camera } from "./shared";

import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#app")!;

const camera: Camera = { x: 0, y: 0, zoom: 1 };
const renderer = createRenderer(canvas, camera);

new ResizeObserver(([entry]) => {
  const { width, height } = entry!.contentRect;
  renderer.resize(width, height);
}).observe(canvas);
