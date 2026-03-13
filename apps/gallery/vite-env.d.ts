/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NHOST_SUBDOMAIN: string;
  readonly VITE_NHOST_REGION: string;
  readonly VITE_DO_SPACES_ENDPOINT: string;
  readonly VITE_DO_SPACES_BUCKET: string;
  readonly VITE_DO_SPACES_KEY: string;
  readonly VITE_DO_SPACES_SECRET: string;
  readonly VITE_DO_SPACES_CDN_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
