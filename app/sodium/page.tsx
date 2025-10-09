import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react"
import Image from "next/image";
import CopyClient from "./copy-client";

export const metadata: Metadata = {
  title: "Sodium",
  description: "Open source discord bot with application commands and a user-friendly interface",
};

export default function SodiumPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8">

      <div className="flex flex-col gap-4">
        <div className="flex justify-center">
          <Image
            src="/logo/sodium.png"
            alt="Sodium Logo"
            width={75}
            height={75}
            className="h-16 w-auto"
          />
        </div>
        <h1 className="scroll-m-20 text-4xl text-center font-semibold tracking-tight text-balance">
          Sodium
        </h1>
        <p className="text-muted-foreground text-center text-l">
          Open source discord bot with application commands and a user-friendly interface.
        </p>
      </div>

      <div className="mt-8 flex w-full max-w-xl flex-col gap-6">
        <CopyClient />
      </div>

      <div className="mt-8">
        <Button asChild variant="default">
          <a href="https://github.com/yewshanooi/sodium/blob/main/README.md#guides" target="_blank">
            Get started <ExternalLink />
          </a>
        </Button>
      </div>

    </main>
  );
}
