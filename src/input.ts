import { TILE_SIZE, type Camera } from "./shared";

const WHEEL_ZOOM_SPEED = 0.001;

export function attachInput(canvas: HTMLCanvasElement, camera: Camera, onChange: () => void) {
  const zoomAt = (targetZoom: number, clientX: number, clientY: number) => {
    if (camera.zoom === targetZoom) return;

    const rect = canvas.getBoundingClientRect();
    const offsetX = clientX - rect.left - rect.width / 2;
    const offsetY = clientY - rect.top - rect.height / 2;

    const tilePx = TILE_SIZE * camera.zoom;
    const newTilePx = TILE_SIZE * targetZoom;

    camera.x = camera.x + offsetX / tilePx - offsetX / newTilePx;
    camera.y = camera.y + offsetY / tilePx - offsetY / newTilePx;
    camera.zoom = targetZoom;
    onChange();
  };

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoomAt(camera.zoom * Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED), e.clientX, e.clientY);
    },
    { passive: false },
  );

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
