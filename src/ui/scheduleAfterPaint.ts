/** 判定の描画機会を確保してから保存する（DES-PER-05）。 */
export function scheduleAfterPaint(save: () => void): () => void {
  let active = true;
  let timer: number | undefined;
  let frame = requestAnimationFrame(() => {
    if (!active) return;
    frame = requestAnimationFrame(() => {
      if (!active) return;
      timer = window.setTimeout(() => {
        if (active) save();
      }, 0);
    });
  });
  return () => {
    active = false;
    cancelAnimationFrame(frame);
    if (timer !== undefined) window.clearTimeout(timer);
  };
}
