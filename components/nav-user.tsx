"use client"

import { useState } from "react"
import {
  ChevronsUpDown,
  Sun,
  Moon,
  LogOut,
  Trash2,
  User,
} from "lucide-react"
import { useTheme } from "next-themes"

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
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

export function NavUser({
  user,
  signout,
  onDeleteAllChats,
}: {
  user: {
    email: string
  }
  signout?: () => Promise<void>
  onDeleteAllChats?: () => Promise<void>
}) {
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)

  return (
    <>
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg">
                  <User className="size-4" />
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.email}</span>
                <span className="truncate text-xs">User</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-sm">
                    <User className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.email}</span>
                  <span className="truncate text-xs">User</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Settings</DropdownMenuLabel>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                  Theme
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuCheckboxItem
                      checked={theme === "light"}
                      onCheckedChange={() => setTheme("light")}
                      className="cursor-pointer"
                    >
                      Light
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={theme === "dark"}
                      onCheckedChange={() => setTheme("dark")}
                      className="cursor-pointer"
                    >
                      Dark
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={theme === "system"}
                      onCheckedChange={() => setTheme("system")}
                      className="cursor-pointer"
                    >
                      System
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteAllOpen(true)}
                className="cursor-pointer"
              >
                <Trash2 />
                Clear chat history
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                variant="destructive" 
                onClick={() => signout?.()} 
                className="cursor-pointer"
              >
                <LogOut />
                Logout
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>

    <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear your chat history?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete prompts, responses, and feedback from your Lithium chat history. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "outline", className: "text-destructive cursor-pointer hover:text-destructive" })}
            onClick={() => {
              onDeleteAllChats?.()
              setDeleteAllOpen(false)
            }}
          >
            Delete All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
