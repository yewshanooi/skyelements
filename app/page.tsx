import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

export default async function Page() {
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
        <p className="text-muted-foreground text-center text-l max-w-2xl">
          Home of everything elements. Run open source projects with just a few commands.
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
                Multipurpose discord bot with application commands and a user-friendly interface.
              </CardDescription>
              <div className="flex justify-center">
                <Button asChild variant="secondary">
                  <Link href="/sodium">
                    View more <ChevronRight/>
                  </Link>
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
          <CardHeader className="mt-5 mb-3">
            <CardTitle>Skye</CardTitle>
            <CardDescription>
              An AI chatbot powered by Google AI Studio & OpenRouter. Try it out now.
            </CardDescription>
            <CardAction>
              <CardDescription>
                <Badge variant="outline">Beta</Badge>
              </CardDescription>
            </CardAction>
          </CardHeader>

            <CardContent>
              <div className="flex justify-center">
                <Button asChild variant="secondary">
                  <Link href="/skye">
                    View more <ChevronRight/>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </main>
  );
}
