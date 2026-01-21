import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { User } from "@supabase/supabase-js";

export async function redirectIfNotAuthenticated(path: string = '/login'): Promise<User> {
    const supabase = await createClient();

    const { data } = await supabase.auth.getUser();

    if (!data?.user) {
        redirect(path);
    }

    return data.user;
}
