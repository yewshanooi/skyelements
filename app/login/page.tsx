import type { Metadata } from "next";
import { redirectIfAuthenticated } from "@/utils/redirectIfAuthenticated";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Login",
  description: "Welcome back! Enter your details to login",
};

export default async function LoginPage() {
    await redirectIfAuthenticated();

    return <LoginForm />;
}