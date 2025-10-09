import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SkyElements",
  description: "Home of everything elements",
};

export default function Page() {
return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8">

      <div className="flex flex-col gap-4">
        <h1 className="scroll-m-20 text-4xl text-center font-semibold tracking-tight text-balance">
          SkyElements
        </h1>
        <p className="text-muted-foreground text-center text-l max-w-xl">
          Home of everything elements. Run open source projects on the web or your local device with just a few commands.
        </p>
      </div>

    </main>
  );
}
