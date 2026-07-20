import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirectIfNotAuthenticated } from "@/utils/redirectIfNotAuthenticated";
import { PageClient } from "./page-client";
import { signout } from "../(auth)/actions"
import { createClient } from "@/utils/supabase/server"
import { isThinkingEffort, THINKING_EFFORT_PREFERENCE_KEY } from "@/lib/models";

export const metadata: Metadata = {
  title: "Lithium",
  description: "AI chatbot powered by Google AI Studio models.",
};

export default async function Page() {
  await redirectIfNotAuthenticated();

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const userEmail = data.user?.email ?? "user@example.com";

  const user = {
    email: userEmail,
  };

  const storedEffort = (await cookies()).get(THINKING_EFFORT_PREFERENCE_KEY)?.value;
  const initialThinkingEffort = isThinkingEffort(storedEffort) ? storedEffort : null;

  return (
    <PageClient
      user={user}
      signout={signout}
      initialThinkingEffort={initialThinkingEffort}
    />
  )
}
