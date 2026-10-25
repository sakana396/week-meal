import { afterEach, expect, it, vi } from "vitest";
import { scheduleSuggestions } from "./scheduleSuggestions";

afterEach(() => vi.unstubAllGlobals());

function frames() {
  const callbacks: FrameRequestCallback[] = [];
  const timers: (() => void)[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    callbacks.push(callback),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("window", {
    setTimeout: (callback: () => void) => timers.push(callback),
    clearTimeout: vi.fn(),
  });
  return { callbacks, timers };
}

it("TC-NFR-03-03 判定後の2回の描画機会とタイマーを経て候補を計算する", () => {
  const { callbacks, timers } = frames();
  const calculate = vi.fn();
  scheduleSuggestions(calculate);
  expect(calculate).not.toHaveBeenCalled();
  callbacks.shift()!(0);
  expect(timers).toHaveLength(0);
  callbacks.shift()!(16);
  expect(calculate).not.toHaveBeenCalled();
  timers.shift()!();
  expect(calculate).toHaveBeenCalledOnce();
});

it.each([0, 1, 2])(
  "TC-FR-BAL-06-08 revision変更で古い予約を中止する（描画%d回後）",
  (count) => {
    const { callbacks, timers } = frames();
    const calculate = vi.fn();
    const cancel = scheduleSuggestions(calculate);
    for (let i = 0; i < count; i++) callbacks.shift()!(i * 16);
    cancel();
    // キャンセル済みコールバックが遅れて届いても結果を出さない。
    while (callbacks.length) callbacks.shift()!(32);
    for (const callback of timers) callback();
    expect(calculate).not.toHaveBeenCalled();
  },
);
