import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { redirectIfAuthenticated } from "@/utils/redirectIfAuthenticated";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your password by entering your email address",
};

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();
  redirect("/?auth=forgot-password");
}
