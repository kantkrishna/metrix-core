// frontend/src/features/auth/pkce-utils.ts
/*
Purpose: Generates and manages ephemeral OIDC PKCE state and code_verifier
values in browser sessionStorage for delegated OAuth 2.0 flows.

Context: Satisfies NFR-SEC-01 (OIDC with PKCE) without persisting credentials
across browser restarts.

Implementation Specs: Uses Web Crypto getRandomValues with safe fallback in
non-secure test environments.
*/

const STATE_KEY = "metrix.oidc.state";
const VERIFIER_KEY = "metrix.oidc.verifier";

function generateRandomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function createOidcTransaction(): {
  state: string;
  codeVerifier: string;
} {
  const state = generateRandomToken(16);
  const codeVerifier = generateRandomToken(32);
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(STATE_KEY, state);
    window.sessionStorage.setItem(VERIFIER_KEY, codeVerifier);
  }
  return { state, codeVerifier };
}

export function consumeOidcTransaction(expectedState: string): {
  valid: boolean;
  codeVerifier: string | null;
} {
  if (typeof window === "undefined") {
    return { valid: false, codeVerifier: null };
  }
  const storedState = window.sessionStorage.getItem(STATE_KEY);
  const codeVerifier = window.sessionStorage.getItem(VERIFIER_KEY);
  window.sessionStorage.removeItem(STATE_KEY);
  window.sessionStorage.removeItem(VERIFIER_KEY);

  if (!storedState || !codeVerifier || storedState !== expectedState) {
    return { valid: false, codeVerifier: null };
  }
  return { valid: true, codeVerifier };
}
