import type { Metadata } from "next";
import { Button } from "@/components/ui/button"
import { ChevronRight, ExternalLink } from "lucide-react"
import Image from "next/image";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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

      <div className="flex flex-col md:flex-row justify-center gap-4 mt-16 w-full max-w-3xl">
        {/* Projects Card */}
        <div className="flex-1 flex flex-col items-center mb-12">
          <h2 className="text-xl font-semibold text-center text-primary mb-6">Projects</h2>
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>
                <div className="flex justify-center items-center">
                  <Image
                    src="/logo/sodium.png"
                    alt="Sodium Logo"
                    width={165}
                    height={55}
                    className="h-12 w-auto"
                  />
                </div>
              </CardTitle>

              <CardContent>
                <CardDescription className="text-center mb-6">
                  Open source discord bot with application commands and a user-friendly interface.
                </CardDescription>
                <div className="flex justify-center">
                  <Button asChild variant="secondary">
                    <a href="/sodium">
                      View more <ChevronRight/>
                    </a>
                  </Button>
                </div>
              </CardContent>
            </CardHeader>
          </Card>
        </div>
        {/* News Card */}
        <div className="flex-1 flex flex-col items-center">
          <h2 className="text-xl font-semibold text-center text-primary mb-6">News</h2>
          <Card className="w-full max-w-sm">
            <CardHeader className="mt-3">
              <CardTitle>Sodium</CardTitle>
              <CardDescription>
                Even more music streaming features, npm scripts, updated workflow, and more!
              </CardDescription>
              <CardAction>
                <CardDescription>Discord Bot</CardDescription>
              </CardAction>
            </CardHeader>

            <CardContent>
              <div className="flex justify-center">
                <Button asChild variant="secondary">
                  <a href="https://github.com/yewshanooi/sodium/releases/" target="_blank">
                    View on GitHub <ExternalLink />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </main>
  );
}
