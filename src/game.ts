export function createGame(
  getTile: (x: number, y: number) => number,
  setTile: (x: number, y: number, state: number) => void,
) {
  const click = (x: number, y: number, button: number) => {
    const state = getTile(x, y);
    if (button === 0 && state === 0) {
      setTile(x, y, 1);
    } else if (button === 2 && state !== 1) {
      setTile(x, y, state === 2 ? 0 : 2);
    }
  };

  return { click };
}
