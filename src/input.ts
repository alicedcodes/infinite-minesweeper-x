import { TILE_SIZE, type Camera } from "./shared";

export function attachInput(canvas: HTMLCanvasElement, camera: Camera, onChange: () => void) {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const { clientX, clientY } = e;
    const tilePx = TILE_SIZE * camera.zoom;
    camera.x -= (clientX - lastX) / tilePx;
    camera.y -= (clientY - lastY) / tilePx;
    lastX = clientX;
    lastY = clientY;
    onChange();
  });

  const stop = () => {
    dragging = false;
  };
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
}
