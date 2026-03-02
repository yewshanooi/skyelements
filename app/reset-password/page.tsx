import type { Metadata } from "next";
import { redirectIfNotAuthenticated } from "@/utils/redirectIfNotAuthenticated";
import ResetPasswordForm from "./reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Enter your new password",
};

export default async function ResetPasswordPage() {
    await redirectIfNotAuthenticated();

    return <ResetPasswordForm />;
}
