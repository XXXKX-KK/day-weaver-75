// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Mobile (Capacitor) build. Enabled only via `--mode mobile` (see the `build:mobile`
// npm script), so the default `vite build` used by Lovable stays the untouched SSR
// build. In mobile mode we produce a fully static, client-only site with no runtime
// server, because Capacitor serves files straight from the device filesystem.
// Detected from argv (cross-platform, no extra env-var tooling needed on Windows).
const modeFlagIndex = process.argv.indexOf("--mode");
const isMobileBuild =
  modeFlagIndex !== -1 && process.argv[modeFlagIndex + 1] === "mobile";

const mobileTanstackStart = {
  // SPA mode: build a fully client-rendered app with a prerendered static shell
  // (served for all routes via maskPath "/"). outputPath "/index" makes the shell
  // land at dist/client/index.html — the entry file a Capacitor WebView loads.
  spa: { enabled: true, prerender: { outputPath: "/index" } },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ...(isMobileBuild ? mobileTanstackStart : {}),
  },
  // A static SPA build has no runtime server, so skip Nitro's server/deploy packaging
  // entirely; TanStack Start then emits a self-contained static site under dist/client.
  // Left untouched (Nitro on, Cloudflare default) for the normal Lovable build.
  ...(isMobileBuild ? { nitro: false as const } : {}),
  // Bind the internal prerender preview server to IPv4 loopback so the static build
  // works on hosts without IPv6 (`::`); only affects `vite preview`, not dev/Lovable.
  ...(isMobileBuild ? { vite: { preview: { host: "127.0.0.1" } } } : {}),
});
