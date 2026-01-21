import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SupabaseClient } from "@supabase/supabase-js";

export async function createActionClient(): Promise<SupabaseClient> {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,

        {
            cookies: {
                getAll() {
                    return cookieStore.getAll().map(({name, value}) => ({name, value}));
                },

                setAll(cookies) {
                    cookies.forEach(({name, value, options}) => {
                        cookieStore.set(name, value, options);
                    });
                }
            }
        }

    );
}
