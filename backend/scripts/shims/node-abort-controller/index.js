// scripts/shims/node-abort-controller/index.js
//
// Purpose: Exposes Node.js built-in AbortController and AbortSignal globals as a drop-in CommonJS shim.
//
// Context: Replaces the deprecated node-abort-controller polyfill pulled by transitive dependencies without adding external packages.
//
// Implementation Specs: CommonJS module re-exporting globalThis.AbortController and globalThis.AbortSignal for Node.js >= 20.11.

const AbortControllerImpl = globalThis.AbortController;
const AbortSignalImpl = globalThis.AbortSignal;

module.exports = AbortControllerImpl;
module.exports.default = AbortControllerImpl;
module.exports.AbortController = AbortControllerImpl;
module.exports.AbortSignal = AbortSignalImpl;
