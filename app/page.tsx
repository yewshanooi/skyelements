import type { Metadata } from "next";
import { ExploreAppsButton } from "@/components/explore-apps-button";

export const metadata: Metadata = {
  title: "SkyElements",
  description: "Home of everything elements",
};

export default async function Page() {
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
