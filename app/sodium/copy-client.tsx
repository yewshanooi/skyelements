"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
} from "@/components/ui/item";
import { Copy } from "lucide-react";

export default function CopyClient() {
  const [copied, setCopied] = useState(false);
  const repoUrl = "git clone https://github.com/yewshanooi/sodium.git";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(repoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemDescription>
          <code className="block bg-muted rounded-sm px-2 py-1 overflow-x-auto break-all max-w-full">
            git clone https://github.com/yewshanooi/sodium.git
          </code>
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button 
          onClick={handleCopy}
          variant="secondary"
          className="cursor-pointer disabled:cursor-not-allowed"
        >
          {!copied && <Copy />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </ItemActions>
    </Item>
  );
}
