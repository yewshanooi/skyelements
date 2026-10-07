import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SkyeClient } from "./skye-client";
import { getUserProfile } from "@/lib/profile";
import { isThinkingEffort, THINKING_EFFORT_PREFERENCE_KEY } from "@/lib/models";

export const metadata: Metadata = {
  title: "Skye",
  description: "AI assistant for SkyElements with chat and reasoning.",
};

export default async function SkyePage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/?auth=login&redirectTo=/skye");
  }

  const user = getUserProfile(authUser);

  const storedEffort = (await cookies()).get(THINKING_EFFORT_PREFERENCE_KEY)?.value;
  const initialThinkingEffort = isThinkingEffort(storedEffort) ? storedEffort : null;

  return (
    <SkyeClient
      user={user}
      initialThinkingEffort={initialThinkingEffort}
    />
  );
}
