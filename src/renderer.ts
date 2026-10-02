export function createRenderer(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;

  const gl = canvas.getContext("webgl2", { alpha: false })!;

  const resize = (width: number, height: number) => {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  return { resize };
}
