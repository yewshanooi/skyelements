'use client';

import { Bold, Italic, Strikethrough, MousePointer, Download, Copy, Clipboard, Trash2, Share, Type, BarChart3 } from "lucide-react"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu"
import { useRef } from 'react'

export function PlaygroundClient() {
  const editorRef = useRef<HTMLDivElement>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const editor = editorRef.current;
      if (editor) {
        const selection = window.getSelection();
        if (selection) {
          const range = selection.getRangeAt(0);
          const textNode = document.createTextNode(text);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.collapse(true);
          handleInput();
        }
      }
    } catch (err) {
      console.error('Failed to paste: ', err);
    }
  };

  const selectAllText = () => {
    const editor = editorRef.current;
    if (editor) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  const clearEditor = () => {
    const editor = editorRef.current;
    if (editor) {
      editor.innerHTML = '';
      editor.setAttribute('data-empty', 'true');
    }
  };

  const downloadText = () => {
    const editor = editorRef.current;
    if (editor && editor.textContent) {
      const blob = new Blob([editor.textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'editor-content.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getSelectedText = () => {
    const selection = window.getSelection();
    return selection?.toString() || '';
  };

  const handleInput = () => {
    const editor = editorRef.current;
    if (editor) {
      // Update the data-placeholder attribute based on content
      const isEmpty = editor.textContent?.trim() === '';
      if (isEmpty) {
        editor.setAttribute('data-empty', 'true');
      } else {
        editor.removeAttribute('data-empty');
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    const editor = editorRef.current;
    if (!editor) return;

    // Get the plain text from clipboard
    const text = e.clipboardData.getData('text/plain');
    
    if (text) {
      // Insert plain text at cursor position using modern approach
      const selection = window.getSelection();
      if (selection) {
        if (!selection.isCollapsed) {
          // If text is selected, delete it first
          const range = selection.getRangeAt(0);
          range.deleteContents();
        }
        
        // Create a text node and insert it
        const textNode = document.createTextNode(text);
        const range = selection.getRangeAt(0);
        range.insertNode(textNode);
        
        // Move cursor to end of inserted text
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Update our state
      handleInput();
    }
  };

  const normalizeFormatting = () => {
    const editor = editorRef.current;
    if (!editor) return;

    // Remove nested duplicates of the same formatting elements
    const removeNestedDuplicates = (element: Element) => {
      const tagName = element.tagName;
      
      // Find nested elements with the same tag
      const nestedSame = element.querySelectorAll(tagName.toLowerCase());
      
      nestedSame.forEach(nested => {
        if (nested !== element && element.contains(nested)) {
          // Unwrap the nested element
          const parent = nested.parentElement;
          if (parent) {
            while (nested.firstChild) {
              parent.insertBefore(nested.firstChild, nested);
            }
            parent.removeChild(nested);
          }
        }
      });
    };

    // Process all formatting elements
    const formattingElements = editor.querySelectorAll('strong, em, del');
    formattingElements.forEach(removeNestedDuplicates);
    
    // Normalize text nodes
    editor.normalize();
  };

  const insertFormattedText = (format: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    // Check if there's a text selection
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return; // Do nothing if no text is selected
    }

    editor.focus();
    
    // Get the selected range
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (!selectedText) return;

    // Determine the tag we want to work with
    let targetTag: string;
    switch (format) {
      case 'bold':
        targetTag = 'STRONG';
        break;
      case 'italic':
        targetTag = 'EM';
        break;
      case 'strikethrough':
        targetTag = 'DEL';
        break;
      default:
        return;
    }

    // Find all elements that contain the selection
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;
    
    // Find all target elements that intersect with the selection
    const targetElements: Element[] = [];
    
    // Helper function to find target elements in the selection
    const findTargetElements = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.tagName === targetTag) {
          targetElements.push(element);
        }
      }
      // Check parent elements up to the editor
      let parent = node.parentElement;
      while (parent && parent !== editor) {
        if (parent.tagName === targetTag) {
          if (!targetElements.includes(parent)) {
            targetElements.push(parent);
          }
        }
        parent = parent.parentElement;
      }
    };

    // Check both start and end containers
    findTargetElements(startContainer);
    if (startContainer !== endContainer) {
      findTargetElements(endContainer);
    }

    if (targetElements.length > 0) {
      // Remove formatting - unwrap all found target elements
      targetElements.forEach(element => {
        const parent = element.parentElement;
        if (parent) {
          // Move all children out of the formatting element
          const fragment = document.createDocumentFragment();
          while (element.firstChild) {
            fragment.appendChild(element.firstChild);
          }
          parent.replaceChild(fragment, element);
        }
      });
      
      // Normalize the content to merge adjacent text nodes
      editor.normalize();
      
      // Clean up any nested duplicate formatting
      normalizeFormatting();
    } else {
      // Apply formatting by wrapping the selection
      try {
        const formattingElement = document.createElement(targetTag.toLowerCase());
        
        // Extract and wrap the selected content
        const contents = range.extractContents();
        formattingElement.appendChild(contents);
        range.insertNode(formattingElement);
        
        // Clear the selection and place cursor after the formatted text
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.setStartAfter(formattingElement);
        newRange.collapse(true);
        selection.addRange(newRange);
        
        // Clean up any nested duplicate formatting
        normalizeFormatting();
      } catch (error) {
        console.error('Error applying formatting:', error);
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8">
      <style dangerouslySetInnerHTML={{
        __html: `
          [contenteditable][data-empty="true"]:before {
            content: "Type your message here.";
            color: #79716b;
            pointer-events: none;
          }
        `
      }} />

      <div className="flex flex-col gap-4">
        <h1 className="scroll-m-20 text-4xl text-center font-semibold tracking-tight text-balance">
          Playground
        </h1>
        <p className="text-muted-foreground text-center text-l">
          Page to test shadcn UI components. For internal use only.
        </p>
      </div>

      <div className="mt-16 w-full max-w-3xl">
        <div className="flex flex-col gap-4">
          <ToggleGroup 
            variant="outline" 
            type="multiple" 
            className="justify-start"
          >
            <ToggleGroupItem 
              value="bold" 
              aria-label="Toggle bold"
              onClick={() => insertFormattedText('bold')}
            >
              <Bold className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="italic" 
              aria-label="Toggle italic"
              onClick={() => insertFormattedText('italic')}
            >
              <Italic className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="strikethrough" 
              aria-label="Toggle strikethrough"
              onClick={() => insertFormattedText('strikethrough')}
            >
              <Strikethrough className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onPaste={handlePaste}
                data-empty="true"
                className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y overflow-auto"
                style={{ 
                  minHeight: '100px',
                }}
                suppressContentEditableWarning={true}
              />
            </ContextMenuTrigger>
            <ContextMenuContent className="w-42">
              <ContextMenuItem onClick={() => copyToClipboard(getSelectedText() || editorRef.current?.textContent || '')}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Text
              </ContextMenuItem>
              <ContextMenuItem onClick={pasteFromClipboard}>
                <Clipboard className="mr-2 h-4 w-4" />
                Paste
              </ContextMenuItem>
              <ContextMenuItem onClick={selectAllText}>
                <MousePointer className="mr-2 h-4 w-4" />
                Select All
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Share className="mr-4 h-4 w-4" />
                  Export
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-42">
                  <ContextMenuItem onClick={downloadText}>
                    <Download className="mr-2 h-4 w-4" />
                    Download as TXT
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => copyToClipboard(editorRef.current?.innerHTML || '')}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy HTML
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => {
                    const text = editorRef.current?.textContent || '';
                    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
                    alert(`Word count: ${wordCount}\nCharacter count: ${text.length}`);
                  }}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Word Count
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => {
                const text = editorRef.current?.textContent || '';
                const upperCaseText = text.toUpperCase();
                if (editorRef.current) {
                  editorRef.current.textContent = upperCaseText;
                  handleInput();
                }
              }}>
                <Type className="mr-2 h-4 w-4" />
                To Uppercase
              </ContextMenuItem>
              <ContextMenuItem onClick={() => {
                const text = editorRef.current?.textContent || '';
                const lowerCaseText = text.toLowerCase();
                if (editorRef.current) {
                  editorRef.current.textContent = lowerCaseText;
                  handleInput();
                }
              }}>
                <Type className="mr-2 h-4 w-4" />
                To Lowercase
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={clearEditor} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>

      <div className="mt-16 w-full max-w-3xl">
        <div className="p-4 rounded-md border bg-muted/50">
          <p className="text-sm text-muted-foreground">
            Changelog:
          </p>
          <ul className="text-sm text-muted-foreground mt-4 space-y-1">
            <li>1. Implemented a custom <b>Text Area</b> and <b>Toggle Group</b>. Use the toggle group to style text within the text area.</li>
            <li>2. Implemented <b>Context Menu</b>. Right click within the text area to open the context menu.</li>
          </ul>
        </div>
      </div>

    </main>
  );
}