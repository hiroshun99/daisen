import {
  Link,
  Navigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { BookMarked } from "lucide-react";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import {
  useCurrentUserState,
  type AppUser,
} from "@/lib/auth/use-current-user";
import { signOutToLogin } from "@/lib/session-token";
import { safeRedirectPath } from "@/lib/utils";

const subscribeToNothing = () => () => {};
const noGateSessionOnServer = () => false;

function AuthSlot({ user }: { user: AppUser }) {
  const [signingOut, setSigningOut] = useState(false);
  const gateSession = useSyncExternalStore(
    subscribeToNothing,
    hasGateSessionMarker,
    noGateSessionOnServer,
  );
  const label = user.displayName ?? user.primaryEmail ?? "アカウント";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link
        to="/settings"
        className="max-w-28 truncate text-sm text-muted hover:text-fg sm:max-w-40"
      >
        {label}
      </Link>
      {!gateSession ? (
        <button
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOutToLogin("/login").catch(() => setSigningOut(false));
          }}
          className="h-11 shrink-0 px-2 text-sm text-muted hover:text-fg disabled:cursor-wait"
        >
          {signingOut ? "ログアウトしています…" : "ログアウト"}
        </button>
      ) : null}
    </div>
  );
}

export function AppHeader({ user }: { user: AppUser }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-base font-medium tracking-tight text-fg"
        >
          <span className="grid size-8 place-items-center rounded-[10px] bg-accent text-accent-fg">
            <BookMarked className="size-4" />
          </span>
          ブレインノート
        </Link>
        <AuthSlot user={user} />
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (isPending) {
    return (
      <div className="min-h-dvh bg-bg text-fg">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <div className="h-8 w-36 animate-pulse rounded-[var(--radius-sm)] bg-surface-2" />
        </div>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="h-8 w-48 animate-pulse rounded-[var(--radius-sm)] bg-surface-2" />
          <div className="mt-6 h-24 animate-pulse rounded-[var(--radius-lg)] bg-surface-2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        search={{ redirect: safeRedirectPath(pathname) }}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <AppHeader user={user} />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">{children}</div>
    </div>
  );
}

export function AuthScreen({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const router = useRouter();
  const redirect = useRouterState({
    select: (s) => {
      const search = s.location.search as { redirect?: unknown };
      return safeRedirectPath(search?.redirect);
    },
  });

  useEffect(() => {
    if (!isPending && user) {
      router.history.replace(redirect);
    }
  }, [isPending, user, redirect, router]);

  if (isPending || user) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-4">
        <div className="h-40 w-full max-w-sm animate-pulse rounded-[var(--radius-xl)] bg-surface-2" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}
