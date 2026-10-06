import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExploreAppsButton } from "@/components/explore-apps-button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "SkyElements",
  description: "Home of everything elements",
};

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ auth?: string; redirectTo?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const auth = sp.auth;
  const redirectTo = sp.redirectTo;

  if (auth && (auth === "login" || auth === "signup" || auth === "forgot-password")) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const safeRedirect =
        redirectTo &&
        redirectTo.startsWith("/") &&
        !redirectTo.startsWith("//") &&
        !redirectTo.startsWith("/\\")
          ? redirectTo
          : null;

      if (safeRedirect && safeRedirect !== "/") {
        redirect(safeRedirect);
      } else {
        redirect("/");
      }
    }
  }
  return (
    <main className="flex flex-1 flex-col items-center justify-start p-8 pt-16 lg:pt-24">
      <div className="flex flex-col gap-4">
        <h1 className="scroll-m-20 text-3xl text-center font-semibold text-balance">
          Home of everything elements
        </h1>
        <p className="text-muted-foreground text-center text-l max-w-2xl">
          Explore mini apps to improve your productivity.
        </p>

        <div className="flex justify-center mt-4">
          <ExploreAppsButton />
        </div>
      </div>
    </main>
  );
}
