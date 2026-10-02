import { ANIMATION_DELAY } from "./shared";
import type { Meta } from "./storage";

export const HIDDEN = 0;
export const REVEALED = 1;
export const FLAGGED = 2;

const STATE_MASK = 0b11;
const MINE_BIT = 0b100;
const NEARBY_SHIFT = 3;
const CAN_BIT = 0b10000000;

const MINE_DENSITY = 0.2;
const SAFE_ZONE_RADIUS = 2;
const TILES_PER_TICK = 100;

const NEIGHBOURS = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, -1],
  [-1, 1],
  [1, 1],
  [1, -1],
] as const;

function hash2D(x: number, y: number, seed: number): number {
  let h = seed ^ Math.imul(y, 73856093) ^ Math.imul(x, 19349663);
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return (h ^ (h >>> 16)) >>> 0;
}

function randomSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}

export function createGame(
  getTile: (x: number, y: number) => number,
  setTile: (x: number, y: number, state: number, revealAt?: number) => void,
  onChange: () => void,
  saved?: Meta,
) {
  const mineThreshold = MINE_DENSITY * 2 ** 32;

  const gs = {
    seed: saved?.seed ?? randomSeed(),
    started: saved?.started ?? false,
    startX: saved?.startX ?? 0,
    startY: saved?.startY ?? 0,
  };

  const hasMine = (x: number, y: number): boolean => {
    if (
      gs.started &&
      Math.abs(x - gs.startX) <= SAFE_ZONE_RADIUS &&
      Math.abs(y - gs.startY) <= SAFE_ZONE_RADIUS
    ) {
      return false;
    }
    return hash2D(x, y, gs.seed) < mineThreshold;
  };

  const stateOf = (x: number, y: number): number => getTile(x, y) & STATE_MASK;

  const countNearby = (x: number, y: number): number => {
    let n = 0;
    for (const [ox, oy] of NEIGHBOURS) {
      if (hasMine(x + ox, y + oy)) n++;
    }
    return n;
  };

  const revealTile = (x: number, y: number, at: number): void => {
    const isMine = hasMine(x, y);
    const nearby = isMine ? 0 : countNearby(x, y);
    setTile(x, y, REVEALED | (isMine ? MINE_BIT : nearby << NEARBY_SHIFT), at);

    for (const [ox, oy] of NEIGHBOURS) {
      const nx = x + ox;
      const ny = y + oy;
      const v = getTile(nx, ny);
      if ((v & STATE_MASK) === HIDDEN && !(v & CAN_BIT)) setTile(nx, ny, v | CAN_BIT);
    }
  };

  const isFinished = (x: number, y: number): boolean => {
    let nearbyMines = 0;
    let flaggedCount = 0;

    for (const [ox, oy] of NEIGHBOURS) {
      const nx = x + ox;
      const ny = y + oy;
      const state = stateOf(nx, ny);

      if (hasMine(nx, ny)) nearbyMines++;
      if (state === FLAGGED) flaggedCount++;
    }

    return nearbyMines === flaggedCount;
  };

  const queue: number[] = [];
  let head = 0;
  let scheduled = false;

  const processQueue = (): void => {
    scheduled = false;

    for (let i = 0; i < TILES_PER_TICK && head < queue.length; i++) {
      const sx = queue[head]!;
      const sy = queue[head + 1]!;
      const at = queue[head + 2]! + ANIMATION_DELAY;
      head += 3;

      for (const [ox, oy] of NEIGHBOURS) {
        const x = sx + ox;
        const y = sy + oy;

        if (stateOf(x, y) === HIDDEN) {
          revealTile(x, y, at);
          if (!hasMine(x, y) && countNearby(x, y) === 0) queue.push(x, y, at);
        }
      }
    }

    if (head > 1500 && head > queue.length / 2) {
      queue.splice(0, head);
      head = 0;
    }

    onChange();

    if (head < queue.length) schedule();
  };

  const schedule = (): void => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(processQueue);
  };

  const reset = (): void => {
    queue.length = 0;
    head = 0;
    gs.seed = randomSeed();
    gs.started = false;
    gs.startX = 0;
    gs.startY = 0;
  };

  const click = (x: number, y: number, button: number): void => {
    const byte = getTile(x, y);
    const state = byte & STATE_MASK;

    if (gs.started && state === HIDDEN && !(byte & CAN_BIT)) return;

    if (button === 0) {
      if (state === REVEALED) {
        if (isFinished(x, y)) {
          queue.push(x, y, performance.now());
          schedule();
        }
        return;
      }
      if (state !== HIDDEN) return;
      if (!gs.started) {
        gs.started = true;
        gs.startX = x;
        gs.startY = y;
      }
      const now = performance.now();
      revealTile(x, y, now);
      if (!hasMine(x, y) && countNearby(x, y) === 0) {
        queue.push(x, y, now);
        schedule();
      }
    } else if (button === 2) {
      if (state === HIDDEN) setTile(x, y, byte | FLAGGED);
      else if (state === FLAGGED) setTile(x, y, byte & ~STATE_MASK);
      else return;
    } else return;

    onChange();
  };

  return { click, state: gs, reset };
}
