"use client";

import { useState } from "react";
import type { FC } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart3,
  Table2,
  LayoutGrid,
  MapPin,
  FileText,
  Calendar,
  Lock,
} from "lucide-react";
import { NavigationBar } from "@/components/navigation-bar";
import { AuthDialog } from "@/components/auth/AuthDialog";

interface UnauthenticatedLandingProps {
  onOpenAuth?: (mode?: "login" | "signup") => void;
}

export const UnauthenticatedLanding: FC<UnauthenticatedLandingProps> = ({ onOpenAuth }) => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const handleOpenAuth = (mode: "login" | "signup" = "login") => {
    if (onOpenAuth) {
      onOpenAuth(mode);
    } else {
      setAuthMode(mode);
      setIsAuthOpen(true);
    }
  };
  return (
    <>
      <NavigationBar forceShow />

      <main className="flex min-h-screen flex-col items-center justify-start p-8 pt-16 lg:pt-24">
        {/* Header / Hero */}
        <div className="flex flex-col gap-4">
          <h1 className="scroll-m-20 text-3xl text-center font-semibold text-balance">
            Sales Dashboard
          </h1>
          <p className="text-muted-foreground text-center text-base sm:text-lg max-w-3xl">
            Manage sales, track revenue analytics, and organize orders across multiple channels.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8">
          <Button variant="secondary" onClick={() => handleOpenAuth("login")}>
            Get started
          </Button>
        </div>

        {/* Disclaimer */}
        <div className="text-muted-foreground text-xs mt-8 max-w-3xl text-center">
          <p>
            *By clicking &quot;Get started&quot;, you agree to our{" "}
            <Link href="/policies" className="underline underline-offset-4 hover:text-foreground">
              <u>policies</u>
            </Link>
          </p>
        </div>

        {/* Highlights / Integrations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-24 w-full max-w-3xl">
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-6 mt-2">
                <div className="p-1">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <CardTitle>Visual Analytics</CardTitle>
                  <CardDescription>
                    Profit, margin trends, and more
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-6 mt-2">
                <div className="p-1">
                  <LayoutGrid className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <CardTitle>Multi-Channel</CardTitle>
                  <CardDescription>
                    Supports multi platform sales
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <a href="https://deepmind.google/models/gemini/" target="_blank" rel="noopener noreferrer">
            <Card className="w-full">
              <CardHeader>
                <div className="flex items-center gap-6 mt-2">
                  <Image
                    src="/icon/icons8-gemini-96.png"
                    alt="Google Gemini Logo"
                    width={32}
                    height={32}
                  />
                  <div className="space-y-1.5">
                    <CardTitle>AI Assistant</CardTitle>
                    <CardDescription>
                      Powered by Google Gemini¹
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </a>

            <Card className="w-full">
                <CardHeader>
                <div className="flex items-center gap-6 mt-2">
                    <div className="p-1">
                    <Lock className="h-6 w-6" />
                    </div>
                    <div className="space-y-1.5">
                    <CardTitle>Private & Secure</CardTitle>
                    <CardDescription>
                        Powered by Supabase Auth
                    </CardDescription>
                    </div>
                </div>
                </CardHeader>
            </Card>
        </div>

        {/* Key Features Section */}
        <h2 className="mt-24 text-xl font-semibold text-center text-primary">
          Key Features
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 w-full max-w-3xl">
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-6">
                <div className="p-1">
                  <div className="flex items-center justify-center mb-4">
                    <Table2 className="h-6 w-6 mr-2" />
                    <CardTitle>Table View</CardTitle>
                  </div>
                  <CardDescription>
                    Interactive spreadsheet with inline cell editing, multi-column filtering, and batch deletes.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-6">
                <div className="p-1">
                  <div className="flex items-center justify-center mb-4">
                    <LayoutGrid className="h-6 w-6 mr-2" />
                    <CardTitle>Kanban Board</CardTitle>
                  </div>
                  <CardDescription>
                    Drag-and-drop to organize sales across marketplaces including Shopee and Carousell.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-6">
                <div className="p-1">
                  <div className="flex items-center justify-center mb-4">
                    <BarChart3 className="h-6 w-6 mr-2" />
                    <CardTitle>Analytics</CardTitle>
                  </div>
                  <CardDescription>
                    Comprehensive summaries, revenue trends, monthly breakdowns, and margin insights.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-6">
                <div className="p-1">
                  <div className="flex items-center justify-center mb-4">
                    <MapPin className="h-6 w-6 mr-2" />
                    <CardTitle>Map View</CardTitle>
                  </div>
                  <CardDescription>
                    Geographic order pins, coordinate resolution, and delivery heatmaps.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-6">
                <div className="p-1">
                  <div className="flex items-center justify-center mb-4">
                    <Calendar className="h-6 w-6 mr-2" />
                    <CardTitle>Timeline View</CardTitle>
                  </div>
                  <CardDescription>
                    Chronological activity feed displaying real-time order progression and updates.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-6">
                <div className="p-1">
                  <div className="flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 mr-2" />
                    <CardTitle>Invoices</CardTitle>
                  </div>
                  <CardDescription>
                    Securely upload, store, and preview sales invoice PDFs and receipts.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Footnotes */}
        <div className="text-muted-foreground text-sm mt-24 w-full max-w-3xl">
          <p>
            ¹ AI Assistant helps query sales summaries, extract details, and perform operations with natural language.
          </p>
        </div>

        <Separator className="mt-12 mb-12 max-w-3xl" />

        {/* Footer */}
        <div className="text-muted-foreground text-sm mb-6 w-full max-w-3xl">
          <div className="flex justify-center">
            <p className="text-center">
              &copy; SkyElements. All rights reserved.
            </p>
          </div>
        </div>
      </main>

      {!onOpenAuth && (
        <AuthDialog
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          defaultMode={authMode}
          redirectTo="/sales"
        />
      )}
    </>
  );
};
