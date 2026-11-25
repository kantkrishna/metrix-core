// frontend/tests/setup.ts
/*
Purpose: Initializes global test matchers and browser API polyfills (matchMedia)
for Vitest and React Testing Library.

Context: Ensures clean localStorage, sessionStorage, and DOM state between
every test case.

Implementation Specs: Imports @testing-library/jest-dom/vitest and cleans up
DOM and storage automatically after each test.
*/

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.documentElement.classList.remove("dark");
});

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
