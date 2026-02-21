import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import Image from "next/image";
import {
  Card,
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
    <main className="flex min-h-screen flex-col items-center justify-start p-8 pt-16 lg:pt-24">

      <div className="flex flex-col gap-4">
        <h1 className="scroll-m-20 text-3xl text-center font-semibold text-balance">
          Home of everything elements
        </h1>
        <p className="text-muted-foreground text-center text-l max-w-2xl">
          Run open source projects with just a few commands.
        </p>
      </div>

      <div className="flex flex-col gap-4 mt-16 w-full max-w-3xl">
        <h2 className="text-xl font-semibold text-center text-primary mb-2">Projects</h2>
        
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full items-start">
            <Card className="w-full h-fit">
              <CardHeader>
                <CardTitle>
                  <div className="flex justify-center items-center">
                    <Image
                      src="/logo/sodium.png"
                      alt="Sodium Logo"
                      width={165}
                      height={55}
                      className="h-9 w-auto"
                      priority
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

            <Card className="w-full h-fit">
              <CardHeader>
                <CardTitle>
                  <div className="flex justify-center items-center">
                    <Image
                      src="/logo/lithium.png"
                      alt="Lithium Logo"
                      width={165}
                      height={55}
                      className="h-9 w-auto"
                      priority
                    />
                  </div>
                </CardTitle>

                <CardContent>
                  <CardDescription className="text-center mb-6">
                    AI chatbot powered by OpenRouter and Google AI Studio models.
                  </CardDescription>
                  <div className="flex justify-center">
                    <Button asChild variant="secondary">
                      <Link href="/lithium">
                        View more <ChevronRight/>
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </CardHeader>
            </Card>
          </div>
          
      </div>
    </main>
  );
}
