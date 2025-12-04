import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator"
import { ExternalLink, FolderSync, ArrowDownToLine, Joystick, Wrench, ShieldUser, Music2 } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";
import Image from "next/image";
import CopyClient from "./copy-client";

export const metadata: Metadata = {
  title: "Sodium",
  description: "Multipurpose discord bot with application commands and a user-friendly interface",
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
          Multipurpose discord bot with application commands and a user-friendly interface.
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
            <div className="flex items-center gap-6 mt-2">
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
            <div className="flex items-center gap-6 mt-2">
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
                    Powered by Google Gemini³
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </a>
        <a href="https://huggingface.co/docs/transformers.js/v3.0.0/index" target="_blank">
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-6 mt-2">
                <Image
                  src="/icon/icons8-hugging-face-96.png"
                  alt="Hugging Face Logo"
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
        <a href="https://www.mongodb.com/products/platform" target="_blank">
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-6 mt-2">
                <Image
                  src="/icon/icons8-leaf-96.png"
                  alt="MongoDB Logo"
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
              <div className="flex items-center gap-6 mt-2">
                <Image
                  src="/icon/icons8-lavalink-96.png"
                  alt="Lavalink Logo"
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

      <div className="grid grid-cols-1 gap-4 mt-24 w-full max-w-3xl">
        <Card className="w-full px-2 py-8">
          <CardHeader>
            <CardTitle>
              <h2 className="text-xl font-semibold text-primary mb-2">Useful and detailed embeds</h2>
            </CardTitle>
            <CardDescription>
              <p className="text-base mb-4">
                Sodium replies to command requests with a meaningful message embed. Content is displayed in an organised manner with various text formatting. This will greatly enhance user&apos;s experience when viewing commands.
              </p>
              *Image simulated for illustrative purposes. Actual UI may be different.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Image
                src="/sodium/sodium-weather.png"
                alt="Sodium - Weather Embed"
                // 45% of original image size
                width={156.6}
                height={237.6}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="w-full px-2 py-8">
          <CardHeader>
            <CardTitle>
              <h2 className="text-xl font-semibold text-primary mb-2">Visit external links with ease</h2>
            </CardTitle>
            <CardDescription>
              <p className="text-base mb-4">
                Sodium uses buttons for commands that require users to view an external website. Additionally, links will be checked by Discord&apos;s built-in trust protection system to further protect users from malicious websites.
              </p>
              *Image simulated for illustrative purposes. Actual UI may be different.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Image
                src="/sodium/sodium-button.png"
                alt="Sodium - Command Button"
                // 45% of original image size
                width={261.45}
                height={31.5}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="w-full px-2 py-8">
          <CardHeader>
            <CardTitle>
              <h2 className="text-xl font-semibold text-primary mb-2">Seamless integration within channels</h2>
            </CardTitle>
            <CardDescription>
              <p className="text-base mb-4">
                Sodium commands are integrated within Discord channels. Commands can be requested using the slash ( / ) symbol in text channels. Furthermore, users can easily enter optional or required parameters in a text box.
              </p>
              *Image simulated for illustrative purposes. Actual UI may be different.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Image
                src="/sodium/sodium-menu.png"
                alt="Sodium - Command Menu"
                // 45% of original image size
                width={320.4}
                height={76.05}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="w-full px-2 py-8">
          <CardHeader>
            <CardTitle>
              <h2 className="text-xl font-semibold text-primary mb-2">AI-powered conversations</h2>
            </CardTitle>
            <CardDescription>
              <p className="text-base mb-4">
                Sodium uses Gemini 2.5 Flash, a new model for the agentic era, to provide an AI chatbot experience within Discord channels. Users may run the command in direct messages for additional privacy.
              </p>
              *Gemini may display inaccurate info, including about people, so double-check its responses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Image
                src="/sodium/sodium-gemini.png"
                alt="Sodium - Gemini Embed"
                // 45% of original image size
                width={414.9}
                height={411.75}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="w-full px-2 py-8">
          <CardHeader>
            <CardTitle>
              <h2 className="text-xl font-semibold text-primary mb-2">Built-in text summarization</h2>
            </CardTitle>
            <CardDescription>
              <p className="text-base mb-4">
                Sodium uses facebook/bart-large-cnn, a large model trained and fine-tuned on the CNN/Daily Mail dataset. User input data will be processed on-device rather than sent to a server, ensuring total confidentiality.
              </p>
              *Image simulated for illustrative purposes. Actual UI may be different.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Image
                src="/sodium/sodium-summarize.png"
                alt="Sodium - Summarize Embed"
                // 45% of original image size
                width={418.05}
                height={158.85}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="mt-24 text-xl font-semibold text-center text-primary">
        Featured Commands
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 w-full max-w-3xl">
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-6 mt-2">
              <Image
                src="/icon/icons8-youtube-96.png"
                alt="YouTube Logo"
                width={32}
                height={32}
              />
              <div className="space-y-1.5">
                <CardTitle>Watch Together</CardTitle>
                <CardDescription>
                  /youtube
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-6 mt-2">
              <Image
                src="/icon/icons8-spotify-96.png"
                alt="Spotify Logo"
                width={32}
                height={32}
              />
              <div className="space-y-1.5">
                <CardTitle>Now Playing</CardTitle>
                <CardDescription>
                  /spotify
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <h2 className="mt-24 text-xl font-semibold text-center text-primary">
        All Commands
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 w-full max-w-3xl">
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-6">
              <div className="p-1">
                <div className="flex items-center justify-center mb-4">
                  <Joystick className="h-6 w-6 mr-2" />
                  <CardTitle>Fun</CardTitle>
                </div>
                <CardDescription>
                  8ball, achievement, beep, coinflip, color, compliment, diceroll, fact <b>[cat | dog | general | useless]</b>, fortnite, giphy, grandarchive, hypixel, leagueoflegends, lyrics, meme, minecraft, mtg, nasa, neko, pokemon, rps, spotify, urban, word, wynncraft, youtube
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
                  <Wrench className="h-6 w-6 mr-2" />
                  <CardTitle>Utility</CardTitle>
                </div>
                <CardDescription>
                  afk, botpresence, botsetnick, calculator, crypto, dictionary, gemini, github, guildrename, help, info <b>[channel | client | guild | role | user]</b>, invite, leaderboard <b>[add | remove | reset | view]</b>, leave, message, mongodb <b>[initialize | delete]</b>, news, npm, ping, qrcode, say, summarize, thread, weather, wikipedia
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
                  <ShieldUser className="h-6 w-6 mr-2" />
                  <CardTitle>Moderation</CardTitle>
                </div>
                <CardDescription>
                  ban, channel <b>[delete | lock | rename | unlock]</b>, deafen, kick, logs <b>[add | remove | reset | view]</b>, purge, role <b>[add | remove]</b>, setnick, slowmode, timeout, unban, undeafen, untimeout, warn
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
                  <Music2 className="h-6 w-6 mr-2" />
                  <CardTitle>Music</CardTitle>
                </div>
                <CardDescription>
                  autoplay, filter, loop, nowplaying, pause, play, queue, resume, seek, shuffle, skip, stop, volume
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="text-muted-foreground text-sm mt-24 w-full max-w-3xl">
        <p>
          ¹ Based on discord.js&apos;s stable branch <a href="https://github.com/discordjs/discord.js/releases" target="_blank"><u>release</u></a> schedule.<br />
          ² No fees or subscriptions required. Users must abide by the <a href="https://github.com/yewshanooi/sodium/blob/main/LICENSE" target="_blank"><u>license</u></a> to modify or distribute the bot.<br />
          ³ Gemini is a large language model developed by Google DeepMind. It is the successor to LaMDA and PaLM 2.<br />
          ⁴ Transformers.js is an npm package developed by Hugging Face to run pre-trained machine learning models.
        </p>
      </div>

      <Separator className="mt-12 mb-12 max-w-3xl" />

      <div className="text-muted-foreground text-sm mb-6 w-full max-w-3xl">
        <div className="flex justify-center">
          <p className="text-center">
            &copy; SkyElements. All rights reserved.
          </p>
        </div>
      </div>

    </main>
  );
}
