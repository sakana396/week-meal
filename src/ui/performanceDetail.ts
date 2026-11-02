/** 詳細計測の有効期間中、全操作の内訳を記録する（DES-PER-05）。 */
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

/** 詳細計測の有効期間中、描画開始から commit までを記録する（DES-PER-05）。 */
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
