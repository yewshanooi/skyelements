import type { Metadata } from "next";
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/server";
import { redirectIfNotAuthenticated } from "@/utils/redirectIfNotAuthenticated";
import { signout } from "../(auth)/actions";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "User dashboard for SkyElements",
};

export default async function DashboardPage() {
  await redirectIfNotAuthenticated();

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8">

      <div className="flex flex-col gap-4">
        <h1 className="scroll-m-20 text-4xl text-center font-semibold text-balance">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-center text-l">
          Welcome, {data.user?.email ?? 'User'}!
        </p>
        <div className="text-center mt-10">
          <form action={signout}>
            <Button type="submit" className="cursor-pointer disabled:cursor-not-allowed">
                Sign Out
            </Button>
          </form>
        </div>
      </div>

    </main>
  );
}
