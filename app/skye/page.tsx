import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { redirectIfNotAuthenticated } from "@/utils/redirectIfNotAuthenticated";
import { signout } from "../(auth)/actions";
import { PageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Skye",
  description: "An AI chatbot powered by Google Gemini models",
};

export default async function SkyePage() {
  await redirectIfNotAuthenticated();

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return <PageClient userEmail={data.user?.email ?? 'User'} signout={signout} />;
}
