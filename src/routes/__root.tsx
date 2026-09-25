import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { App as CapApp } from "@capacitor/app";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { applyAccent, readAccent } from "@/lib/accent";
import { applyTheme, readTheme } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AuthScreen } from "@/components/auth-screen";
import { TenaxShield } from "@/components/tenax-shield";
import { SplashScreen } from "@/components/splash-screen";
import { describeStartupError } from "@/lib/startup-error";
import { logClientError, installGlobalErrorLogging } from "@/lib/client-errors";
import { useToday, useYesterday } from "@/lib/day";
import { BlockedAppsSync } from "@/components/blocked-apps-sync";
import { CurrentTaskSync } from "@/components/current-task-sync";
import { NotificationsSync } from "@/components/notifications-sync";
import { BreakConfigSync } from "@/components/break-config-sync";
import { BottomNav } from "@/components/bottom-nav";
import { NavReadyProvider, useNavReady } from "@/lib/nav-ready";
import { Toaster } from "@/components/ui/sonner";
import { SetupWizard } from "@/components/onboarding/setup-wizard";
import { Coachmarks } from "@/components/onboarding/coachmarks";
import { useProfile, useUpdateProfile } from "@/lib/profile";
import { OnboardingProvider } from "@/lib/onboarding-context";

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
    logClientError(error, "root_error_component");
    if (retried.current) return undefined;
    retried.current = true;
    const t = setTimeout(() => {
      router.invalidate();
      reset();
    }, 1500);
    return () => clearTimeout(t);
  }, [error, router, reset]);

  // Shown on screen, not just logged: on a phone this is the only way to read
  // what actually broke without plugging into chrome://inspect.
  const details = [error.message, error.stack?.split("\n").slice(1, 5).join("\n")]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-md rounded-3xl glass px-6 py-7">
        <div className="mb-5 flex justify-center">
          <TenaxShield size={56} color="var(--primary)" />
        </div>
        <h1 className="text-center text-xl font-bold tracking-tight text-foreground">
          Nie udało się załadować
        </h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
          Spróbuję jeszcze raz za chwilę. Jeśli to się powtarza, prześlij poniższy
          tekst — to on mówi, co poszło nie tak.
        </p>

        {details && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-2xl bg-foreground/[0.06] px-3 py-2.5 text-left text-[11px] leading-relaxed text-muted-foreground">
            {details}
          </pre>
        )}

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="accent-gradient h-12 w-full rounded-full text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            Spróbuj ponownie
          </button>
          <a
            href="/"
            className="flex h-12 w-full items-center justify-center rounded-full bg-foreground/5 text-sm font-semibold text-muted-foreground"
          >
            Ekran główny
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

  useEffect(() => installGlobalErrorLogging(), []);

  // Android back gesture: navigate back instead of exiting the app.
  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    CapApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack || window.history.length > 1) {
        router.history.back();
      } else {
        CapApp.exitApp();
      }
    })
      .then((h) => {
        handle = h;
      })
      // On a cold start the plugin can still be registering; an unhandled
      // rejection here would surface as a startup error for a back button.
      .catch((e) => console.error("backButton listener failed", e));
    return () => handle?.remove();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavReadyProvider>
          <AuthGate>
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
            <BottomNavGated />
          </AuthGate>
        </NavReadyProvider>
        <Toaster position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

/** Shows a loader while the session resolves, the auth screen when logged out,
 *  and the app (with its nav) once a user is present. */
function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const profileQ = useProfile();
  const { data: profile, isLoading: profileLoading } = profileQ;
  const todayQ = useToday();
  const yesterdayQ = useYesterday();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();
  const [wizardDismissed, setWizardDismissed] = useState(false);
  const [coachmarkDismissed, setCoachmarkDismissed] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  const startupError = profileQ.error ?? todayQ.error;

  const restartCoachmark = useCallback(() => {
    setCoachmarkDismissed(false);
    updateProfile.mutate({ coachmark_done: false });
    navigate({ to: "/" });
  }, [updateProfile, navigate]);

  const restartSurvey = useCallback(() => {
    setWizardDismissed(false);
    updateProfile.mutate({ onboarding_done: false });
  }, [updateProfile]);

  // The splash owns the wait: it stays up until the session is restored and the
  // first screen's data has landed, then hands over. On failure it says what
  // actually went wrong rather than looping on "try again".
  // Kept mounted until it says it's done, so a fast start still gets its floor
  // instead of the splash blinking out mid-draw.
  if (!splashDone) {
    return (
      <SplashScreen
        stage={{
          session: !loading,
          profile: !user || !profileLoading,
          today: !user || !todayQ.isLoading,
          yesterday: !user || !yesterdayQ.isLoading,
        }}
        error={startupError ? describeStartupError(startupError) : null}
        onRetry={() => {
          void profileQ.refetch();
          void todayQ.refetch();
        }}
        onDone={() => setSplashDone(true)}
      />
    );
  }

  if (!user) return <AuthScreen />;

  const showOnboarding = !wizardDismissed && (!profile || !profile.onboarding_done);
  const showCoachmark = !coachmarkDismissed && !!profile?.onboarding_done && !profile?.coachmark_done;

  if (showOnboarding) {
    return (
      <SetupWizard
        onComplete={() => {
          setWizardDismissed(true);
        }}
      />
    );
  }

  return (
    <OnboardingProvider
      restartCoachmark={restartCoachmark}
      restartSurvey={restartSurvey}
    >
      {/* Keeps native prefs mirrored to the Supabase blocked-apps selection. */}
      <BlockedAppsSync />
      {/* Mirrors the day's first not-done item into current_task for the overlay. */}
      <CurrentTaskSync />
      {/* Keeps on-device daily reminders in step with the profile + day state. */}
      <NotificationsSync />
      {/* Mirrors break config (delay + daily limit) into native prefs. */}
      <BreakConfigSync />
      {children}
      {showCoachmark && <Coachmarks onDone={() => setCoachmarkDismissed(true)} />}
    </OnboardingProvider>
  );
}

function BottomNavGated() {
  const { ready } = useNavReady();
  return <BottomNav ready={ready} />;
}
