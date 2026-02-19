import type { Metadata } from "next";
import { redirectIfNotAuthenticated } from "@/utils/redirectIfNotAuthenticated";
import { PageClient } from "./page-client";
import { signout } from "../(auth)/actions"
import { createClient } from "@/utils/supabase/server"

export const metadata: Metadata = {
  title: "Lithium",
  description: "AI chatbot powered by OpenRouter and Google AI Studio models.",
};

export default async function Page() {
  await redirectIfNotAuthenticated();

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const userEmail = data.user?.email ?? "user@example.com";

  const user = {
    email: userEmail,
  };

  return <PageClient user={user} signout={signout} />
}
