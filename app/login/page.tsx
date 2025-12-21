import type { Metadata } from "next";
import Link from "next/link";
import { redirectIfAuthenticated } from "@/utils/redirectIfAuthenticated";
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

export const metadata: Metadata = {
  title: "Login",
  description: "Welcome back! Enter your details to login",
};

export default async function LoginPage() {
    await redirectIfAuthenticated();

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
                        <form action={login}>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="email">Email</FieldLabel>
                                    <Input id="email" name="email" type="email" autoFocus required />
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