import { attachInput } from "./input";
import { createRenderer } from "./renderer";
import type { Camera } from "./shared";

import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#app");
if (!canvas) throw new Error("Element '#app' not found.");

const camera: Camera = { x: 0, y: 0, zoom: 1 };
const renderer = createRenderer(canvas, camera);
attachInput(canvas, camera, renderer.requestDraw);

new ResizeObserver(([entry]) => {
  const { width, height } = entry!.contentRect;
  renderer.resize(width, height);
}).observe(canvas);
