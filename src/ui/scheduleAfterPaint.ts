/** 判定の描画機会を確保し、非表示になる前には保存する（DES-PER-05、DES-UI-13）。 */
export function scheduleAfterPaint(
  save: () => void,
  visibility: Pick<
    Document,
    "hidden" | "visibilityState" | "addEventListener" | "removeEventListener"
  > = document,
): () => void {
  let active = true;
  let timer: number | undefined;
  let frame: number | undefined;
  const flush = () => {
    if (!active) return;
    active = false;
    if (frame !== undefined) cancelAnimationFrame(frame);
    if (timer !== undefined) window.clearTimeout(timer);
    visibility.removeEventListener("visibilitychange", flushWhenHidden);
    save();
  };
  const flushWhenHidden = () => {
    if (visibility.visibilityState === "hidden") flush();
  };
  visibility.addEventListener("visibilitychange", flushWhenHidden);
  if (visibility.hidden) flush();
  else
    frame = requestAnimationFrame(() => {
      if (!active) return;
      timer = window.setTimeout(() => {
        flush();
      }, 0);
    });
  return () => {
    active = false;
    visibility.removeEventListener("visibilitychange", flushWhenHidden);
    if (frame !== undefined) cancelAnimationFrame(frame);
    if (timer !== undefined) window.clearTimeout(timer);
  };
}
