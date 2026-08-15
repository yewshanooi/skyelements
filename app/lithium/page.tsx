import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirectIfNotAuthenticated } from "@/utils/redirectIfNotAuthenticated";
import { PageClient } from "./page-client";
import { signout } from "../(auth)/actions"
import { getUserProfile } from "./profile"
import { isThinkingEffort, THINKING_EFFORT_PREFERENCE_KEY } from "@/lib/models";

export const metadata: Metadata = {
  title: "Lithium",
  description: "AI chatbot powered by Google AI Studio models.",
};

export default async function Page() {
  const authUser = await redirectIfNotAuthenticated();
  const user = getUserProfile(authUser);

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
