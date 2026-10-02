import FS from "./shader/tiles.frag?raw";
import VS from "./shader/tiles.vert?raw";

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(program);
  return program;
}

export function createRenderer(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;

  const gl = canvas.getContext("webgl2", { alpha: false })!;
  const program = createProgram(gl, VS, FS);
  gl.useProgram(program);

  const draw = () => {
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const resize = (width: number, height: number) => {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    draw();
  };

  return { resize };
}
