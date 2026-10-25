/** 判定の描画機会を確保してから候補を計算する（DES-UI-42）。 */
export function scheduleSuggestions(calculate: () => void): () => void {
  let active = true;
  let frame = requestAnimationFrame(() => {
    if (!active) return;
    frame = requestAnimationFrame(() => {
      if (!active) return;
      timer = window.setTimeout(() => {
        if (active) calculate();
      }, 0);
    });
  });
  let timer: number | undefined;
  return () => {
    active = false;
    cancelAnimationFrame(frame);
    if (timer !== undefined) window.clearTimeout(timer);
  };
}
