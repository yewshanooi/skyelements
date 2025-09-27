import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skye",
  description: "The future of everything elements",
};

export default function Page() {
return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8">

      <div className="flex flex-col gap-4">
        <h1 className="scroll-m-20 text-4xl text-center font-semibold tracking-tight text-balance">
          Skye
        </h1>
        <p className="text-muted-foreground text-center text-l">
          The future of everything elements. Coming Soon.
        </p>
      </div>

    </main>
  );
}
