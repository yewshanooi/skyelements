import type { Metadata } from "next";
import { ExternalLink } from "lucide-react"
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
    <main className="flex min-h-screen flex-col items-center justify-start p-8 pt-16 lg:pt-24">

      <div className="flex flex-col gap-4">
        <h1 className="scroll-m-20 text-3xl text-center font-semibold text-balance">
          Credits
        </h1>
        <p className="text-muted-foreground text-center text-l max-w-3xl">
          List of services used to build our website.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-16 w-full max-w-3xl">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Cloudflare</CardTitle>
            <CardDescription>
              Turnstile CAPTCHA — Skye
            </CardDescription>
            <CardAction>
              <Button asChild variant="secondary">
                <a href="https://www.cloudflare.com/application-services/products/turnstile/" target="_blank">
                  <ExternalLink />
                </a>
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Google AI Studio</CardTitle>
            <CardDescription>
              Gemini API — Skye
            </CardDescription>
            <CardAction>
              <Button asChild variant="secondary">
                <a href="https://aistudio.google.com/" target="_blank">
                  <ExternalLink />
                </a>
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Google Fonts</CardTitle>
            <CardDescription>
              Geist & Geist Mono font family
            </CardDescription>
            <CardAction>
              <Button asChild variant="secondary">
                <a href="https://fonts.google.com/?query=Geist" target="_blank">
                  <ExternalLink />
                </a>
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Icons8</CardTitle>
            <CardDescription>
              Icons — Sodium
            </CardDescription>
            <CardAction>
              <Button asChild variant="secondary">
                <a href="https://icons8.com/" target="_blank">
                  <ExternalLink />
                </a>
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Lucide</CardTitle>
            <CardDescription>
              Icons — SkyElements, Sodium
            </CardDescription>
            <CardAction>
              <Button asChild variant="secondary">
                <a href="https://lucide.dev/" target="_blank">
                  <ExternalLink />
                </a>
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Next.js</CardTitle>
            <CardDescription>
              Web development framework
            </CardDescription>
            <CardAction>
              <Button asChild variant="secondary">
                <a href="https://nextjs.org/" target="_blank">
                  <ExternalLink />
                </a>
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>OpenRouter</CardTitle>
            <CardDescription>
             AI models API — Skye
            </CardDescription>
            <CardAction>
              <Button asChild variant="secondary">
                <a href="https://openrouter.ai/" target="_blank">
                  <ExternalLink />
                </a>
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>shadcn</CardTitle>
            <CardDescription>
              UI component library
            </CardDescription>
            <CardAction>
              <Button asChild variant="secondary">
                <a href="https://ui.shadcn.com/" target="_blank">
                  <ExternalLink />
                </a>
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Supabase</CardTitle>
            <CardDescription>
              Auth — Skye
            </CardDescription>
            <CardAction>
              <Button asChild variant="secondary">
                <a href="https://supabase.com/auth" target="_blank">
                  <ExternalLink />
                </a>
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Vercel</CardTitle>
            <CardDescription>
              Web hosting & CDN
            </CardDescription>
            <CardAction>
              <Button asChild variant="secondary">
                <a href="https://vercel.com/" target="_blank">
                  <ExternalLink />
                </a>
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      </div>

    </main>
  );
}
