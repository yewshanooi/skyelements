import type { Metadata } from "next";
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/server";
import { redirectIfNotAuthenticated } from "@/utils/redirectIfNotAuthenticated";
import { signout } from "../(auth)/actions";
import { ChatInterface } from "./chat-interface";

export const metadata: Metadata = {
  title: "Skye",
  description: "An AI assistant by SkyElements",
};

export default async function SkyePage() {
  await redirectIfNotAuthenticated();

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8">

      <div className="flex flex-row items-center justify-between gap-8 w-full max-w-3xl">
        <h1 className="scroll-m-20 text-3xl font-semibold text-balance flex items-center gap-2">
          Skye
          <Badge variant="secondary">Beta</Badge>
        </h1>
        
        <form action={signout}>
          <Button type="submit" className="cursor-pointer disabled:cursor-not-allowed">
              Sign Out
          </Button>
        </form>
      </div>

      <ChatInterface userEmail={data.user?.email ?? 'User'} />

      {/* <div className="text-muted-foreground text-sm mt-4 max-w-3xl">
        <p>Skye can make mistakes, so double-check it</p>
      </div> */}

    </main>
  );
}
