/// <reference types="vite/client" />

/** Injected in vite.config (package.json version) */
declare const __APP_VERSION__: string
/** ISO timestamp when `vite build` / dev server started */
declare const __APP_BUILD_TIME__: string

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
