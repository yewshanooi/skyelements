import type { Metadata } from "next";
import { CommandsClient } from "./commands-client";

export const metadata: Metadata = {
  title: "Commands",
  description: "Preview commands from Sodium",
};

export default function CommandsPage() {
  return <CommandsClient />;
}
