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
import { login, signInWithGoogle, signInWithNotion } from "../(auth)/actions";
import AuthButton from "../_components/AuthButton";
import { Button } from "@/components/ui/button";

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
                                <svg viewBox="0 0 48 48" version="1.1" xmlns="http://www.w3.org/2000/svg">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                    <path fill="none" d="M0 0h48v48H0z"></path>
                                </svg>
                                Continue with Google
                            </Button>
                        </form>

                        <form action={signInWithNotion} className="mb-2">
                            <Button variant="outline" className="w-full cursor-pointer" type="submit">
                                <svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M3.25781 3.11684C3.67771 3.45796 3.83523 3.43193 4.62369 3.37933L12.0571 2.93299C12.2147 2.93299 12.0836 2.77571 12.0311 2.74957L10.7965 1.85711C10.56 1.67347 10.2448 1.46315 9.64083 1.51576L2.44308 2.04074C2.18059 2.06677 2.12815 2.19801 2.2327 2.30322L3.25781 3.11684ZM3.7041 4.84917V12.6704C3.7041 13.0907 3.91415 13.248 4.38693 13.222L12.5562 12.7493C13.0292 12.7233 13.0819 12.4341 13.0819 12.0927V4.32397C13.0819 3.98306 12.9508 3.79921 12.6612 3.82545L4.12422 4.32397C3.80918 4.35044 3.7041 4.50803 3.7041 4.84917ZM11.7688 5.26872C11.8212 5.50518 11.7688 5.74142 11.5319 5.76799L11.1383 5.84641V11.6205C10.7965 11.8042 10.4814 11.9092 10.2188 11.9092C9.79835 11.9092 9.69305 11.7779 9.37812 11.3844L6.80345 7.34249V11.2532L7.61816 11.437C7.61816 11.437 7.61816 11.9092 6.96086 11.9092L5.14879 12.0143C5.09615 11.9092 5.14879 11.647 5.33259 11.5944L5.80546 11.4634V6.29276L5.1489 6.24015C5.09625 6.00369 5.22739 5.66278 5.5954 5.63631L7.53935 5.50528L10.2188 9.5998V5.97765L9.53564 5.89924C9.4832 5.61018 9.69305 5.40028 9.95576 5.37425L11.7688 5.26872ZM1.83874 1.33212L9.32557 0.780787C10.245 0.701932 10.4815 0.754753 11.0594 1.17452L13.4492 2.85424C13.8436 3.14309 13.975 3.22173 13.975 3.53661V12.7493C13.975 13.3266 13.7647 13.6681 13.0293 13.7203L4.33492 14.2454C3.78291 14.2717 3.52019 14.193 3.23111 13.8253L1.47116 11.5419C1.1558 11.1216 1.02466 10.8071 1.02466 10.4392V2.25041C1.02466 1.77825 1.23504 1.38441 1.83874 1.33212Z"
                                        fill="currentColor"
                                    />
                                </svg>
                                Continue with Notion
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
