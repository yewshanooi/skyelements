import type { Metadata } from "next";
import { redirectIfNotAuthenticated } from "@/utils/redirectIfNotAuthenticated";
import { PageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Skye",
  description: "An AI chatbot powered by Google Gemini models",
};

export default async function SkyePage() {
  await redirectIfNotAuthenticated();

  return <PageClient />;
}
