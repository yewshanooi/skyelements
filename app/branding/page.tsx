import type { Metadata } from "next";
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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

      <h2 className="mt-16 text-xl font-semibold text-center text-primary">
        Icons
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mt-6 w-full max-w-3xl">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">Green 1</CardTitle>
            <CardContent>
              <div className="flex justify-center items-center py-4">
                <Image
                  src="/logo/skyelements-green-1.png"
                  alt="SkyElements Green 1 Logo"
                  width={100}
                  height={100}
                  className="h-14 w-auto"
                />
              </div>
            </CardContent>
          </CardHeader>
        </Card>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">Green 2</CardTitle>
            <CardContent>
              <div className="flex justify-center items-center py-4">
                <Image
                  src="/logo/skyelements-green-2.png"
                  alt="SkyElements Green 2 Logo"
                  width={100}
                  height={100}
                  className="h-14 w-auto"
                />
              </div>
            </CardContent>
          </CardHeader>
        </Card>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">Monochrome 1</CardTitle>
            <CardContent>
              <div className="flex justify-center items-center py-4">
                <Image
                  src="/logo/skyelements-mono-1.png"
                  alt="SkyElements Monochrome 1 Logo"
                  width={100}
                  height={100}
                  className="h-14 w-auto"
                />
              </div>
            </CardContent>
          </CardHeader>
        </Card>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">Monochrome 2</CardTitle>
            <CardContent>
              <div className="flex justify-center items-center py-4">
                <Image
                  src="/logo/skyelements-mono-2.png"
                  alt="SkyElements Monochrome 2 Logo"
                  width={100}
                  height={100}
                  className="h-14 w-auto"
                />
              </div>
            </CardContent>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-center gap-4 mt-16 w-full max-w-3xl">
        {/* Logo Card */}
        <div className="flex-1 flex flex-col items-center mb-12">
          <h2 className="text-xl font-semibold text-center text-primary mb-6">Logo</h2>
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-center">SkyElements</CardTitle>
              <CardContent>
                <div className="flex justify-center items-center py-4">
                  <Image
                    src="/logo/skyelements.png"
                    alt="SkyElements Logo"
                    width={239}
                    height={55}
                    className="h-12 w-auto"
                    // priority
                  />
                </div>
              </CardContent>
            </CardHeader>
          </Card>
        </div>
        {/* Media Kit Card */}
        <div className="flex-1 flex flex-col items-center">
          <h2 className="text-xl font-semibold text-center text-primary mb-6">Media Kit</h2>
          <Card className="w-full max-w-sm">
            <CardContent className="mt-4 mb-3">
              <CardDescription className="text-center mb-4">
                Click here to download the latest media kit.
              </CardDescription>
              <div className="flex justify-center">
                <Button asChild variant="secondary">
                  <a href="/asset/SkyElements_Media_Kit.zip">
                    <Download /> Download
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
