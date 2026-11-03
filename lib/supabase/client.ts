import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "./config";

export function createClient() {
    return createBrowserClient(
        getSupabaseUrl(),
        getSupabasePublishableKey(),
    );
}
