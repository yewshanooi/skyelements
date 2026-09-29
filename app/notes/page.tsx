import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PageClient } from "./page-client";
import { signout } from "../(auth)/actions";
import { getUserProfile } from "./profile";
import { isThinkingEffort, THINKING_EFFORT_PREFERENCE_KEY } from "@/lib/models";

export const metadata: Metadata = {
  title: "Notes",
  description: "AI-powered note-taking app with multi-turn reasoning and rich markdown editor.",
};

export default async function NotesPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login?redirectTo=/notes");
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
