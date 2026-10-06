import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

function sanitizeRedirect(path: string, fallback = '/apps'): string {
    if (!path || typeof path !== 'string') return fallback;
    const trimmed = path.trim();
    return trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')
        ? trimmed
        : fallback;
}

/**
 * Redirects the user to the specified path if they are already authenticated.
 * Used on guest-only pages like login, signup, forgot-password.
 */
export async function redirectIfAuthenticated(path: string = '/apps'): Promise<void> {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (data?.user) {
        redirect(sanitizeRedirect(path));
    }
}

/**
 * Redirects the user to the specified path if they are NOT authenticated.
 * Returns the authenticated User if valid.
 */
export async function redirectIfNotAuthenticated(path: string = '/login'): Promise<User> {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (!data?.user) {
        redirect(path);
    }

    return data.user;
}
