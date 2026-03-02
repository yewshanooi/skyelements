import type { Metadata } from "next";
import { redirectIfAuthenticated } from "@/utils/redirectIfAuthenticated";
import ForgotPasswordForm from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your password by entering your email address",
};

export default async function ForgotPasswordPage() {
    await redirectIfAuthenticated();

    return <ForgotPasswordForm />;
}
