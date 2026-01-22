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
import { signup } from "../(auth)/actions";
import AuthButton from "../_components/AuthButton";

export default function SignupForm() {
    const [state, formAction] = useActionState(signup, null);
    const [captchaToken, setCaptchaToken] = useState<string | undefined>();

    return (
        <div className="flex min-h-svh w-full items-start justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <Card>
                    <CardHeader className="text-center">
                        <img 
                            src="/logo/skyelements-green-1.png" 
                            alt="SkyElements Logo" 
                            className="mx-auto mb-4 h-12 w-auto"
                        />
                        <CardTitle>Sign Up</CardTitle>
                        <CardDescription>
                            Welcome to the home of everything elements.
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
                                    </div>
                                    <Input id="password" name="password" type="password" required />
                                    {state?.error && (
                                        <p className="text-sm text-red-600 mt-1">{state.error}</p>
                                    )}
                                </Field>
                                <div className="flex justify-center overflow-hidden">
                                    <div className="scale-[0.85] sm:scale-100 origin-center">
                                        <Turnstile
                                            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                                            onSuccess={(token) => setCaptchaToken(token)}
                                        />
                                        <input type="hidden" name="captchaToken" value={captchaToken || ""} />
                                    </div>
                                </div>
                                <Field>
                                    <AuthButton>Create an account</AuthButton>
                                    <FieldDescription className="text-center">
                                        Already have an account? <Link href="/login">Login</Link>
                                    </FieldDescription>
                                </Field>
                            </FieldGroup>
                        </form>
                    </CardContent>
                </Card>

                <div className="mt-6">
                    <FieldDescription className="px-16 text-center">
                        By creating an account, you agree to our <Link href="/cookie-policy">Cookie Policy</Link>.
                    </FieldDescription>
                </div>
            </div>
        </div>
    )
}
