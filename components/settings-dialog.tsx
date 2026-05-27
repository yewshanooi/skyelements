"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  KeyRound,
  LogOut,
  Trash2,
  User,
  Palette,
  Database,
  Monitor,
  Sun,
  Moon,
  Shield,
} from "lucide-react"
import { useTheme } from "next-themes"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button, buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
import { useIsMobile } from "@/hooks/use-mobile"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    email: string
  }
  signout?: () => Promise<void>
  onDeleteAllChats?: () => Promise<void>
  onDeleteAllNotes?: () => Promise<void>
}

export function SettingsDialog({
  open,
  onOpenChange,
  user,
  signout,
  onDeleteAllChats,
  onDeleteAllNotes,
}: SettingsDialogProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const isMobile = useIsMobile()
  const [deleteAllChatsOpen, setDeleteAllChatsOpen] = useState(false)
  const [deleteAllNotesOpen, setDeleteAllNotesOpen] = useState(false)

  const themeOptions = [
    { value: "system", label: "System", icon: Monitor },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ] as const

  const handleResetPassword = () => {
    onOpenChange(false)
    router.push("/reset-password")
  }

  const accountSection = (
    <>
      <SettingsSection
        title="Profile"
        description="Your account information."
      >
        <SettingsRow
          label="Email"
          action={
            <span
              className="text-sm text-muted-foreground truncate max-w-[180px] sm:max-w-none"
              title={user.email}
            >
              {user.email}
            </span>
          }
        />
        <SettingsRow
          label="Password"
          action={
            <Button
              size="sm"
              variant="secondary"
              className="cursor-pointer"
              onClick={handleResetPassword}
            >
              <KeyRound className="size-4" />
              Reset password
            </Button>
          }
        />
      </SettingsSection>

      <Separator />

      <SettingsSection
        title="Session"
        description="Sign out of your account on this device."
      >
        <SettingsRow
          label="Sign out"
          action={
            <Button
              size="sm"
              variant="secondary"
              className="cursor-pointer text-destructive hover:text-destructive"
              onClick={() => signout?.()}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          }
        />
      </SettingsSection>
    </>
  )

  const appearanceSection = (
    <SettingsSection
      title="Theme"
      description="Choose your preferred color."
    >
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {themeOptions.map(({ value, label, icon: Icon }) => {
          const isActive = theme === value
          return (
            <Button
              key={value}
              type="button"
              variant="secondary"
              onClick={() => setTheme(value)}
              className={`h-auto flex-col gap-1.5 py-3 sm:py-4 cursor-pointer border-2 ${
                isActive ? "border-foreground" : "border-transparent"
              }`}
            >
              <Icon className="size-5" />
              <span className="text-xs sm:text-sm font-medium">{label}</span>
            </Button>
          )
        })}
      </div>
    </SettingsSection>
  )

  const dataSection = (
    <>
      <SettingsSection
        title="Your data"
        description="Manage your notes and chats data."
      >
        <SettingsRow
          label="Notes"
          action={
            <Button
              size="sm"
              variant="secondary"
              className="cursor-pointer text-destructive hover:text-destructive"
              onClick={() => setDeleteAllNotesOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete all
            </Button>
          }
        />
        <SettingsRow
          label="Chats"
          action={
            <Button
              size="sm"
              variant="secondary"
              className="cursor-pointer text-destructive hover:text-destructive"
              onClick={() => setDeleteAllChatsOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete all
            </Button>
          }
        />
      </SettingsSection>

      <Separator />

      <SettingsSection
        title="Policy"
        description="How we collect, use, and protect your data."
      >
        <SettingsRow
          label="Privacy policy"
          action={
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="cursor-pointer"
            >
              <Link
                href="/privacy-policy"
                rel="noopener noreferrer"
                onClick={() => onOpenChange(false)}
              >
                <Shield className="size-4" />
                View
              </Link>
            </Button>
          }
        />
      </SettingsSection>
    </>
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="p-0 sm:max-w-[760px] gap-0 overflow-hidden max-h-[92vh] w-[calc(100%-1rem)] flex flex-col">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b">
            <DialogTitle className="text-base sm:text-lg">Settings</DialogTitle>
            <DialogDescription className="sr-only">
              Manage your account, appearance, and data preferences.
            </DialogDescription>
          </DialogHeader>

          {isMobile ? (
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-8 pb-8">
              <div className="space-y-8">
                {accountSection}
                <Separator />
                {appearanceSection}
                <Separator />
                {dataSection}
              </div>
            </div>
          ) : (
            <Tabs
              defaultValue="account"
              orientation="vertical"
              className="flex-1 min-h-0 gap-0 md:flex-row md:min-h-[440px]"
            >
              <TabsList
                variant="line"
                className="shrink-0 rounded-none gap-1 bg-transparent w-48 border-r p-3 items-stretch"
              >
                <TabsTrigger
                  value="account"
                  className="gap-2 px-3 py-2 text-sm rounded-md data-[state=active]:bg-accent justify-start"
                >
                  <User className="size-4" />
                  Account
                </TabsTrigger>
                <TabsTrigger
                  value="appearance"
                  className="gap-2 px-3 py-2 text-sm rounded-md data-[state=active]:bg-accent justify-start"
                >
                  <Palette className="size-4" />
                  Appearance
                </TabsTrigger>
                <TabsTrigger
                  value="data"
                  className="gap-2 px-3 py-2 text-sm rounded-md data-[state=active]:bg-accent justify-start"
                >
                  <Database className="size-4" />
                  Data controls
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 min-h-0 px-6 py-5 overflow-y-auto">
                <TabsContent value="account" className="space-y-6 m-0">
                  {accountSection}
                </TabsContent>
                <TabsContent value="appearance" className="space-y-6 m-0">
                  {appearanceSection}
                </TabsContent>
                <TabsContent value="data" className="space-y-6 m-0">
                  {dataSection}
                </TabsContent>
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteAllNotesOpen} onOpenChange={setDeleteAllNotesOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear your note history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all your Lithium notes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({
                variant: "outline",
                className:
                  "text-destructive cursor-pointer hover:text-destructive",
              })}
              onClick={() => onDeleteAllNotes?.()}
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllChatsOpen} onOpenChange={setDeleteAllChatsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear your chat history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all your Lithium chats. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({
                variant: "outline",
                className:
                  "text-destructive cursor-pointer hover:text-destructive",
              })}
              onClick={() => onDeleteAllChats?.()}
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="space-y-2 sm:space-y-3">{children}</div>
    </section>
  )
}

function SettingsRow({
  label,
  description,
  action,
}: {
  label: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 flex items-center">{action}</div>}
    </div>
  )
}
