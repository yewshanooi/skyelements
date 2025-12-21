'use client';

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button"

export default function AuthButton({
    children,
    pendingText = 'Loading...'
}: {
    children: React.ReactNode;
    pendingText?: string;
}) {
    const { pending } = useFormStatus();

    return (
        <Button 
            type="submit"
            disabled={pending}
            aria-busy={pending}
        >
            {pending ? pendingText : children}
        </Button>
    )
}