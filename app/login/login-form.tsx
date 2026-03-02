'use client';

import Link from "next/link";
import { Turnstile } from '@marsidev/react-turnstile'
import { useActionState, useState } from "react";
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
import { login } from "../(auth)/actions";
import AuthButton from "../_components/AuthButton";

export default function LoginForm() {
    const [state, formAction] = useActionState(login, null);
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
                        <CardTitle>Login</CardTitle>
                        <CardDescription>
                            Welcome back! Enter your details to continue.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={formAction}>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="email">Email</FieldLabel>
                                    <Input 
                                        id="email" 
                                        name="email" 
                                        type="email" 
                                        // autoFocus 
                                        required 
                                    />
                                </Field>
                                <Field>
                                    <div className="flex items-center">
                                        <FieldLabel htmlFor="password">Password</FieldLabel>
                                        <Link
                                            href="/forgot-password"
                                            className="ml-auto inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
                                        >
                                            Forgot your password?
                                        </Link>
                                    </div>
                                    <Input id="password" name="password" type="password" required />
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
                                        Don&apos;t have an account? <Link href="/signup">Sign up</Link>
                                    </FieldDescription>
                                </Field>
                            </FieldGroup>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
