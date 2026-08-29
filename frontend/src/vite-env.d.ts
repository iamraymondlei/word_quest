/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOW_DEV_MODE?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_SHOW_VERSION_BADGE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
