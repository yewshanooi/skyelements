'use client';

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "../(auth)/actions";
import AuthButton from "../_components/AuthButton";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPassword, null);

  return (
    <div className="flex min-h-svh w-full items-start justify-center p-6 pt-16 md:p-10 md:pt-24">
      <div className="w-full max-w-sm flex flex-col gap-6 mx-auto">
        <Card>
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center gap-2">
                <h1 className="text-2xl font-semibold">Reset password</h1>
                <p className="text-balance text-muted-foreground text-sm">
                  {state?.success
                    ? "Your password has been updated successfully."
                    : "Use a password at least 8 characters long with both letters and numbers."}
                </p>
              </div>

              {state?.success ? (
                <div className="flex justify-center">
                  <Button variant="secondary" asChild className="w-full cursor-pointer">
                    <Link href="/login">
                      Back to login <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <form action={formAction}>
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="password">New password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirmPassword">Confirm password</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                      />
                      {state?.error && (
                        <p className="text-red-600 dark:text-red-400 text-xs">{state.error}</p>
                      )}
                    </div>

                    <AuthButton className="w-full">Submit</AuthButton>

                    <div className="text-center text-sm">
                      Remember your password?{" "}
                      <Link href="/login" className="underline underline-offset-4 hover:text-primary font-medium">
                        Login
                      </Link>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
          By clicking continue, you agree to our <Link href="/policies">Privacy Policy</Link>.
        </div>
      </div>
    </div>
  );
}
