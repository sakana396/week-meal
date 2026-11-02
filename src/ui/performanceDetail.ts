/** 日付変更の内訳をブラウザの Performance 記録に残す（DES-PER-05）。 */
export function measurePerformanceDetail<T>(name: string, work: () => T): T {
  if (
    typeof window === "undefined" ||
    !(window as Window & { weekmealPerformanceDetail?: boolean })
      .weekmealPerformanceDetail
  )
    return work();
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
