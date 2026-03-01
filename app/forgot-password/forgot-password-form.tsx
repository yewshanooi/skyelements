'use client';

import Link from "next/link";
import { Turnstile } from '@marsidev/react-turnstile'
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input";
import { forgotPassword } from "../(auth)/actions";
import AuthButton from "../_components/AuthButton";

export default function ForgotPasswordForm() {
    const [state, formAction] = useActionState(forgotPassword, null);
    const [captchaToken, setCaptchaToken] = useState<string | undefined>();

    return (
        <div className="flex min-h-svh w-full items-start justify-center p-8 pt-16 lg:pt-24">
            <div className="w-full max-w-sm">
                <Card>
                    <CardHeader className="text-center">
                        <img 
                            src="/logo/skyelements-green-1.png" 
                            alt="SkyElements Logo" 
                            className="mx-auto mb-4 h-12 w-auto"
                        />
                        <CardTitle>Forgot Password</CardTitle>
                        <CardDescription>
                            {state?.success
                                ? "If an account exists with that email, you will receive a password reset link shortly."
                                : "Enter your email and we\u2019ll send you a link to reset your password."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {state?.success ? (
                            <div className="flex justify-center">
                                <Button variant="secondary" asChild>
                                    <Link href="/login">
                                        Back to login <ChevronRight />
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <form action={formAction}>
                                <FieldGroup>
                                    <Field>
                                        <FieldLabel htmlFor="email">Email</FieldLabel>
                                        <Input 
                                            id="email" 
                                            name="email" 
                                            type="email" 
                                            required 
                                        />
                                        {state?.error && (
                                            <FieldDescription className="text-red-600">{state.error}</FieldDescription>
                                        )}
                                    </Field>
                                    <div className="flex justify-center overflow-hidden">
                                        <div className="scale-[0.80] lg:scale-100 origin-center">
                                            <Turnstile
                                                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                                                onSuccess={(token) => setCaptchaToken(token)}
                                            />
                                            <input type="hidden" name="captchaToken" value={captchaToken || ""} />
                                        </div>
                                    </div>
                                    <Field>
                                        <AuthButton>Continue</AuthButton>
                                        <FieldDescription className="text-center">
                                            Remember your password? <Link href="/login">Login</Link>
                                        </FieldDescription>
                                    </Field>
                                </FieldGroup>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
