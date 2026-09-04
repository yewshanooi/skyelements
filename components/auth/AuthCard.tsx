'use client';

import Link from "next/link";
import { Turnstile } from '@marsidev/react-turnstile';
import { useActionState, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, signup, forgotPassword, signInWithGoogle, signInWithNotion } from "@/app/(auth)/actions";
import AuthButton from "@/app/_components/AuthButton";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type AuthMode = 'login' | 'signup' | 'forgot-password';

interface AuthCardProps {
  defaultMode?: AuthMode;
  redirectTo?: string;
  className?: string;
  onModeChange?: (mode: AuthMode) => void;
  inDialog?: boolean;
  footerClassName?: string;
}

export function AuthCard({
  defaultMode = 'login',
  redirectTo = '/lithium',
  className = '',
  onModeChange,
  inDialog = false,
  footerClassName,
}: AuthCardProps) {
  const [mode, setModeState] = useState<AuthMode>(defaultMode);
  const [loginState, loginAction] = useActionState(login, null);
  const [signupState, signupAction] = useActionState(signup, null);
  const [forgotState, forgotAction] = useActionState(forgotPassword, null);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();

  const setMode = (newMode: AuthMode) => {
    setModeState(newMode);
    onModeChange?.(newMode);
  };

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return (
    <div className={cn("flex flex-col gap-6 w-full max-w-sm mx-auto", className)}>
      <Card>
        <CardContent className="p-6 md:p-8">
          {mode === 'signup' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center gap-2">
                <h1 className="text-2xl font-semibold">Create an account</h1>
                <p className="text-balance text-muted-foreground text-sm">
                  Enter your details below to create your account
                </p>
              </div>
              <form action={signupAction}>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="signup-displayName">Name</Label>
                    <Input
                      id="signup-displayName"
                      name="displayName"
                      type="text"
                      autoComplete="name"
                      maxLength={80}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                    />
                    {signupState?.error && (
                      <p className="text-red-600 dark:text-red-400 text-xs">{signupState.error}</p>
                    )}
                  </div>

                  {turnstileSiteKey && (
                    <div className="flex justify-center overflow-hidden py-0.5">
                      <div className="scale-[0.80] origin-center">
                        <Turnstile
                          siteKey={turnstileSiteKey}
                          onSuccess={(token) => setCaptchaToken(token)}
                        />
                        <input type="hidden" name="captchaToken" value={captchaToken || ""} />
                      </div>
                    </div>
                  )}

                  <input type="hidden" name="redirectTo" value={redirectTo} />

                  <AuthButton className="w-full">Create an account</AuthButton>

                  <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                    <span className="relative z-10 bg-card px-2 text-muted-foreground text-xs">
                      or continue with
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-xs cursor-pointer"
                      type="submit"
                      formAction={signInWithGoogle}
                    >
                      <svg viewBox="0 0 48 48" version="1.1" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                      Google
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full gap-2 text-xs cursor-pointer"
                      type="submit"
                      formAction={signInWithNotion}
                    >
                      <svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0">
                        <path
                          d="M3.25781 3.11684C3.67771 3.45796 3.83523 3.43193 4.62369 3.37933L12.0571 2.93299C12.2147 2.93299 12.0836 2.77571 12.0311 2.74957L10.7965 1.85711C10.56 1.67347 10.2448 1.46315 9.64083 1.51576L2.44308 2.04074C2.18059 2.06677 2.12815 2.19801 2.2327 2.30322L3.25781 3.11684ZM3.7041 4.84917V12.6704C3.7041 13.0907 3.91415 13.248 4.38693 13.222L12.5562 12.7493C13.0292 12.7233 13.0819 12.4341 13.0819 12.0927V4.32397C13.0819 3.98306 12.9508 3.79921 12.6612 3.82545L4.12422 4.32397C3.80918 4.35044 3.7041 4.50803 3.7041 4.84917ZM11.7688 5.26872C11.8212 5.50518 11.7688 5.74142 11.5319 5.76799L11.1383 5.84641V11.6205C10.7965 11.8042 10.4814 11.9092 10.2188 11.9092C9.79835 11.9092 9.69305 11.7779 9.37812 11.3844L6.80345 7.34249V11.2532L7.61816 11.437C7.61816 11.437 7.61816 11.9092 6.96086 11.9092L5.14879 12.0143C5.09615 11.9092 5.14879 11.647 5.33259 11.5944L5.80546 11.4634V6.29276L5.1489 6.24015C5.09625 6.00369 5.22739 5.66278 5.5954 5.63631L7.53935 5.50528L10.2188 9.5998V5.97765L9.53564 5.89924C9.4832 5.61018 9.69305 5.40028 9.95576 5.37425L11.7688 5.26872ZM1.83874 1.33212L9.32557 0.780787C10.245 0.701932 10.4815 0.754753 11.0594 1.17452L13.4492 2.85424C13.8436 3.14309 13.975 3.22173 13.975 3.53661V12.7493C13.975 13.3266 13.7647 13.6681 13.0293 13.7203L4.33492 14.2454C3.78291 14.2717 3.52019 14.193 3.23111 13.8253L1.47116 11.5419C1.1558 11.1216 1.02466 10.8071 1.02466 10.4392V2.25041C1.02466 1.77825 1.23504 1.38441 1.83874 1.33212Z"
                          fill="currentColor"
                        />
                      </svg>
                      Notion
                    </Button>
                  </div>

                  <div className="text-center text-sm">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="underline underline-offset-4 hover:text-primary cursor-pointer font-medium"
                    >
                      Login
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {mode === 'forgot-password' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center gap-2">
                <h1 className="text-2xl font-semibold">Forgot password</h1>
                <p className="text-balance text-muted-foreground text-sm">
                  {forgotState?.success
                    ? "If an account exists with that email, you will receive a password reset link shortly."
                    : "Enter your email to receive a password reset link"}
                </p>
              </div>
              {forgotState?.success ? (
                <div className="flex justify-center">
                  <Button variant="secondary" onClick={() => setMode('login')} className="w-full cursor-pointer">
                    Back to login <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <form action={forgotAction}>
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="forgot-email">Email</Label>
                      <Input
                        id="forgot-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                      />
                      {forgotState?.error && (
                        <p className="text-red-600 dark:text-red-400 text-xs">{forgotState.error}</p>
                      )}
                    </div>

                    {turnstileSiteKey && (
                      <div className="flex justify-center overflow-hidden py-0.5">
                        <div className="scale-[0.80] origin-center">
                          <Turnstile
                            siteKey={turnstileSiteKey}
                            onSuccess={(token) => setCaptchaToken(token)}
                          />
                          <input type="hidden" name="captchaToken" value={captchaToken || ""} />
                        </div>
                      </div>
                    )}

                    <input type="hidden" name="redirectTo" value={redirectTo} />

                    <AuthButton className="w-full">Send Reset Link</AuthButton>

                    <div className="text-center text-sm">
                      Remember your password?{" "}
                      <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="underline underline-offset-4 hover:text-primary cursor-pointer font-medium"
                      >
                        Login
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {mode === 'login' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center gap-2">
                <h1 className="text-2xl font-semibold">Welcome back</h1>
                <p className="text-balance text-muted-foreground text-sm">
                  Login to your SkyElements account
                </p>
              </div>
              <form action={loginAction}>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="username email"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="login-password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setMode('forgot-password')}
                        className="ml-auto text-sm underline-offset-2 hover:underline text-muted-foreground cursor-pointer"
                      >
                        Forgot your password?
                      </button>
                    </div>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                    />
                    {loginState?.error && (
                      <p className="text-red-600 dark:text-red-400 text-xs">{loginState.error}</p>
                    )}
                  </div>

                  {turnstileSiteKey && (
                    <div className="flex justify-center overflow-hidden py-0.5">
                      <div className="scale-[0.80] origin-center">
                        <Turnstile
                          siteKey={turnstileSiteKey}
                          onSuccess={(token) => setCaptchaToken(token)}
                        />
                        <input type="hidden" name="captchaToken" value={captchaToken || ""} />
                      </div>
                    </div>
                  )}

                  <input type="hidden" name="redirectTo" value={redirectTo} />

                  <AuthButton className="w-full">Login</AuthButton>

                  <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                    <span className="relative z-10 bg-card px-2 text-muted-foreground text-xs">
                      or continue with
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-xs cursor-pointer"
                      type="submit"
                      formAction={signInWithGoogle}
                    >
                      <svg viewBox="0 0 48 48" version="1.1" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                      Google
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full gap-2 text-xs cursor-pointer"
                      type="submit"
                      formAction={signInWithNotion}
                    >
                      <svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0">
                        <path
                          d="M3.25781 3.11684C3.67771 3.45796 3.83523 3.43193 4.62369 3.37933L12.0571 2.93299C12.2147 2.93299 12.0836 2.77571 12.0311 2.74957L10.7965 1.85711C10.56 1.67347 10.2448 1.46315 9.64083 1.51576L2.44308 2.04074C2.18059 2.06677 2.12815 2.19801 2.2327 2.30322L3.25781 3.11684ZM3.7041 4.84917V12.6704C3.7041 13.0907 3.91415 13.248 4.38693 13.222L12.5562 12.7493C13.0292 12.7233 13.0819 12.4341 13.0819 12.0927V4.32397C13.0819 3.98306 12.9508 3.79921 12.6612 3.82545L4.12422 4.32397C3.80918 4.35044 3.7041 4.50803 3.7041 4.84917ZM11.7688 5.26872C11.8212 5.50518 11.7688 5.74142 11.5319 5.76799L11.1383 5.84641V11.6205C10.7965 11.8042 10.4814 11.9092 10.2188 11.9092C9.79835 11.9092 9.69305 11.7779 9.37812 11.3844L6.80345 7.34249V11.2532L7.61816 11.437C7.61816 11.437 7.61816 11.9092 6.96086 11.9092L5.14879 12.0143C5.09615 11.9092 5.14879 11.647 5.33259 11.5944L5.80546 11.4634V6.29276L5.1489 6.24015C5.09625 6.00369 5.22739 5.66278 5.5954 5.63631L7.53935 5.50528L10.2188 9.5998V5.97765L9.53564 5.89924C9.4832 5.61018 9.69305 5.40028 9.95576 5.37425L11.7688 5.26872ZM1.83874 1.33212L9.32557 0.780787C10.245 0.701932 10.4815 0.754753 11.0594 1.17452L13.4492 2.85424C13.8436 3.14309 13.975 3.22173 13.975 3.53661V12.7493C13.975 13.3266 13.7647 13.6681 13.0293 13.7203L4.33492 14.2454C3.78291 14.2717 3.52019 14.193 3.23111 13.8253L1.47116 11.5419C1.1558 11.1216 1.02466 10.8071 1.02466 10.4392V2.25041C1.02466 1.77825 1.23504 1.38441 1.83874 1.33212Z"
                          fill="currentColor"
                        />
                      </svg>
                      Notion
                    </Button>
                  </div>

                  <div className="text-center text-sm">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="underline underline-offset-4 hover:text-primary cursor-pointer font-medium"
                    >
                      Sign up
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      <div
        className={cn(
          "text-balance text-center text-xs [&_a]:underline [&_a]:underline-offset-4 transition-colors",
          inDialog
            ? "text-neutral-400 [&_a]:text-neutral-400 hover:[&_a]:text-neutral-300"
            : "text-muted-foreground [&_a]:text-foreground hover:[&_a]:text-primary",
          footerClassName
        )}
      >
        By clicking continue, you agree to our <Link href="/policies">Privacy Policy</Link>.
      </div>
    </div>
  );
}
