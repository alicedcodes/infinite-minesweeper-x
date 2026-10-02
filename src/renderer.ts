import FS from "./shader/tiles.frag?raw";
import VS from "./shader/tiles.vert?raw";
import { ANIMATION_DURATION, TILE_SIZE, type Camera } from "./shared";

type Chunk = { states: Uint8Array; texture: WebGLTexture; revealTexture: WebGLTexture };

const CHUNK = 64;

const CELL = 128;
const CELLS = 11;
const FONT_FAMILY = 'Arial, Helvetica, sans-serif, "Noto Emoji Variable"';

export const loadFonts = (): Promise<unknown> =>
  document.fonts.load(`bold 16px ${FONT_FAMILY}`, "12345678💥🚩");

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

export function createRenderer(canvas: HTMLCanvasElement, camera: Camera) {
  const gl = canvas.getContext("webgl2", { alpha: false })!;
  if (!gl) throw new Error("WebGL2 is disabled or not supported.");

  const program = createProgram(gl, VS, FS);
  gl.useProgram(program);

  gl.clearColor(0x16 / 255, 0x16 / 255, 0x16 / 255, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

  const uRes = gl.getUniformLocation(program, "u_res");
  const uCam = gl.getUniformLocation(program, "u_cam");
  const uTilePx = gl.getUniformLocation(program, "u_tilePx");
  const uTiles = gl.getUniformLocation(program, "u_tiles");
  const uAtlas = gl.getUniformLocation(program, "u_atlas");
  const uTime = gl.getUniformLocation(program, "u_time");
  const uAnimMs = gl.getUniformLocation(program, "u_animMs");
  const uReveal = gl.getUniformLocation(program, "u_reveal");

  gl.uniform1i(uTiles, 0);
  gl.uniform1i(uAtlas, 1);
  gl.uniform1f(uAnimMs, ANIMATION_DURATION);
  gl.uniform1i(uReveal, 2);

  let dpr = window.devicePixelRatio || 1;

  const buildAtlas = (): void => {
    const c = document.createElement("canvas");
    c.width = CELL * CELLS;
    c.height = CELL;
    const g = c.getContext("2d")!;

    g.font = `bold ${Math.round(CELL * 0.64)}px ${FONT_FAMILY}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#fff";

    const glyphs = ["", "1", "2", "3", "4", "5", "6", "7", "8", "💥", "🚩"];
    for (let i = 0; i < glyphs.length; i++) {
      const s = glyphs[i]!;
      if (s) g.fillText(s, i * CELL + CELL / 2, CELL / 2 + CELL * 0.03);
    }

    gl.activeTexture(gl.TEXTURE1);
    const atlasTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);

    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE0);
  };

  buildAtlas();

  const createTileTexture = (data: Uint8Array): WebGLTexture => {
    const texture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R8UI,
      CHUNK,
      CHUNK,
      0,
      gl.RED_INTEGER,
      gl.UNSIGNED_BYTE,
      data,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return texture;
  };

  const createRevealTexture = (): WebGLTexture => {
    const texture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      CHUNK,
      CHUNK,
      0,
      gl.RED,
      gl.FLOAT,
      new Float32Array(CHUNK * CHUNK),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.activeTexture(gl.TEXTURE0);
    return texture;
  };

  const chunks = new Map<string, Chunk>();
  const dirty = new Set<string>();
  const emptyTexture = createTileTexture(new Uint8Array(CHUNK * CHUNK));
  const emptyRevealTexture = createRevealTexture();
  let animUntil = 0;

  const keyOf = (cx: number, cy: number): string => `${cx},${cy}`;

  const getTile = (x: number, y: number): number => {
    const cx = Math.floor(x / CHUNK);
    const cy = Math.floor(y / CHUNK);
    const chunk = chunks.get(keyOf(cx, cy));
    if (!chunk) return 0;

    const lx = x - cx * CHUNK;
    const ly = y - cy * CHUNK;
    return chunk.states[ly * CHUNK + lx] ?? 0;
  };

  const setTile = (x: number, y: number, state: number, revealAt?: number): void => {
    const cx = Math.floor(x / CHUNK);
    const cy = Math.floor(y / CHUNK);
    const key = keyOf(cx, cy);

    let chunk = chunks.get(key);
    if (!chunk) {
      if (state === 0) return;
      const states = new Uint8Array(CHUNK * CHUNK);
      chunk = { states, texture: createTileTexture(states), revealTexture: createRevealTexture() };
      chunks.set(key, chunk);
    }

    const lx = x - cx * CHUNK;
    const ly = y - cy * CHUNK;
    chunk.states[ly * CHUNK + lx] = state;
    dirty.add(key);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, chunk.texture);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      lx,
      ly,
      1,
      1,
      gl.RED_INTEGER,
      gl.UNSIGNED_BYTE,
      new Uint8Array([state]),
    );

    if (revealAt !== undefined) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, chunk.revealTexture);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        lx,
        ly,
        1,
        1,
        gl.RED,
        gl.FLOAT,
        new Float32Array([revealAt]),
      );
      gl.activeTexture(gl.TEXTURE0);
      animUntil = Math.max(animUntil, revealAt + ANIMATION_DURATION);
    }

    requestDraw();
  };

  const loadChunk = (cx: number, cy: number, states: Uint8Array): void => {
    if (states.length !== CHUNK * CHUNK) return;
    chunks.set(keyOf(cx, cy), {
      states,
      texture: createTileTexture(states),
      revealTexture: createRevealTexture(),
    });
  };

  const takeDirty = (): { cx: number; cy: number; states: Uint8Array }[] => {
    const out: { cx: number; cy: number; states: Uint8Array }[] = [];
    for (const key of dirty) {
      const [cx, cy] = key.split(",").map(Number) as [number, number];
      out.push({ cx, cy, states: chunks.get(key)!.states });
    }
    dirty.clear();
    return out;
  };

  const reset = (): void => {
    for (const chunk of chunks.values()) {
      gl.deleteTexture(chunk.texture);
      gl.deleteTexture(chunk.revealTexture);
    }
    chunks.clear();
    dirty.clear();
    animUntil = 0;
    requestDraw();
  };

  let drawingFrame = false;

  const draw = () => {
    drawingFrame = false;

    const W = canvas.width;
    const H = canvas.height;
    const tilePx = TILE_SIZE * camera.zoom * dpr;

    gl.viewport(0, 0, W, H);

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform2f(uRes, W, H);
    gl.uniform1f(uTilePx, tilePx);

    const now = performance.now();
    gl.uniform1f(uTime, now);

    const halfW = W / tilePx / 2;
    const halfH = H / tilePx / 2;
    const cx0 = Math.floor((camera.x - halfW) / CHUNK);
    const cx1 = Math.floor((camera.x + halfW) / CHUNK);
    const cy0 = Math.floor((camera.y - halfH) / CHUNK);
    const cy1 = Math.floor((camera.y + halfH) / CHUNK);

    gl.enable(gl.SCISSOR_TEST);

    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const chunk = chunks.get(keyOf(cx, cy));

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, chunk ? chunk.revealTexture : emptyRevealTexture);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, chunk ? chunk.texture : emptyTexture);

        gl.uniform2f(uCam, camera.x - cx * CHUNK, camera.y - cy * CHUNK);

        const left = W / 2 + (cx * CHUNK - camera.x) * tilePx;
        const top = H / 2 + (cy * CHUNK - camera.y) * tilePx;
        const size = CHUNK * tilePx;

        const x0 = Math.floor(left);
        const x1 = Math.ceil(left + size);
        const y0 = Math.floor(top);
        const y1 = Math.ceil(top + size);

        gl.scissor(x0, H - y1, x1 - x0, y1 - y0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    }

    gl.disable(gl.SCISSOR_TEST);
    if (now < animUntil) requestDraw();
  };

  const requestDraw = () => {
    if (drawingFrame) return;
    drawingFrame = true;
    requestAnimationFrame(() => draw());
  };

  const resize = (width: number, height: number) => {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    requestDraw();
  };

  return { resize, requestDraw, getTile, setTile, loadChunk, takeDirty, reset };
}
