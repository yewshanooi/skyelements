"use client"

import { useState } from "react"
import {
  MoreHorizontal,
  Trash2,
  StickyNote,
  Plus,
  Pin,
  PinOff,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"

export function NavNotes({
  notes,
  activeNoteId,
  onSelectNote,
  onDeleteNote,
  onNewNote,
  onTogglePinNote,
}: {
  notes: {
    id: string
    name: string
    isPinned?: boolean
    updatedAt: string
  }[]
  activeNoteId?: string | null
  onSelectNote?: (noteId: string) => void
  onDeleteNote?: (noteId: string) => void
  onNewNote?: () => void
  onTogglePinNote?: (noteId: string, currentPinStatus: boolean) => void | Promise<void>
}) {
  const { isMobile } = useSidebar()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Notes</SidebarGroupLabel>
        <SidebarGroupAction title="Add a note" onClick={onNewNote} className="cursor-pointer">
          <Plus /> <span className="sr-only">Add a note</span>
        </SidebarGroupAction>
        <SidebarMenu>
          {notes.length === 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton disabled>
                <span className="text-muted-foreground text-xs">Your notes will show up here.</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            notes.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  isActive={activeNoteId === item.id}
                  onClick={() => onSelectNote?.(item.id)}
                  className="cursor-pointer"
                >
                  <StickyNote className="h-4 w-4" />
                  <span>{item.name}</span>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover={!item.isPinned} className="group/action">
                      {item.isPinned ? (
                        <>
                          <Pin className="h-4 w-4 text-muted-foreground group-hover/menu-item:hidden group-data-[state=open]/action:hidden" />
                          <MoreHorizontal className="h-4 w-4 hidden group-hover/menu-item:block group-data-[state=open]/action:block" />
                        </>
                      ) : (
                        <MoreHorizontal />
                      )}
                      <span className="sr-only">More</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-48"
                    side={isMobile ? "bottom" : "right"}
                    align={isMobile ? "end" : "start"}
                  >
                    <DropdownMenuItem
                      onClick={() => onTogglePinNote?.(item.id, item.isPinned || false)}
                    >
                      {item.isPinned ? <PinOff className="text-muted-foreground" /> : <Pin className="text-muted-foreground" />}
                      <span>{item.isPinned ? 'Unpin' : 'Pin'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setPendingDeleteId(item.id)}
                    >
                      <Trash2 className="text-muted-foreground" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                      {new Date(item.updatedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </DropdownMenuLabel>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
      </SidebarGroup>

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              Once you delete a note, it&apos;s gone forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "outline", className: "text-destructive cursor-pointer hover:text-destructive" })}
              onClick={() => {
                onDeleteNote?.(pendingDeleteId!)
                setPendingDeleteId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
