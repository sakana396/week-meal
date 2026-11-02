/** 日付変更の内訳をブラウザの Performance 記録に残す（DES-PER-05）。 */
export function measurePerformanceDetail<T>(name: string, work: () => T): T {
  if (!performanceDetailEnabled()) return work();
  const start = performance.now();
  try {
    return work();
  } finally {
    performance.measure(`weekmeal:date-change:${name}`, {
      start,
      end: performance.now(),
    });
  }
}

/** 日付変更時だけ、描画開始から commit までの区間を記録する（DES-PER-05）。 */
export function performanceDetailStart(): number | null {
  return performanceDetailEnabled() ? performance.now() : null;
}

/** 画面の描画と DOM commit の所要時間を記録する（DES-PER-05）。 */
export function performanceDetailEnd(name: string, start: number | null) {
  if (start === null) return;
  performance.measure(`weekmeal:date-change:${name}`, {
    start,
    end: performance.now(),
  });
}

function performanceDetailEnabled(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as Window & { weekmealPerformanceDetail?: boolean })
      .weekmealPerformanceDetail === true
  );
}
