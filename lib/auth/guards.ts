import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Redirects the user to the specified path if they are already authenticated.
 * Used on guest-only pages like login, signup, forgot-password.
 */
export async function redirectIfAuthenticated(path: string = '/apps'): Promise<void> {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (data?.user) {
        redirect(path);
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
