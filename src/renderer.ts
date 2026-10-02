export function createRenderer(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;

  const resize = (width: number, height: number) => {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  };

  return { resize };
}
