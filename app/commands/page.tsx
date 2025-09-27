import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commands",
  description: "Preview commands from Sodium",
};

export default function CommandsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8">

      <div className="flex flex-col gap-4">
        <h1 className="scroll-m-20 text-4xl text-center font-semibold tracking-tight text-balance">
          Commands
        </h1>
        <p className="text-muted-foreground text-center text-l">
          Preview commands from Sodium.
        </p>
      </div>

    </main>
  );
}
