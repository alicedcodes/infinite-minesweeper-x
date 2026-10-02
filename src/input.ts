import { TILE_SIZE, type Camera } from "./shared";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;
const WHEEL_ZOOM_SPEED = 0.001;
const PAN_THRESHOLD = 10;

export function attachInput(canvas: HTMLCanvasElement, camera: Camera, onChange: () => void) {
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  const zoomAt = (targetZoom: number, clientX: number, clientY: number) => {
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
    if (camera.zoom === newZoom) return;

    const rect = canvas.getBoundingClientRect();
    const offsetX = clientX - rect.left - rect.width / 2;
    const offsetY = clientY - rect.top - rect.height / 2;

    const tilePx = TILE_SIZE * camera.zoom;
    const newTilePx = TILE_SIZE * newZoom;

    camera.x = camera.x + offsetX / tilePx - offsetX / newTilePx;
    camera.y = camera.y + offsetY / tilePx - offsetY / newTilePx;
    camera.zoom = newZoom;
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

  let pressed = false;
  let panning = false;
  let startX = 0;
  let startY = 0;
  let startCamX = 0;
  let startCamY = 0;

  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.button !== 2) return;
    pressed = true;
    panning = false;
    startX = e.clientX;
    startY = e.clientY;
    startCamX = camera.x;
    startCamY = camera.y;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!pressed) return;
    const { clientX, clientY } = e;
    if (!panning && Math.hypot(clientX - startX, clientY - startY) >= PAN_THRESHOLD) {
      panning = true;
    }
    if (panning) {
      const tilePx = TILE_SIZE * camera.zoom;
      camera.x = startCamX - (clientX - startX) / tilePx;
      camera.y = startCamY - (clientY - startY) / tilePx;
      onChange();
    }
  });

  const stop = (e: PointerEvent) => {
    if (!pressed) return;
    pressed = false;
    if (panning) {
      panning = false;
      return;
    }
    if (e.type === "pointercancel") return;

    const rect = canvas.getBoundingClientRect();
    const tilePx = TILE_SIZE * camera.zoom;
    const tx = Math.floor(camera.x + (e.clientX - rect.left - rect.width / 2) / tilePx);
    const ty = Math.floor(camera.y + (e.clientY - rect.top - rect.height / 2) / tilePx);
    void tx;
    void ty;
  };
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
}
