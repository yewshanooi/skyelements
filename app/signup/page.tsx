import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { redirectIfAuthenticated } from "@/utils/redirectIfAuthenticated";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Welcome to the home of everything elements",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  await redirectIfAuthenticated();
  const { redirectTo } = await searchParams;
  const redirectQuery = redirectTo ? `&redirectTo=${encodeURIComponent(redirectTo)}` : "";
  redirect(`/?auth=signup${redirectQuery}`);
}