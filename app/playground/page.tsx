import type { Metadata } from "next";
import { PlaygroundClient } from "./playground-client";

export const metadata: Metadata = {
  title: "Playground",
  description: "Page to test shadcn UI components. For internal use only",
};

export default function PlaygroundPage() {
  return <PlaygroundClient />;
}
