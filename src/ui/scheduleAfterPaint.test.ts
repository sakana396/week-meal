import { afterEach, expect, it, vi } from "vitest";
import { scheduleAfterPaint } from "./scheduleAfterPaint";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it.each([false, true])(
  "TC-NFR-03-05 描画後の保存は中止 %s に応じて一度だけ実行する",
  (cancelled) => {
    vi.useFakeTimers();
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    const save = vi.fn();
    const cancel = scheduleAfterPaint(save);
    expect(save).not.toHaveBeenCalled();
    frames.shift()?.(0);
    expect(save).not.toHaveBeenCalled();
    if (cancelled) cancel();
    frames.shift()?.(16);
    vi.runAllTimers();
    expect(save).toHaveBeenCalledTimes(cancelled ? 0 : 1);
  },
);
