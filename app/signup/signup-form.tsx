'use client';

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";

function SignupContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/apps";

  return (
    <div className="flex min-h-svh w-full items-start justify-center p-6 pt-16 md:p-10 md:pt-24">
      <div className="w-full max-w-sm">
        <AuthCard defaultMode="signup" redirectTo={redirectTo} />
      </div>
    </div>
  );
}

export default function SignupForm() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh w-full items-start justify-center p-6 pt-16 md:p-10 md:pt-24">
          <div className="w-full max-w-sm">
            <AuthCard defaultMode="signup" redirectTo="/apps" />
          </div>
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
