import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { redirectIfAuthenticated, redirectIfNotAuthenticated } from "@/lib/auth/guards";

const VALID_AUTH_MODES = ["login", "signup", "forgot-password", "reset-password"] as const;
type AuthMode = typeof VALID_AUTH_MODES[number];

export function generateStaticParams() {
  return VALID_AUTH_MODES.map((mode) => ({ mode }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mode: string }>;
}): Promise<Metadata> {
  const { mode } = await params;

  switch (mode as AuthMode) {
    case "login":
      return {
        title: "Login",
        description: "Welcome back! Enter your details to login",
      };
    case "signup":
      return {
        title: "Sign Up",
        description: "Welcome to the home of everything elements",
      };
    case "forgot-password":
      return {
        title: "Forgot Password",
        description: "Reset your password by entering your email address",
      };
    case "reset-password":
      return {
        title: "Reset Password",
        description: "Enter your new password",
      };
    default:
      return {};
  }
}

export default async function AuthModePage({
  params,
  searchParams,
}: {
  params: Promise<{ mode: string }>;
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { mode } = await params;

  if (!VALID_AUTH_MODES.includes(mode as AuthMode)) {
    notFound();
  }

  const { redirectTo } = await searchParams;

  if (mode === "login" || mode === "signup") {
    await redirectIfAuthenticated();
    const redirectQuery = redirectTo ? `&redirectTo=${encodeURIComponent(redirectTo)}` : "";
    redirect(`/?auth=${mode}${redirectQuery}`);
  }

  if (mode === "forgot-password") {
    await redirectIfAuthenticated();
    redirect("/?auth=forgot-password");
  }

  if (mode === "reset-password") {
    await redirectIfNotAuthenticated("/?auth=login");
    redirect("/?auth=reset-password");
  }

  notFound();
}
