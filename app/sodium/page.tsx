import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { ExternalLink, FolderSync, ArrowDownToLine } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import CopyClient from "./copy-client";

export const metadata: Metadata = {
  title: "Sodium",
  description: "Open source discord bot with application commands and a user-friendly interface",
};

export default function SodiumPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8">

      <div className="flex flex-col gap-4">
        <div className="flex justify-center">
          <Image
            src="/logo/sodium.png"
            alt="Sodium Logo"
            width={165}
            height={55}
            className="h-16 w-auto"
          />
        </div>
        <p className="text-muted-foreground text-center text-l">
          Open source discord bot with application commands and a user-friendly interface.
        </p>
      </div>

      <div className="mt-8 flex w-full max-w-xl flex-col gap-6">
        <CopyClient />
      </div>

      <div className="mt-8">
        <Button asChild variant="secondary">
          <a href="https://github.com/yewshanooi/sodium/blob/main/README.md#guides" target="_blank">
            Get started <ExternalLink />
          </a>
        </Button>
      </div>

      <div className="text-muted-foreground text-sm mt-8 max-w-3xl">
        <p>*By clicking &quot;Get started&quot;, you agree to the <a href="https://github.com/yewshanooi/sodium/blob/main/LICENSE" target="_blank"><u>license</u></a></p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-24 w-full max-w-3xl">
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-6">
              <div className="p-1">
                <FolderSync className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <CardTitle>Up To Date</CardTitle>
                <CardDescription>
                  Latest library and dependencies¹
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-6">
              <div className="p-1">
                <ArrowDownToLine className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <CardTitle>Free To Use</CardTitle>
                <CardDescription>
                  Free to use, without hidden costs²
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
        <a href="https://deepmind.google/models/gemini/" target="_blank">
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-6">
                <Image
                  src="/icon/icons8-gemini-96.png"
                  alt="AI Chatbot Icon"
                  width={32}
                  height={32}
                />
                <div className="space-y-1.5">
                  <CardTitle>AI Chatbot</CardTitle>
                  <CardDescription>
                    Powered by Google Gemini³
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </a>
        <a href="https://huggingface.co/docs/transformers.js/index" target="_blank">
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-6">
                <Image
                  src="/icon/icons8-hugging-face-96.png"
                  alt="Text Summarizer Icon"
                  width={32}
                  height={32}
                />
                <div className="space-y-1.5">
                  <CardTitle>Text Summarizer</CardTitle>
                  <CardDescription>
                    Powered by Hugging Face Transformers⁴
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </a>
        <a href="https://www.mongodb.com/atlas" target="_blank">
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-6">
                <Image
                  src="/icon/icons8-leaf-96.png"
                  alt="Logs & Leaderboard Icon"
                  width={32}
                  height={32}
                />
                <div className="space-y-1.5">
                  <CardTitle>Logs & Leaderboard</CardTitle>
                  <CardDescription>
                    Stored using MongoDB Atlas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </a>
        <a href="https://lavalink.dev/" target="_blank">
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-6">
                <Image
                  src="/icon/icons8-lavalink-96.png"
                  alt="Music Streaming Icon"
                  width={32}
                  height={32}
                />
                <div className="space-y-1.5">
                  <CardTitle>Music Streaming</CardTitle>
                  <CardDescription>
                    Powered by Lavalink
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </a>
      </div>

      <div className="text-muted-foreground text-sm mt-24 mb-16 w-full max-w-3xl">
        <p>
          ¹ Based on discord.js&apos;s stable branch <a href="https://github.com/discordjs/discord.js/releases" target="_blank"><u>release</u></a> schedule.<br />
          ² No fees or subscriptions required. Users must abide by the <a href="https://github.com/yewshanooi/sodium/blob/main/LICENSE" target="_blank"><u>license</u></a> to modify or distribute the bot.<br />
          ³ Gemini is a large language model developed by Google DeepMind. It is the successor to LaMDA and PaLM 2.<br />
          ⁴ Transformers.js is an npm package developed by Hugging Face to run pre-trained machine learning models.
        </p>
      </div>

    </main>
  );
}
