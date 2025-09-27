import type { Metadata } from "next";
import { ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Credits",
  description: "List of services used to build our website",
};

export default function CreditsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8">

      <div className="flex flex-col gap-4">
        <h1 className="scroll-m-20 text-4xl text-center font-semibold tracking-tight text-balance">
          Credits
        </h1>
        <p className="text-muted-foreground text-center text-l">
          List of services used to build our website.
        </p>
      </div>

      <Card className="w-full max-w-sm mt-16">
        <CardHeader>
          <CardTitle>Google Fonts</CardTitle>
          <CardDescription>
            Geist & Geist Mono font family
          </CardDescription>
          <CardAction>
            <a href="https://fonts.google.com/?query=Geist" target="_blank">
              <Button variant="secondary" size="icon" className="size-8">
                <ChevronRightIcon />
              </Button>
            </a>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="w-full max-w-sm mt-4">
        <CardHeader>
          <CardTitle>Icons8</CardTitle>
          <CardDescription>
            Icons — Sodium
          </CardDescription>
          <CardAction>
            <a href="https://icons8.com/" target="_blank">
              <Button variant="secondary" size="icon" className="size-8">
                <ChevronRightIcon />
              </Button>
            </a>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="w-full max-w-sm mt-4">
        <CardHeader>
          <CardTitle>Lucide</CardTitle>
          <CardDescription>
            Icons — Skye
          </CardDescription>
          <CardAction>
            <a href="https://lucide.dev/" target="_blank">
              <Button variant="secondary" size="icon" className="size-8">
                <ChevronRightIcon />
              </Button>
            </a>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="w-full max-w-sm mt-4">
        <CardHeader>
          <CardTitle>Next.js</CardTitle>
          <CardDescription>
            Web development framework
          </CardDescription>
          <CardAction>
            <a href="https://nextjs.org/" target="_blank">
              <Button variant="secondary" size="icon" className="size-8">
                <ChevronRightIcon />
              </Button>
            </a>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="w-full max-w-sm mt-4">
        <CardHeader>
          <CardTitle>shadcn</CardTitle>
          <CardDescription>
            UI component library
          </CardDescription>
          <CardAction>
            <a href="https://ui.shadcn.com/" target="_blank">
              <Button variant="secondary" size="icon" className="size-8">
                <ChevronRightIcon />
              </Button>
            </a>
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="w-full max-w-sm mt-4">
        <CardHeader>
          <CardTitle>Vercel</CardTitle>
          <CardDescription>
            Web hosting & CDN
          </CardDescription>
          <CardAction>
            <a href="https://vercel.com/" target="_blank">
              <Button variant="secondary" size="icon" className="size-8">
                <ChevronRightIcon />
              </Button>
            </a>
          </CardAction>
        </CardHeader>
      </Card>

    </main>
  );
}
