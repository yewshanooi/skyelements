"use client";

import { useState } from 'react';
import type { FC } from 'react';
import { Check, Copy } from 'lucide-react';

interface AiMarkdownProps {
  content: string;
}

export const AiMarkdown: FC<AiMarkdownProps> = ({ content }) => {
  if (!content) return null;

  // Split lines to detect block elements like tables, code blocks, lists, headers
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Check for Code Block (```)
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const codeStr = codeLines.join('\n');
      elements.push(<CodeBlock key={`code-${i}`} code={codeStr} language={lang} />);
      continue;
    }

    // Check for Markdown Table (| ... |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(<MarkdownTable key={`table-${i}`} lines={tableLines} />);
      continue;
    }

    // Check for Blockquote (> ...)
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-3 border-blue-500/80 pl-3 py-1 my-2 bg-blue-50/40 dark:bg-blue-950/20 text-neutral-700 dark:text-neutral-300 text-[12.5px] italic rounded-r"
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx} className="leading-relaxed">
              {renderInlineMarkdown(ql)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Check for Headers (#, ##, ###)
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-[12.5px] font-bold text-neutral-900 dark:text-neutral-100 mt-3 mb-1.5 flex items-center gap-1.5">
          {renderInlineMarkdown(line.slice(4))}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-3.5 mb-1.5 pb-1 border-b border-neutral-200 dark:border-neutral-800">
          {renderInlineMarkdown(line.slice(3))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mt-4 mb-2 pb-1 border-b border-neutral-200 dark:border-neutral-800">
          {renderInlineMarkdown(line.slice(2))}
        </h2>
      );
      i++;
      continue;
    }

    // Check for Unordered List (- or *)
    if (/^(\s*)[-*]\s+/.test(line)) {
      const listItems: { indent: number; text: string }[] = [];
      while (i < lines.length && /^(\s*)[-*]\s+/.test(lines[i])) {
        const match = lines[i].match(/^(\s*)[-*]\s+(.*)$/);
        if (match) {
          listItems.push({ indent: match[1].length, text: match[2] });
        }
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-1.5 space-y-1 pl-4 text-[12.5px] text-neutral-700 dark:text-neutral-300 list-disc">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineMarkdown(item.text)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Check for Ordered List (1. 2. 3.)
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const match = lines[i].match(/^\s*\d+\.\s+(.*)$/);
        if (match) {
          listItems.push(match[1]);
        }
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-1.5 space-y-1 pl-4 text-[12.5px] text-neutral-700 dark:text-neutral-300 list-decimal">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Standard Paragraph / Empty Line
    if (!line.trim()) {
      elements.push(<div key={`spacer-${i}`} className="h-1.5" />);
    } else {
      elements.push(
        <p key={`p-${i}`} className="my-1 leading-relaxed text-[12.5px] text-neutral-800 dark:text-neutral-200">
          {renderInlineMarkdown(line)}
        </p>
      );
    }
    i++;
  }

  return <div className="space-y-1 leading-normal text-[12.5px] select-text">{elements}</div>;
};

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-2 rounded-lg border border-neutral-200 dark:border-neutral-700/80 bg-neutral-900 text-neutral-100 overflow-hidden font-mono text-[11px] shadow-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-800/80 border-b border-neutral-700/50 text-[10px] text-neutral-400">
        <span>{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
          title="Copy code"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto overflow-y-hidden leading-relaxed">{code}</pre>
    </div>
  );
}

function MarkdownTable({ lines }: { lines: string[] }) {
  if (lines.length < 2) return null;

  const parseRow = (rowStr: string): string[] => {
    return rowStr
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());
  };

  const headerRow = parseRow(lines[0]);
  const isSeparator = (r: string) => /^[|\s:-]+$/.test(r);
  const dataRows = lines.slice(1).filter((l) => !isSeparator(l)).map(parseRow);

  return (
    <div className="my-2.5 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700/70 shadow-2xs">
      <table className="w-full text-left text-[11px] border-collapse bg-white dark:bg-[#1f1f1f]">
        <thead>
          <tr className="bg-neutral-100/90 dark:bg-[#252525] border-b border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold">
            {headerRow.map((cell, idx) => (
              <th key={idx} className="px-2.5 py-1.5 whitespace-nowrap">
                {renderInlineMarkdown(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
          {dataRows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
            >
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-2.5 py-1.5 whitespace-nowrap">
                  {renderInlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Format inline bold, italic, inline code, and strikethrough
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Split by inline code, bold, strikethrough, and italic tokens without splitting numbers/commas
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline Code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-mono text-[10.5px] border border-neutral-200/60 dark:border-neutral-700/60"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-neutral-950 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return (
        <del key={index} className="line-through text-neutral-400 dark:text-neutral-500">
          {part.slice(2, -2)}
        </del>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-neutral-800 dark:text-neutral-300">
          {part.slice(1, -1)}
        </em>
      );
    }

    return part;
  });
}
