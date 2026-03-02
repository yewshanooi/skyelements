import type { Metadata } from "next";
import ResetPasswordForm from "./reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Enter your new password",
};

export default function ResetPasswordPage() {
    return <ResetPasswordForm />;
}
