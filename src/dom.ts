const RESET_TIMEOUT_MS = 5000;

export function attachDOM(onReset: () => void) {
  const resetButton = document.querySelector<HTMLButtonElement>("#reset-button");
  if (resetButton) {
    let timer: number | undefined;
    let armed = false;

    resetButton.textContent = "Reset";

    const disarm = (): void => {
      armed = false;
      clearTimeout(timer);
      resetButton.textContent = "Reset";
    };

    resetButton.addEventListener("click", () => {
      if (!armed) {
        armed = true;
        resetButton.textContent = "Are you sure?";
        timer = window.setTimeout(disarm, RESET_TIMEOUT_MS);
        return;
      }
      disarm();
      onReset();
    });

    resetButton.addEventListener("blur", disarm);
  }
}
