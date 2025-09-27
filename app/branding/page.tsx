import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Branding",
  description: "Our icons, logo, and media kit",
};

export default function BrandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8">

      <div className="flex flex-col gap-4">
        <h1 className="scroll-m-20 text-4xl text-center font-semibold tracking-tight text-balance">
          Branding
        </h1>
        <p className="text-muted-foreground text-center text-l">
          Our icons, logo, and media kit.
        </p>
      </div>

    </main>
  );
}
