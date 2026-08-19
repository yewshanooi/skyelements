import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { PageClient } from "./page-client";
import { signout } from "../(auth)/actions";
import { getUserProfile } from "./profile";
import { isThinkingEffort, THINKING_EFFORT_PREFERENCE_KEY } from "@/lib/models";
import { LithiumUnauthenticatedLanding } from "@/components/lithium/UnauthenticatedLanding";

export const metadata: Metadata = {
  title: "Lithium",
  description: "AI chatbot and note-taking app powered by Google AI Studio models.",
};

export default async function Page() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return <LithiumUnauthenticatedLanding />;
  }

  const user = getUserProfile(authUser);

  const storedEffort = (await cookies()).get(THINKING_EFFORT_PREFERENCE_KEY)?.value;
  const initialThinkingEffort = isThinkingEffort(storedEffort) ? storedEffort : null;

  return (
    <PageClient
      user={user}
      signout={signout}
      initialThinkingEffort={initialThinkingEffort}
    />
  );
}
