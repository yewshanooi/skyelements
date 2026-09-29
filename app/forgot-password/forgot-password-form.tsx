'use client';

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/apps";

  return (
    <div className="flex min-h-svh w-full items-start justify-center p-6 pt-16 md:p-10 md:pt-24">
      <div className="w-full max-w-sm">
        <AuthCard defaultMode="forgot-password" redirectTo={redirectTo} />
      </div>
    </div>
  );
}

export default function ForgotPasswordForm() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh w-full items-start justify-center p-6 pt-16 md:p-10 md:pt-24">
          <div className="w-full max-w-sm">
            <AuthCard defaultMode="forgot-password" redirectTo="/apps" />
          </div>
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
