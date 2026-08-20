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
  BrainCircuit,
  FileText,
  Paperclip,
  Sliders,
  ShieldCheck,
  Pin,
  FolderSync,
  Lock,
} from "lucide-react";
import { NavigationBar } from "@/components/navigation-bar";
import { AuthDialog } from "@/components/auth/AuthDialog";

export const LithiumUnauthenticatedLanding: FC = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const openAuth = (mode: "login" | "signup" = "login") => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  return (
    <>
      <NavigationBar forceShow />

      <main className="flex min-h-screen flex-col items-center justify-start p-8 pt-16 lg:pt-24">
        {/* Header / Hero */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-center">
            <Image
              src="/logo/lithium.png"
              alt="Lithium Logo"
              width={165}
              height={55}
              className="h-14 w-auto"
              priority
            />
          </div>
          <p className="text-muted-foreground text-center text-l max-w-3xl">
            AI-powered note-taking app with multi-turn reasoning and customizable thinking depth.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8">
          <Button variant="secondary" onClick={() => openAuth("login")}>
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
                  <BrainCircuit className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <CardTitle>Thinking Effort</CardTitle>
                  <CardDescription>
                    Tunable reasoning depth¹
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-6 mt-2">
                <div className="p-1">
                  <FolderSync className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <CardTitle>Cloud Sync</CardTitle>
                  <CardDescription>
                    Real-time sync across devices
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
                    <CardTitle>AI Chatbot</CardTitle>
                    <CardDescription>
                      Powered by Google Gemini²
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
                    <BrainCircuit className="h-6 w-6 mr-2" />
                    <CardTitle>Deep Reasoning</CardTitle>
                  </div>
                  <CardDescription>
                    Multi-turn chat conversations, contextual document analysis, and problem solving.
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
                    <CardTitle>Rich Notes</CardTitle>
                  </div>
                  <CardDescription>
                    Distraction-free Markdown editor, structured headers, and syntax highlighting.
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
                    <Paperclip className="h-6 w-6 mr-2" />
                    <CardTitle>Attachments</CardTitle>
                  </div>
                  <CardDescription>
                    Attach images, PDFs, CSV spreadsheets, and code files directly to your chats and notes.
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
                    <Sliders className="h-6 w-6 mr-2" />
                    <CardTitle>Customization</CardTitle>
                  </div>
                  <CardDescription>
                    Tailor custom AI personas and system instructions to fit your workflows and domains.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Footnotes */}
        <div className="text-muted-foreground text-sm mt-24 w-full max-w-3xl">
          <p>
            ¹ Thinking effort is supported by Gemini 3+ models.<br />
            ² Gemini is a family of multimodal large language models developed by Google DeepMind.<br />
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

      {/* Auth Dialog */}
      <AuthDialog
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultMode={authMode}
        redirectTo="/lithium"
      />
    </>
  );
};
