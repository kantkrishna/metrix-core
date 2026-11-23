// scripts/shims/node-abort-controller/index.d.ts
//
// Purpose: Provides TypeScript ambient type definitions for the local node-abort-controller shim.
//
// Context: Preserves strict TypeScript compilation across packages importing AbortController types from the npm override.
//
// Implementation Specs: TypeScript declaration file exporting globalThis.AbortController and globalThis.AbortSignal types.

export const AbortController: typeof globalThis.AbortController;
export const AbortSignal: typeof globalThis.AbortSignal;
export default AbortController;
