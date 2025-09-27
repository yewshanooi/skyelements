import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sodium",
  description: "Open source discord bot with application commands and a user-friendly interface",
};

export default function SodiumPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8">

      <div className="flex flex-col gap-4">
        <h1 className="scroll-m-20 text-4xl text-center font-semibold tracking-tight text-balance">
          Sodium
        </h1>
        <p className="text-muted-foreground text-center text-l">
          Open source discord bot with application commands and a user-friendly interface.
        </p>
      </div>

    </main>
  );
}
