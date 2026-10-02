import { createRenderer } from "./renderer";

import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#app")!;

const renderer = createRenderer(canvas);

new ResizeObserver(([entry]) => {
  const { width, height } = entry!.contentRect;
  renderer.resize(width, height);
}).observe(canvas);
