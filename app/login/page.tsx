import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { redirectIfAuthenticated } from "@/utils/redirectIfAuthenticated";

export const metadata: Metadata = {
  title: "Login",
  description: "Welcome back! Enter your details to login",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  await redirectIfAuthenticated();
  const { redirectTo } = await searchParams;
  const redirectQuery = redirectTo ? `&redirectTo=${encodeURIComponent(redirectTo)}` : "";
  redirect(`/?auth=login${redirectQuery}`);
}