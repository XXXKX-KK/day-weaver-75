import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { App as CapApp } from "@capacitor/app";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { applyAccent, readAccent } from "@/lib/accent";
import { applyTheme, readTheme } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AuthScreen } from "@/components/auth-screen";
import { BlockedAppsSync } from "@/components/blocked-apps-sync";
import { CurrentTaskSync } from "@/components/current-task-sync";
import { NotificationsSync } from "@/components/notifications-sync";
import { BreakConfigSync } from "@/components/break-config-sync";
import { BottomNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import { SetupWizard, isOnboardingDone } from "@/components/onboarding/setup-wizard";
import { Coachmarks, isCoachmarkDone } from "@/components/onboarding/coachmarks";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Nie znaleziono</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Strona, której szukasz, nie istnieje lub została przeniesiona.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Strona główna
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const retried = useRef(false);

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    if (!retried.current) {
      retried.current = true;
      const t = setTimeout(() => {
        router.invalidate();
        reset();
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [error, router, reset]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Nie udało się załadować
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Coś poszło nie tak. Spróbuj odświeżyć lub wróć do ekranu głównego.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Spróbuj ponownie
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Strona główna
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#3B82F6" },
      { name: "author", content: "TENAX" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className="dark">
      <head>
        <HeadContent />
        {/* Apply saved theme + accent before first paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('dl-theme');if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.setAttribute('data-theme','light')}var a=localStorage.getItem('dl-accent');if(a==='orange'||a==='pink'||a==='blue'||a==='green'){document.documentElement.setAttribute('data-accent',a)}else{document.documentElement.setAttribute('data-accent','blue')}}catch(e){}",
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Sync the theme + accent on startup (also mirrors accent into native prefs).
  useEffect(() => {
    applyTheme(readTheme());
    applyAccent(readAccent());
  }, []);

  // Android back gesture: navigate back instead of exiting the app.
  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    CapApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack || window.history.length > 1) {
        router.history.back();
      } else {
        CapApp.exitApp();
      }
    }).then((h) => { handle = h; });
    return () => handle?.remove();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <BottomNav />
        </AuthGate>
        <Toaster position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

/** Shows a loader while the session resolves, the auth screen when logged out,
 *  and the app (with its nav) once a user is present. */
function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDone());
  const [showCoachmark, setShowCoachmark] = useState(() => isOnboardingDone() && !isCoachmarkDone());

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Ładowanie…</p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (showOnboarding) {
    return (
      <SetupWizard
        onComplete={() => {
          setShowOnboarding(false);
          setShowCoachmark(!isCoachmarkDone());
        }}
      />
    );
  }

  return (
    <>
      {/* Keeps native prefs mirrored to the Supabase blocked-apps selection. */}
      <BlockedAppsSync />
      {/* Mirrors the day's first not-done item into current_task for the overlay. */}
      <CurrentTaskSync />
      {/* Keeps on-device daily reminders in step with the profile + day state. */}
      <NotificationsSync />
      {/* Mirrors break config (delay + daily limit) into native prefs. */}
      <BreakConfigSync />
      {children}
      {showCoachmark && <Coachmarks onDone={() => setShowCoachmark(false)} />}
    </>
  );
}
