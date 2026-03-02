'use client';

import Link from "next/link";
import { useActionState } from "react";
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
import { resetPassword } from "../(auth)/actions";
import AuthButton from "../_components/AuthButton";

export default function ResetPasswordForm() {
    const [state, formAction] = useActionState(resetPassword, null);

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
                        <CardTitle>Reset Password</CardTitle>
                        <CardDescription>
                            {state?.success
                                ? "Your password has been updated successfully."
                                : "Enter your new password below."}
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
                                        <FieldLabel htmlFor="password">Password</FieldLabel>
                                        <Input 
                                            id="password" 
                                            name="password" 
                                            type="password" 
                                            required 
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                                        <Input 
                                            id="confirmPassword" 
                                            name="confirmPassword" 
                                            type="password" 
                                            required 
                                        />
                                        {state?.error && (
                                            <FieldDescription className="text-red-600">{state.error}</FieldDescription>
                                        )}
                                    </Field>
                                    <Field>
                                        <AuthButton>Submit</AuthButton>
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
