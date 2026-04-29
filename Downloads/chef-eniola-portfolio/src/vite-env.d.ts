/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_MASTER_ADMIN_EMAIL: string
  readonly VITE_MASTER_ADMIN_PASSWORD: string
  readonly VITE_MAX_VIDEO_SIZE_MB: string
  readonly VITE_MAX_VIDEOS_COUNT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
