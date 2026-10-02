const MINE_DENSITY = 0.2;
const SAFE_ZONE_RADIUS = 2;

function hash2D(x: number, y: number, seed: number): number {
  let h = seed ^ Math.imul(y, 73856093) ^ Math.imul(x, 19349663);
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return (h ^ (h >>> 16)) >>> 0;
}

export function createGame(
  getTile: (x: number, y: number) => number,
  setTile: (x: number, y: number, state: number) => void,
  onChange: () => void,
) {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
  const mineThreshold = MINE_DENSITY * 2 ** 32;

  let started = false;
  let startX = 0;
  let startY = 0;

  const hasMine = (x: number, y: number): boolean => {
    if (
      started &&
      Math.abs(x - startX) <= SAFE_ZONE_RADIUS &&
      Math.abs(y - startY) <= SAFE_ZONE_RADIUS
    ) {
      return false;
    }
    return hash2D(x, y, seed) < mineThreshold;
  };

  const click = (x: number, y: number, button: number): void => {
    const state = getTile(x, y);

    if (button === 0) {
      if (state !== 0) return;
      if (!started) {
        started = true;
        startX = x;
        startY = y;
      }
      setTile(x, y, hasMine(x, y) ? 3 : 1);
    } else if (button === 2) {
      if (state === 0) setTile(x, y, 2);
      else if (state === 2) setTile(x, y, 0);
      else return;
    } else return;

    onChange();
  };

  return { click, hasStarted: () => started };
}
