'use client';

import { AuthCard } from "@/components/auth/AuthCard";

export default function SignupForm() {
  return (
    <div className="flex min-h-svh w-full items-start justify-center p-6 pt-16 md:p-10 md:pt-24">
      <div className="w-full max-w-sm">
        <AuthCard defaultMode="signup" redirectTo="/lithium" />
      </div>
    </div>
  );
}
