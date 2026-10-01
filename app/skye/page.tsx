import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Skye",
  description: "Skye Mini App",
};

export default async function SkyePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=login&redirectTo=/skye");
  }

  return <main className="flex-1 w-full h-full" />;
}
