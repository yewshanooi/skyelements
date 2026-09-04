'use client';

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export default function AuthButton({
    children,
    pendingText = <Spinner />,
    className,
}: {
    children: React.ReactNode;
    pendingText?: React.ReactNode;
    className?: string;
}) {
    const { pending } = useFormStatus();

    return (
        <Button 
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className={cn("w-full cursor-pointer", className)}
        >
            {pending ? pendingText : children}
        </Button>
    );
}