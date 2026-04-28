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
import { signup, signInWithGoogle } from "../(auth)/actions";
import AuthButton from "../_components/AuthButton";
import { Button } from "@/components/ui/button";

export default function SignupForm() {
    const [state, formAction] = useActionState(signup, null);
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
                                    <AuthButton>Create an account</AuthButton>
                                    <FieldDescription className="text-center">
                                        Already have an account? <Link href="/login">Login</Link>
                                    </FieldDescription>
                                </Field>
                            </FieldGroup>
                        </form>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-card px-2 text-muted-foreground">
                                    or
                                </span>
                            </div>
                        </div>

                        <form action={signInWithGoogle} className="mb-2">
                            <Button variant="outline" className="w-full cursor-pointer" type="submit">
                                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                    <path fill="none" d="M0 0h48v48H0z"></path>
                                </svg>
                                Continue with Google
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="mt-6">
                    <FieldDescription className="px-16 text-center">
                        By creating an account, you agree to our <Link href="/privacy-policy">Privacy Policy</Link>.
                    </FieldDescription>
                </div>
            </div>
        </div>
    )
}
