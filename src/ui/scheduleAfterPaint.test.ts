import { afterEach, expect, it, vi } from "vitest";
import { scheduleAfterPaint } from "./scheduleAfterPaint";

function visibility(initiallyHidden = false) {
  let hidden = initiallyHidden;
  const listeners = new Set<EventListenerOrEventListenerObject>();
  return {
    get hidden() {
      return hidden;
    },
    get visibilityState() {
      return hidden ? ("hidden" as const) : ("visible" as const);
    },
    addEventListener: vi.fn(
      (_name: string, listener: EventListenerOrEventListenerObject) => {
        listeners.add(listener);
      },
    ),
    removeEventListener: vi.fn(
      (_name: string, listener: EventListenerOrEventListenerObject) => {
        listeners.delete(listener);
      },
    ),
    hide() {
      hidden = true;
      for (const listener of listeners) {
        if (typeof listener === "function")
          listener(new Event("visibilitychange"));
        else listener.handleEvent(new Event("visibilitychange"));
      }
    },
    listenerCount() {
      return listeners.size;
    },
  };
}

function frames() {
  const callbacks: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callbacks.push(callback);
    return callbacks.length;
  });
  const cancelFrame = vi.fn();
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);
  vi.stubGlobal("window", {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  });
  return { callbacks, cancelFrame };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it.each([false, true])(
  "TC-NFR-03-05 1 回の描画後の保存は中止 %s に応じて一度だけ実行する",
  (cancelled) => {
    vi.useFakeTimers();
    const { callbacks } = frames();
    const doc = visibility();
    const save = vi.fn();
    const cancel = scheduleAfterPaint(save, doc);
    expect(save).not.toHaveBeenCalled();
    callbacks.shift()?.(0);
    expect(save).not.toHaveBeenCalled();
    if (cancelled) cancel();
    vi.runAllTimers();
    expect(save).toHaveBeenCalledTimes(cancelled ? 0 : 1);
    expect(doc.listenerCount()).toBe(0);
  },
);

it("TC-NFR-03-05 非表示になったら予約を取り消して直ちに一度だけ保存する", () => {
  vi.useFakeTimers();
  const { callbacks, cancelFrame } = frames();
  const doc = visibility();
  const save = vi.fn();
  const cancel = scheduleAfterPaint(save, doc);
  doc.hide();
  callbacks.shift()?.(0);
  vi.runAllTimers();
  cancel();
  expect(save).toHaveBeenCalledTimes(1);
  expect(cancelFrame).toHaveBeenCalledWith(1);
  expect(doc.listenerCount()).toBe(0);
});

it("TC-NFR-03-05 予約時に非表示なら描画を待たずに保存する", () => {
  const requestFrame = vi.fn();
  vi.stubGlobal("requestAnimationFrame", requestFrame);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const doc = visibility(true);
  const save = vi.fn();
  scheduleAfterPaint(save, doc);
  expect(save).toHaveBeenCalledTimes(1);
  expect(requestFrame).not.toHaveBeenCalled();
  expect(doc.listenerCount()).toBe(0);
});
