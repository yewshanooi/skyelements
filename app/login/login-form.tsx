'use client';

import Link from "next/link";
import { useActionState } from "react";
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

    return (
        <div className="flex min-h-svh w-full items-start justify-center p-6 md:p-10">
            <div className="w-full max-w-sm mt-8">
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
                                        {/* <Link
                                            href="#"
                                            className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                        >
                                            Forgot your password?
                                        </Link> */}
                                    </div>
                                    <Input id="password" name="password" type="password" required />
                                    {state?.error && (
                                        <p className="text-sm text-red-600 mt-1">{state.error}</p>
                                    )}
                                </Field>
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
