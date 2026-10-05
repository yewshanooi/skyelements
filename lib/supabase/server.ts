import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Creates a server-side Supabase client supporting both Server Components
 * and Server Actions / Route Handlers with safe cookie management.
 */
export async function createClient(): Promise<SupabaseClient> {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch {
                        // In Server Components, cookie setting is restricted.
                        // Handled gracefully via middleware or action context.
                    }
                },
            },
        }
    );
}

/**
 * Alias for createClient to ensure full backwards compatibility with action callers.
 */
export const createActionClient = createClient;

/**
 * Helper to fetch both the Supabase server client and the authenticated user in one call.
 * Throws an error if the user is not authenticated.
 */
export async function getAuthenticatedClient(): Promise<{ supabase: SupabaseClient; user: User }> {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        throw new Error('Not authenticated');
    }

    return { supabase, user };
}
