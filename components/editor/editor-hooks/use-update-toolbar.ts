"use client"

import { useEffect } from "react"
import { $getSelection, BaseSelection } from "lexical"

import { useToolbarContext } from "@/components/editor/context/toolbar-context"

export function useUpdateToolbarHandler(
  handler: (selection: BaseSelection) => void
) {
  const { activeEditor } = useToolbarContext()

  useEffect(() => {
    return activeEditor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if (selection) {
          handler(selection)
        }
      })
    })
  }, [activeEditor, handler])
}
