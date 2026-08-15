import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirectIfNotAuthenticated } from "@/utils/redirectIfNotAuthenticated";
import { redirect } from "next/navigation";
import { PageClient } from "./page-client";
import { signout } from "../(auth)/actions"
import { createClient } from "@/utils/supabase/server"
import { getUserProfile } from "./profile"
import { isThinkingEffort, THINKING_EFFORT_PREFERENCE_KEY } from "@/lib/models";

export const metadata: Metadata = {
  title: "Lithium",
  description: "AI chatbot powered by Google AI Studio models.",
};

export default async function Page() {
  await redirectIfNotAuthenticated();

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');
  const user = getUserProfile(data.user);

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
