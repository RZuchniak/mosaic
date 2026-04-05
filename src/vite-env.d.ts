/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** e.g. https://mosaic-api.example.com — leave unset to use same-origin `/api` and `/ws` (Vite proxy in dev). */
  readonly VITE_API_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
