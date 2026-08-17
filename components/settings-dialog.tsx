"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Check,
  Copy,
  ExternalLink,
  LogOut,
  LoaderCircle,
  Trash2,
  User,
  Palette,
  Database,
  Monitor,
  Sun,
  Moon,
  Shield,
  Pencil,
  X,
} from "lucide-react"
import { useTheme } from "next-themes"
import { isRedirectError } from "next/dist/client/components/redirect-error"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  AlertDialogMedia,
} from "@/components/ui/alert-dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { createClient } from "@/utils/supabase/client"
import { deleteAccount, updateProfile } from "@/app/lithium/profile-actions"
import type { UserProfile } from "@/app/lithium/profile"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id: string
    email: string
    displayName: string
    avatarUrl: string
    systemInstruction: string
  }
  signout?: () => Promise<void>
  onDeleteAllChats?: () => Promise<void>
  onDeleteAllNotes?: () => Promise<void>
  onProfileUpdated?: (profile: UserProfile) => void
  onDeleteAccount?: () => Promise<void>
}

export function SettingsDialog({
  open,
  onOpenChange,
  user,
  signout,
  onDeleteAllChats,
  onDeleteAllNotes,
  onProfileUpdated,
  onDeleteAccount,
}: SettingsDialogProps) {
  const { theme, setTheme } = useTheme()
  const isMobile = useIsMobile()

  const [deleteAllChatsOpen, setDeleteAllChatsOpen] = useState(false)
  const [deleteAllNotesOpen, setDeleteAllNotesOpen] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [signoutOpen, setSignoutOpen] = useState(false)
  const [displayName, setDisplayName] = useState(user.displayName)
  const [savedDisplayName, setSavedDisplayName] = useState(user.displayName)
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl)
  const [savedAvatarUrl, setSavedAvatarUrl] = useState(user.avatarUrl)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl)
  const [systemInstruction, setSystemInstruction] = useState(user.systemInstruction)
  const [savedSystemInstruction, setSavedSystemInstruction] = useState(user.systemInstruction)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [uuidCopied, setUuidCopied] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)

  const themeOptions = [
    { value: "system", label: "System", icon: Monitor },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ] as const


  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setProfileError("Please choose an image file.")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileError("Avatar images must be 2 MB or smaller.")
      return
    }

    setProfileError(null)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    // Reset so re-selecting the same file triggers onChange again
    event.target.value = ""
  }

  const getAvatarStoragePath = (url: string) => {
    if (!url) return null

    try {
      const parsedUrl = new URL(url)
      const pathPrefix = "/storage/v1/object/public/avatars/"
      const prefixIndex = parsedUrl.pathname.indexOf(pathPrefix)
      if (prefixIndex === -1) return null

      const path = decodeURIComponent(parsedUrl.pathname.slice(prefixIndex + pathPrefix.length))
      return path.startsWith(`${user.id}/`) ? path : null
    } catch {
      return null
    }
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setProfileError(null)

    let supabase: ReturnType<typeof createClient> | null = null
    let uploadedAvatarPath: string | null = null

    try {
      let nextAvatarUrl = avatarUrl
      if (avatarFile) {
        supabase = createClient()
        const extension = avatarFile.type.split("/")[1] || "png"
        const path = `${user.id}/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { contentType: avatarFile.type, upsert: false })

        if (uploadError) throw new Error(uploadError.message)
        uploadedAvatarPath = path
        nextAvatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl
      }

      const previousAvatarUrl = savedAvatarUrl
      const updatedProfile = await updateProfile({
        displayName,
        avatarUrl: nextAvatarUrl,
        systemInstruction,
      })

      const previousAvatarPath = getAvatarStoragePath(previousAvatarUrl)
      if (previousAvatarPath && previousAvatarPath !== uploadedAvatarPath) {
        const storageClient = supabase ?? createClient()
        const { error: removeError } = await storageClient.storage
          .from("avatars")
          .remove([previousAvatarPath])

        if (removeError) {
          console.error("Failed to remove the previous avatar:", removeError)
          setProfileError("Profile saved, but the previous profile picture could not be removed.")
        }
      }

      setAvatarUrl(updatedProfile.avatarUrl)
      setSavedAvatarUrl(updatedProfile.avatarUrl)
      setAvatarPreview(updatedProfile.avatarUrl)
      setAvatarFile(null)
      setDisplayName(updatedProfile.displayName)
      setSavedDisplayName(updatedProfile.displayName)
      setSystemInstruction(updatedProfile.systemInstruction)
      setSavedSystemInstruction(updatedProfile.systemInstruction)
      onProfileUpdated?.(updatedProfile)
    } catch (error) {
      if (uploadedAvatarPath && supabase) {
        await supabase.storage.from("avatars").remove([uploadedAvatarPath])
      }
      setProfileError(error instanceof Error ? error.message : "Failed to save your profile.")
    } finally {
      setSavingProfile(false)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarUrl("")
    setAvatarPreview("")
    setProfileError(null)
  }

  const handleCopyUuid = async () => {
    await navigator.clipboard.writeText(user.id)
    setUuidCopied(true)
    window.setTimeout(() => setUuidCopied(false), 1500)
  }

  const handleDeleteAccount = async () => {
    setDeletingAccount(true)
    setAccountError(null)

    try {
      await (onDeleteAccount ?? deleteAccount)()
      setDeleteAccountOpen(false)
    } catch (error) {
      if (isRedirectError(error)) throw error
      setAccountError(error instanceof Error ? error.message : "Failed to permanently delete your account.")
    } finally {
      setDeletingAccount(false)
    }
  }

  const accountSection = (
    <>
      <SettingsSection
        title="Account"
        description="Your account information."
      >
        <SettingsRow
          label="Profile"
          wideAction
          action={
            <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:justify-end">
              <Avatar className="size-12 shrink-0">
                {avatarPreview && <AvatarImage src={avatarPreview} alt="Your avatar" />}
                <AvatarFallback>{(displayName || user.email).slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <label className={buttonVariants({ size: "sm", variant: "secondary" }) + " cursor-pointer"}>
                <Pencil className="size-4" />
                Edit
                <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} />
              </label>
              {(avatarPreview || avatarFile) && (
                <Button type="button" size="sm" variant="destructive" onClick={handleRemoveAvatar}>
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              )}
              {(avatarFile || avatarUrl !== savedAvatarUrl) && (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  aria-label="Save profile picture"
                >
                  {savingProfile ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
                </Button>
              )}
            </div>
          }
        />
        <SettingsRow
          label="Name"
          wideAction
          compactAction
          action={
            <div className="flex w-full items-center gap-2">
              <Input
                aria-label="Name"
                className="min-w-0 flex-1 text-sm"
                value={displayName}
                maxLength={80}
                placeholder="What should Lithium call you?"
                onChange={(event) => {
                  setDisplayName(event.target.value)
                  setProfileError(null)
                }}
              />
              {displayName !== savedDisplayName && (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  aria-label="Save name"
                >
                  {savingProfile ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
                </Button>
              )}
            </div>
          }
        />
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
          label="User ID"
          action={
            <div className="flex items-center gap-2">
              <span
                className="text-sm text-muted-foreground truncate max-w-[180px] sm:max-w-none"
                title={user.id}
              >
                {user.id}
              </span>
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                onClick={handleCopyUuid}
                aria-label={uuidCopied ? "Account UUID copied" : "Copy account UUID"}
              >
                {uuidCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
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
              className="text-destructive hover:text-destructive"
              onClick={() => setSignoutOpen(true)}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          }
        />
      </SettingsSection>
    </>
  )

  const securitySection = (
    <>
      <SettingsSection
        title="Security"
        description="Manage your SkyElements account."
      >
        <SettingsRow
          label="Reset password"
          action={
            <Button
              asChild
              size="icon-sm"
              variant="secondary"
            >
              <Link
                href="/reset-password"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Reset password"
              >
                <ExternalLink className="size-4" />
              </Link>
            </Button>
          }
        />
        <SettingsRow
          label="Delete account"
          action={
            <Button
              size="sm"
              variant="secondary"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteAccountOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          }
        />
      </SettingsSection>
    </>
  )

  const personalizationSection = (
    <>
      <SettingsSection
        title="Custom instructions"
        description="Additional behavior, style, and tone preferences."
      >
        <div className="flex w-full items-start gap-2">
          <Textarea
            aria-label="Custom instructions"
            className="min-w-0 flex-1 field-sizing-fixed resize-none overflow-y-auto scrollbar-thin text-sm"
            value={systemInstruction}
            maxLength={1000}
            rows={4}
            onChange={(event) => {
              setSystemInstruction(event.target.value)
              setProfileError(null)
            }}
          />
          {systemInstruction !== savedSystemInstruction && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={handleSaveProfile}
              disabled={savingProfile}
              aria-label="Save custom instructions"
            >
              {savingProfile ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
            </Button>
          )}
        </div>
      </SettingsSection>

      <Separator />

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
                className={`h-auto flex-col gap-1.5 py-3 sm:py-4 border-2 ${
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
    </>
  )

  const dataSection = (
    <>
      <SettingsSection
        title="Your data"
        description="Manage your Lithium data."
      >
        <SettingsRow
          label="Clear notes"
          action={
            <Button
              size="sm"
              variant="secondary"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteAllNotesOpen(true)}
            >
              <Trash2 className="size-4" />
              Clear
            </Button>
          }
        />
        <SettingsRow
          label="Clear chats"
          action={
            <Button
              size="sm"
              variant="secondary"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteAllChatsOpen(true)}
            >
              <Trash2 className="size-4" />
              Clear
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
              size="icon-sm"
              variant="secondary"
            >
              <Link
                href="/policies"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Privacy policy"
              >
                <ExternalLink className="size-4" />
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
        <DialogContent
          showCloseButton={false}
          className="p-0 sm:max-w-[760px] gap-0 overflow-hidden max-h-[80dvh] sm:max-h-[90vh] w-[calc(100%-1rem)] flex flex-col"
        >
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b flex-row items-center justify-between space-y-0">
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-base sm:text-lg">Settings</DialogTitle>
            </div>
            <DialogClose
              className="rounded-xs opacity-100 disabled:pointer-events-none"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          {isMobile ? (
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 pt-8 pb-8">
              <div className="space-y-8">
                {accountSection}
                <Separator />
                {securitySection}
                <Separator />
                {personalizationSection}
                <Separator />
                {dataSection}
              </div>
            </div>
          ) : (
            <Tabs
              defaultValue="account"
              orientation="vertical"
              className="min-h-0 gap-0 md:flex-row md:h-[440px]"
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
                  value="security"
                  className="gap-2 px-3 py-2 text-sm rounded-md data-[state=active]:bg-accent justify-start"
                >
                  <Shield className="size-4" />
                  Security
                </TabsTrigger>
                <TabsTrigger
                  value="personalization"
                  className="gap-2 px-3 py-2 text-sm rounded-md data-[state=active]:bg-accent justify-start"
                >
                  <Palette className="size-4" />
                  Personalization
                </TabsTrigger>
                <TabsTrigger
                  value="data"
                  className="gap-2 px-3 py-2 text-sm rounded-md data-[state=active]:bg-accent justify-start"
                >
                  <Database className="size-4" />
                  Data controls
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 min-h-0 px-6 py-5 overflow-y-auto scrollbar-thin">
                <TabsContent value="account" className="space-y-6 m-0">
                  {accountSection}
                </TabsContent>
                <TabsContent value="security" className="space-y-6 m-0">
                  {securitySection}
                </TabsContent>
                <TabsContent value="personalization" className="space-y-6 m-0">
                  {personalizationSection}
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
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Clear your note history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all your Lithium notes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => onDeleteAllNotes?.()}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={signoutOpen} onOpenChange={setSignoutOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <LogOut />
            </AlertDialogMedia>
            <AlertDialogTitle>Sign out of your account?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out on this device. You can sign back in at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => signout?.()}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllChatsOpen} onOpenChange={setDeleteAllChatsOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Clear your chat history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all your Lithium chats. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => onDeleteAllChats?.()}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteAccountOpen}
        onOpenChange={(nextOpen) => {
          setDeleteAccountOpen(nextOpen)
          if (nextOpen) setAccountError(null)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              {accountError ?? "This will delete all your notes, chats, and account. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteAccount()
              }}
              disabled={deletingAccount}
            >
              {deletingAccount ? <LoaderCircle className="size-4 animate-spin" /> : "Confirm"}
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
  wideAction = false,
  compactAction = false,
  alignTop = false,
}: {
  label: string
  description?: string
  action?: React.ReactNode
  wideAction?: boolean
  compactAction?: boolean
  alignTop?: boolean
}) {
  return (
    <div
      className={`flex min-h-9 items-center justify-between gap-3 sm:gap-4 ${
        wideAction
          ? `flex-col items-stretch sm:flex-row ${alignTop ? "sm:items-start" : "sm:items-center"}`
          : ""
      }`}
    >
      <div className={`min-w-0 flex-1 ${alignTop ? "sm:pt-2" : ""}`}>
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div
          className={`shrink-0 flex items-center ${
            wideAction ? `w-full ${compactAction ? "sm:max-w-sm" : "sm:max-w-md"}` : ""
          }`}
        >
          {action}
        </div>
      )}
    </div>
  )
}
