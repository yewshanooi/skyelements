'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  Suspense,
} from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuthDialog } from './AuthDialog';
import type { AuthMode } from './AuthCard';
import { createClient } from '@/lib/supabase/client';
import { getUserProfile, type UserProfile } from '@/lib/profile';
import { signout as authSignout } from '@/lib/actions/auth';

interface AuthModalContextType {
  isOpen: boolean;
  mode: AuthMode;
  redirectTo: string;
  user: UserProfile | null;
  isLoadingUser: boolean;
  openAuth: (mode?: AuthMode, redirectTo?: string) => void;
  closeAuth: () => void;
  setMode: (mode: AuthMode) => void;
  requireAuth: (e?: React.MouseEvent, redirectTo?: string) => boolean;
  signOut: () => Promise<void>;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

const VALID_AUTH_MODES: AuthMode[] = [
  'login',
  'signup',
  'forgot-password',
  'reset-password',
];

function AuthModalUrlSync({
  user,
  isLoadingUser,
  onUrlTrigger,
}: {
  user: UserProfile | null;
  isLoadingUser: boolean;
  onUrlTrigger: (mode: AuthMode, redirectTo?: string) => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const auth = searchParams.get('auth');
    if (!auth || !VALID_AUTH_MODES.includes(auth as AuthMode)) {
      return;
    }

    const redirectTo = searchParams.get('redirectTo') || undefined;

    // While user authentication state is loading, wait before resolving
    if (isLoadingUser) {
      return;
    }

    // If user is already authenticated and visiting a guest auth mode
    if (user && (auth === 'login' || auth === 'signup' || auth === 'forgot-password')) {
      const safeRedirect =
        redirectTo &&
        redirectTo.startsWith('/') &&
        !redirectTo.startsWith('//') &&
        !redirectTo.startsWith('/\\')
          ? redirectTo
          : undefined;

      // Clean query parameters from URL
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('auth');
        url.searchParams.delete('redirectTo');
        const cleanSearch = url.search ? url.search : '';
        const cleanUrl = url.pathname + cleanSearch + url.hash;
        window.history.replaceState(null, '', cleanUrl);
      }

      // If a destination was requested (e.g. /sales/table), navigate to it
      if (safeRedirect && typeof window !== 'undefined' && safeRedirect !== window.location.pathname) {
        router.replace(safeRedirect);
      }
      return;
    }

    // If user tries to access reset-password, verify that they are authenticated
    // (Supabase reset password email links establish a recovery session first)
    if (auth === 'reset-password') {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
        if (!currentUser) {
          // Not authenticated, fallback to login and sanitize URL
          onUrlTrigger('login', redirectTo);
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('auth', 'login');
            window.history.replaceState(null, '', url.pathname + url.search + url.hash);
          }
        } else {
          onUrlTrigger('reset-password', redirectTo);
        }
      });
      return;
    }

    onUrlTrigger(auth as AuthMode, redirectTo);
  }, [searchParams, user, isLoadingUser, onUrlTrigger, router]);

  return null;
}

export function AuthModalProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: UserProfile | null;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setModeState] = useState<AuthMode>('login');
  const [redirectTo, setRedirectTo] = useState('/apps');
  const [user, setUser] = useState<UserProfile | null>(initialUser ?? null);
  const [isLoadingUser, setIsLoadingUser] = useState(initialUser === undefined);

  useEffect(() => {
    if (initialUser !== undefined) {
      setUser(initialUser);
      setIsLoadingUser(false);
    }
  }, [initialUser]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        setUser(getUserProfile(authUser));
      } else {
        setUser(null);
      }
      setIsLoadingUser(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(getUserProfile(session.user));
      } else {
        setUser(null);
      }
      setIsLoadingUser(false);
    });

    const handleCustomProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<UserProfile>;
      if (customEvent.detail) {
        setUser(customEvent.detail);
      }
    };

    window.addEventListener('skyelements:profile-updated', handleCustomProfileUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('skyelements:profile-updated', handleCustomProfileUpdate);
    };
  }, []);

  const openAuth = useCallback(async (newMode: AuthMode = 'login', newRedirectTo: string = '/apps') => {
    if (user && (newMode === 'login' || newMode === 'signup' || newMode === 'forgot-password')) {
      const safeRedirect =
        newRedirectTo &&
        newRedirectTo.startsWith('/') &&
        !newRedirectTo.startsWith('//') &&
        !newRedirectTo.startsWith('/\\')
          ? newRedirectTo
          : undefined;

      if (safeRedirect && typeof window !== 'undefined' && safeRedirect !== window.location.pathname) {
        router.push(safeRedirect);
      }
      return;
    }

    let targetMode = newMode;
    if (newMode === 'reset-password') {
      const supabase = createClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        targetMode = 'login';
      }
    }

    setModeState(targetMode);
    setRedirectTo(newRedirectTo);
    setIsOpen(true);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('auth', targetMode);
      if (newRedirectTo && newRedirectTo !== '/apps') {
        url.searchParams.set('redirectTo', newRedirectTo);
      }
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }, [user, router]);

  const closeAuth = useCallback(() => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      let changed = false;
      if (url.searchParams.has('auth')) {
        url.searchParams.delete('auth');
        changed = true;
      }
      if (url.searchParams.has('redirectTo')) {
        url.searchParams.delete('redirectTo');
        changed = true;
      }
      if (changed) {
        const cleanSearch = url.search ? url.search : '';
        const cleanUrl = url.pathname + cleanSearch + url.hash;
        window.history.replaceState(null, '', cleanUrl);
      }
    }
  }, []);

  const handleUrlTrigger = useCallback((urlMode: AuthMode, urlRedirectTo?: string) => {
    if (user && (urlMode === 'login' || urlMode === 'signup' || urlMode === 'forgot-password')) {
      return;
    }
    setModeState(urlMode);
    if (urlRedirectTo) {
      setRedirectTo(urlRedirectTo);
    }
    setIsOpen(true);
  }, [user]);

  // Automatically close guest auth dialog if user session is active
  useEffect(() => {
    if (user && isOpen && mode !== 'reset-password') {
      closeAuth();
    }
  }, [user, isOpen, mode, closeAuth]);

  const handleModeChange = useCallback(async (newMode: AuthMode) => {
    let targetMode = newMode;
    if (newMode === 'reset-password') {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        targetMode = 'login';
      }
    }

    setModeState(targetMode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('auth')) {
        url.searchParams.set('auth', targetMode);
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      }
    }
  }, []);

  const requireAuth = useCallback(
    (e?: React.MouseEvent, targetRedirectTo: string = '/apps'): boolean => {
      if (user) {
        return true;
      }
      if (e) {
        e.preventDefault();
      }
      if (isLoadingUser) {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user: authUser } }) => {
          if (authUser) {
            const profile = getUserProfile(authUser);
            setUser(profile);
            router.push(targetRedirectTo);
          } else {
            setUser(null);
            openAuth('login', targetRedirectTo);
          }
        });
        return false;
      }
      openAuth('login', targetRedirectTo);
      return false;
    },
    [user, isLoadingUser, openAuth, router]
  );

  const signOut = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Client sign out error:", e);
    }

    try {
      await authSignout();
    } catch {
      // Ignore NEXT_REDIRECT if thrown
    }

    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, []);

  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        mode,
        redirectTo,
        user,
        isLoadingUser,
        openAuth,
        closeAuth,
        setMode: handleModeChange,
        requireAuth,
        signOut,
      }}
    >
      <Suspense fallback={null}>
        <AuthModalUrlSync
          user={user}
          isLoadingUser={isLoadingUser}
          onUrlTrigger={handleUrlTrigger}
        />
      </Suspense>
      {children}
      <AuthDialog
        isOpen={isOpen}
        onClose={closeAuth}
        defaultMode={mode}
        redirectTo={redirectTo}
        onModeChange={handleModeChange}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextType {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}
