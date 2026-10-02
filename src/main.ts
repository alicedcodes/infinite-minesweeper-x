import { createGame } from "./game";
import { attachInput } from "./input";
import { createRenderer, loadFonts } from "./renderer";
import type { Camera } from "./shared";

import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#app");
if (!canvas) throw new Error("Element '#app' not found.");

const camera: Camera = { x: 0, y: 0, zoom: 1 };

loadFonts()
  .then(() => {
    const renderer = createRenderer(canvas, camera);
    const game = createGame(renderer.getTile, renderer.setTile, renderer.requestDraw);
    attachInput(canvas, camera, renderer.requestDraw, game.click, game.hasStarted);

    new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      renderer.resize(width, height);
    }).observe(canvas);
  })
  .catch(console.error);
