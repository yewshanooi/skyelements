import { useMemo, useState } from "react"
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { TablePlugin } from "@lexical/react/LexicalTablePlugin"

import { ContentEditable } from "@/components/editor/editor-ui/content-editable"
import { AutoLinkPlugin } from "@/components/editor/plugins/auto-link-plugin"
import { CodeHighlightPlugin } from "@/components/editor/plugins/code-highlight-plugin"
import { ComponentPickerMenuPlugin } from "@/components/editor/plugins/component-picker-menu-plugin"
import { DraggableBlockPlugin } from "@/components/editor/plugins/draggable-block-plugin"
import { AutoEmbedPlugin } from "@/components/editor/plugins/embeds/auto-embed-plugin"
import { YouTubePlugin } from "@/components/editor/plugins/embeds/youtube-plugin"
import { FloatingLinkEditorPlugin } from "@/components/editor/plugins/floating-link-editor-plugin"
import { FloatingTextFormatToolbarPlugin } from "@/components/editor/plugins/floating-text-format-plugin"
import { ImagesPlugin } from "@/components/editor/plugins/images-plugin"
import { LayoutPlugin } from "@/components/editor/plugins/layout-plugin"
import { LinkPlugin } from "@/components/editor/plugins/link-plugin"
import { AlignmentPickerPlugin } from "@/components/editor/plugins/picker/alignment-picker-plugin"
import { BulletedListPickerPlugin } from "@/components/editor/plugins/picker/bulleted-list-picker-plugin"
import { CheckListPickerPlugin } from "@/components/editor/plugins/picker/check-list-picker-plugin"
import { CodePickerPlugin } from "@/components/editor/plugins/picker/code-picker-plugin"
import { ColumnsLayoutPickerPlugin } from "@/components/editor/plugins/picker/columns-layout-picker-plugin"
import { DividerPickerPlugin } from "@/components/editor/plugins/picker/divider-picker-plugin"
import { EmbedsPickerPlugin } from "@/components/editor/plugins/picker/embeds-picker-plugin"
import { HeadingPickerPlugin } from "@/components/editor/plugins/picker/heading-picker-plugin"
import { ImagePickerPlugin } from "@/components/editor/plugins/picker/image-picker-plugin"
import { NumberedListPickerPlugin } from "@/components/editor/plugins/picker/numbered-list-picker-plugin"
import { ParagraphPickerPlugin } from "@/components/editor/plugins/picker/paragraph-picker-plugin"
import { QuotePickerPlugin } from "@/components/editor/plugins/picker/quote-picker-plugin"
import { DynamicTablePickerPlugin, TablePickerPlugin } from "@/components/editor/plugins/picker/table-picker-plugin"

export function Plugins() {
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null)
  const [isLinkEditMode, setIsLinkEditMode] = useState(false)

  const baseOptions = useMemo(
    () => [
      ParagraphPickerPlugin(),
      HeadingPickerPlugin({ n: 1 }),
      HeadingPickerPlugin({ n: 2 }),
      HeadingPickerPlugin({ n: 3 }),
      QuotePickerPlugin(),
      TablePickerPlugin(),
      CheckListPickerPlugin(),
      NumberedListPickerPlugin(),
      BulletedListPickerPlugin(),
      CodePickerPlugin(),
      DividerPickerPlugin(),
      EmbedsPickerPlugin({ embed: "youtube-video" }),
      ImagePickerPlugin(),
      ColumnsLayoutPickerPlugin(),
      AlignmentPickerPlugin({ alignment: "left" }),
      AlignmentPickerPlugin({ alignment: "center" }),
      AlignmentPickerPlugin({ alignment: "right" }),
      AlignmentPickerPlugin({ alignment: "justify" }),
    ],
    []
  )

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem)
    }
  }

  return (
    <div className="relative">
      {/* toolbar plugins */}
      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <div className="">
              <div className="" ref={onRef}>
                <ContentEditable placeholder={"Press '/' for commands..."} />
              </div>
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        {/* editor plugins */}
        <ComponentPickerMenuPlugin
          baseOptions={baseOptions}
          dynamicOptionsFn={DynamicTablePickerPlugin}
        />
        <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
        <FloatingTextFormatToolbarPlugin
          anchorElem={floatingAnchorElem}
          setIsLinkEditMode={setIsLinkEditMode}
        />
        <LinkPlugin />
        <AutoLinkPlugin />
        <FloatingLinkEditorPlugin
          anchorElem={floatingAnchorElem}
          isLinkEditMode={isLinkEditMode}
          setIsLinkEditMode={setIsLinkEditMode}
        />
        <ListPlugin />
        <CheckListPlugin />
        <TablePlugin />
        <HorizontalRulePlugin />
        <CodeHighlightPlugin />
        <ImagesPlugin />
        <LayoutPlugin />
        <YouTubePlugin />
        <AutoEmbedPlugin />
      </div>
      {/* actions plugins */}
    </div>
  )
}
