import type { Metadata } from "next";
import { redirectIfAuthenticated } from "@/utils/redirectIfAuthenticated";
import SignupForm from "./signup-form";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Welcome to the home of everything elements",
};

export default async function SignupPage() {
    await redirectIfAuthenticated();

    return <SignupForm />;
}