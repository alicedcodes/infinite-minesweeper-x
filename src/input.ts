import { TILE_SIZE, type Camera } from "./shared";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;
const WHEEL_ZOOM_SPEED = 0.001;
const PAN_THRESHOLD = 10;
const DETAIL_MIN_PX = 25;
const LONG_PRESS_DURATION = 350;

const nativeLongPress = /Android/i.test(navigator.userAgent);

type Point = { x: number; y: number };

export function attachInput(
  canvas: HTMLCanvasElement,
  camera: Camera,
  onChange: () => void,
  onTileClick: (x: number, y: number, reveal: boolean, touch: boolean) => void,
  gameState: { started: boolean },
): void {
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";
  canvas.style.setProperty("-webkit-user-select", "none");
  canvas.style.setProperty("-webkit-touch-callout", "none");
  canvas.style.setProperty("-webkit-tap-highlight-color", "transparent");

  const zoomAt = (targetZoom: number, clientX: number, clientY: number): void => {
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
    if (camera.zoom === newZoom) return;

    if (gameState.started) {
      const rect = canvas.getBoundingClientRect();
      const offsetX = clientX - rect.left - rect.width / 2;
      const offsetY = clientY - rect.top - rect.height / 2;

      const tilePx = TILE_SIZE * camera.zoom;
      const newTilePx = TILE_SIZE * newZoom;

      camera.x = camera.x + offsetX / tilePx - offsetX / newTilePx;
      camera.y = camera.y + offsetY / tilePx - offsetY / newTilePx;
    }

    camera.zoom = newZoom;
    onChange();
  };

  const lowDetail = (): boolean =>
    TILE_SIZE * camera.zoom * (window.devicePixelRatio || 1) < DETAIL_MIN_PX;

  const reportTile = (clientX: number, clientY: number, reveal: boolean, touch: boolean): void => {
    if (lowDetail()) return;
    const rect = canvas.getBoundingClientRect();
    const tilePx = TILE_SIZE * camera.zoom;
    onTileClick(
      Math.floor(camera.x + (clientX - rect.left - rect.width / 2) / tilePx),
      Math.floor(camera.y + (clientY - rect.top - rect.height / 2) / tilePx),
      reveal,
      touch,
    );
  };

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoomAt(camera.zoom * Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED), e.clientX, e.clientY);
    },
    { passive: false },
  );

  const pointers = new Map<number, Point>();
  let pointerType = "mouse";

  let pressed = false;
  let panning = false;
  let longPressed = false;
  let startX = 0;
  let startY = 0;
  let startCamX = 0;
  let startCamY = 0;
  let longPressTimer: number | undefined;

  let pinching = false;
  let pinchStartDist = 0;
  let pinchStartZoom = 1;
  let lastMidX = 0;
  let lastMidY = 0;

  const pinchState = (): { dist: number; midX: number; midY: number } => {
    const [a, b] = [...pointers.values()] as [Point, Point];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2 };
  };

  const longPress = (clientX: number, clientY: number): void => {
    if (!pressed || panning || longPressed) return;
    longPressed = true;
    clearTimeout(longPressTimer);
    reportTile(clientX, clientY, true, true);
  };

  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 2) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    pointerType = e.pointerType;

    if (pointers.size === 1) {
      pressed = true;
      panning = false;
      longPressed = false;
      startX = e.clientX;
      startY = e.clientY;
      startCamX = camera.x;
      startCamY = camera.y;
      if (e.pointerType === "touch" && !nativeLongPress) {
        longPressTimer = window.setTimeout(
          () => longPress(e.clientX, e.clientY),
          LONG_PRESS_DURATION,
        );
      }
    } else if (pointers.size === 2) {
      clearTimeout(longPressTimer);
      pressed = false;
      panning = false;
      pinching = true;
      const s = pinchState();
      pinchStartDist = s.dist;
      pinchStartZoom = camera.zoom;
      lastMidX = s.midX;
      lastMidY = s.midY;
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;

    if (pinching) {
      if (pointers.size < 2) return;
      const { dist, midX, midY } = pinchState();
      if (gameState.started) {
        const tilePx = TILE_SIZE * camera.zoom;
        camera.x -= (midX - lastMidX) / tilePx;
        camera.y -= (midY - lastMidY) / tilePx;
      }
      lastMidX = midX;
      lastMidY = midY;
      if (pinchStartDist > 0) zoomAt(pinchStartZoom * (dist / pinchStartDist), midX, midY);
      onChange();
      return;
    }

    if (!pressed) return;
    const { clientX, clientY } = e;
    if (!panning && Math.hypot(clientX - startX, clientY - startY) >= PAN_THRESHOLD) {
      panning = true;
      clearTimeout(longPressTimer);
    }
    if (panning && gameState.started) {
      const tilePx = TILE_SIZE * camera.zoom;
      camera.x = startCamX - (clientX - startX) / tilePx;
      camera.y = startCamY - (clientY - startY) / tilePx;
      onChange();
    }
  });

  const release = (e: PointerEvent): void => {
    if (!pointers.delete(e.pointerId)) return;
    clearTimeout(longPressTimer);

    if (pinching) {
      if (pointers.size === 0) pinching = false;
      return;
    }
    if (!pressed) return;
    pressed = false;

    if (panning) {
      panning = false;
      return;
    }
    if (longPressed || e.type === "pointercancel") return;

    reportTile(
      e.clientX,
      e.clientY,
      e.pointerType !== "touch" && e.button === 0,
      e.pointerType === "touch",
    );
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (pointerType === "touch") longPress(e.clientX, e.clientY);
  });
}
