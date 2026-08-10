// Typed Vite env vars (merges with vite/client's ImportMetaEnv) so dot access
// works under noPropertyAccessFromIndexSignature and Vite can inline them.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}
