import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { redirectIfNotAuthenticated } from "@/utils/redirectIfNotAuthenticated";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Enter your new password",
};

export default async function ResetPasswordPage() {
  // Ensure the user has an active recovery session (exchanged via Supabase email link)
  // If not authenticated, redirect to login dialog
  await redirectIfNotAuthenticated("/?auth=login");

  redirect("/?auth=reset-password");
}
