import { createGame } from "./game";
import { attachInput } from "./input";
import { createRenderer, loadFonts } from "./renderer";
import type { Camera } from "./shared";
import { loadMeta, loadChunks, clearChunks, createSaver } from "./storage";

import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#app");
if (!canvas) throw new Error("Element '#app' not found.");

(async () => {
  const meta = loadMeta();
  const camera: Camera = { x: meta?.camX ?? 0, y: meta?.camY ?? 0, zoom: meta?.zoom ?? 1 };

  const saved = meta
    ? await loadChunks().catch((err) => {
        console.error("Error loading tiles:", err);
        return [];
      })
    : [];
  if (!meta) clearChunks().catch(console.error);

  await loadFonts();

  const renderer = createRenderer(canvas, camera);
  for (const chunk of saved) renderer.loadChunk(chunk.cx, chunk.cy, chunk.states);

  const saver = createSaver(
    () => ({ ...game.state, camX: camera.x, camY: camera.y, zoom: camera.zoom }),
    renderer.takeDirty,
  );

  const onChange = (): void => {
    renderer.requestDraw();
    saver.schedule();
  };

  const game = createGame(renderer.getTile, renderer.setTile, onChange, meta ?? undefined);
  attachInput(canvas, camera, onChange, game.click, game.state);

  new ResizeObserver(([entry]) => {
    const { width, height } = entry!.contentRect;
    renderer.resize(width, height);
  }).observe(canvas);
})().catch(console.error);
