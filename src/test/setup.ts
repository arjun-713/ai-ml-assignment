import "@testing-library/jest-dom/vitest";

// jsdom does not implement scrolling; components call these for keyboard and
// error-focus behaviour. Stub them so interaction tests stay deterministic.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    writable: true,
    value: () => undefined,
  });
}

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    writable: true,
    value: () => undefined,
  });
}
