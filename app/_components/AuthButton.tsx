'use client';

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export default function AuthButton({
    children,
    pendingText = <Spinner />
}: {
    children: React.ReactNode;
    pendingText?: React.ReactNode;
}) {
    const { pending } = useFormStatus();

    return (
        <Button 
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="cursor-pointer"
        >
            {pending ? pendingText : children}
        </Button>
    );
}