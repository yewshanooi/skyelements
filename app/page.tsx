import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "SkyElements",
  description: "Home of everything elements",
};

export default function Page() {
return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8">

      <div className="flex flex-col gap-4">
        <div className="flex justify-center">
          <Image
            src="/logo/skyelements.png"
            alt="SkyElements Logo"
            width={239}
            height={55}
            className="h-16 w-auto"
          />
        </div>
        <p className="text-muted-foreground text-center text-l max-w-xl">
          Home of everything elements. Run open source projects on the web or your local device with just a few commands.
        </p>
      </div>

    </main>
  );
}
