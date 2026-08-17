"use client"

import { useState, useEffect } from "react"
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
  type LucideIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { cn } from "@/lib/utils"

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
  user: UserProfile
  signout?: () => Promise<void>
  onDeleteAllChats?: () => Promise<void>
  onDeleteAllNotes?: () => Promise<void>
  onProfileUpdated?: (profile: UserProfile) => void
  onDeleteAccount?: () => Promise<void>
}

type ConfirmDialogType = "notes" | "chats" | "signout" | "account"

const THEME_OPTIONS = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const

function getAvatarStoragePath(url: string, userId: string): string | null {
  if (!url) return null
  try {
    const parsedUrl = new URL(url)
    const pathPrefix = "/storage/v1/object/public/avatars/"
    const prefixIndex = parsedUrl.pathname.indexOf(pathPrefix)
    if (prefixIndex === -1) return null

    const path = decodeURIComponent(parsedUrl.pathname.slice(prefixIndex + pathPrefix.length))
    return path.startsWith(`${userId}/`) ? path : null
  } catch {
    return null
  }
}

async function processAvatarImage(file: File): Promise<{ file: File; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif|heic|heif|bmp|svg)$/i.test(file.name)
    if (!isImage && file.type !== "") {
      reject(new Error("Please choose an image file."))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Failed to read image file."))
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onerror = () => {
        if (file.size > 5 * 1024 * 1024) {
          reject(new Error("Avatar images must be 5 MB or smaller."))
        } else {
          resolve({ file, previewUrl: dataUrl })
        }
      }
      img.onload = () => {
        try {
          const maxDim = 512
          let { width, height } = img
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            } else {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }
          const canvas = document.createElement("canvas")
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            resolve({ file, previewUrl: dataUrl })
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve({ file, previewUrl: dataUrl })
                return
              }
              const processedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" })
              const previewUrl = canvas.toDataURL("image/jpeg", 0.85)
              resolve({ file: processedFile, previewUrl })
            },
            "image/jpeg",
            0.85
          )
        } catch {
          resolve({ file, previewUrl: dataUrl })
        }
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
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

  // Profile form state
  const [displayName, setDisplayName] = useState(user.displayName)
  const [savedDisplayName, setSavedDisplayName] = useState(user.displayName)
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl)
  const [savedAvatarUrl, setSavedAvatarUrl] = useState(user.avatarUrl)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl)
  const [systemInstruction, setSystemInstruction] = useState(user.systemInstruction)
  const [savedSystemInstruction, setSavedSystemInstruction] = useState(user.systemInstruction)

  // Status state
  const [savingProfile, setSavingProfile] = useState(false)
  const [processingAvatar, setProcessingAvatar] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [uuidCopied, setUuidCopied] = useState(false)

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogType | null>(null)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)

  // Synchronize state when user prop changes
  useEffect(() => {
    setDisplayName(user.displayName)
    setSavedDisplayName(user.displayName)
    setAvatarUrl(user.avatarUrl)
    setSavedAvatarUrl(user.avatarUrl)
    setAvatarPreview(user.avatarUrl)
    setAvatarFile(null)
    setSystemInstruction(user.systemInstruction)
    setSavedSystemInstruction(user.systemInstruction)
  }, [user])

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setProfileError(null)
    setProcessingAvatar(true)

    try {
      const { file: processedFile, previewUrl } = await processAvatarImage(file)
      setAvatarFile(processedFile)
      setAvatarPreview(previewUrl)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to process image.")
    } finally {
      setProcessingAvatar(false)
      event.target.value = ""
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarUrl("")
    setAvatarPreview("")
    setProfileError(null)
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

      const previousAvatarPath = getAvatarStoragePath(previousAvatarUrl, user.id)
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
      setConfirmDialog(null)
    } catch (error) {
      if (isRedirectError(error)) throw error
      setAccountError(error instanceof Error ? error.message : "Failed to permanently delete your account.")
    } finally {
      setDeletingAccount(false)
    }
  }

  // Confirmation dialog configs
  const confirmConfigs: Record<
    ConfirmDialogType,
    {
      title: string
      description: string
      icon: LucideIcon
      onConfirm: () => Promise<void> | void
      loading?: boolean
    }
  > = {
    notes: {
      title: "Clear your note history?",
      description: "This will clear all your Lithium notes. This action cannot be undone.",
      icon: Trash2,
      onConfirm: () => onDeleteAllNotes?.(),
    },
    chats: {
      title: "Clear your chat history?",
      description: "This will clear all your Lithium chats. This action cannot be undone.",
      icon: Trash2,
      onConfirm: () => onDeleteAllChats?.(),
    },
    signout: {
      title: "Sign out of your account?",
      description: "You will be signed out on this device. You can sign back in at any time.",
      icon: LogOut,
      onConfirm: () => signout?.(),
    },
    account: {
      title: "Delete your account?",
      description: accountError ?? "This will delete all your notes, chats, and account. This action cannot be undone.",
      icon: Trash2,
      onConfirm: handleDeleteAccount,
      loading: deletingAccount,
    },
  }

  const activeConfirm = confirmDialog ? confirmConfigs[confirmDialog] : null

  // Section contents
  const accountSection = (
    <>
      <SettingsSection title="Account" description="Your account information.">
        <SettingsRow
          label="Profile"
          wideAction
          action={
            <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:justify-end">
              <Avatar className="size-12 shrink-0">
                {avatarPreview && <AvatarImage src={avatarPreview} alt="Your avatar" />}
                <AvatarFallback>{(displayName || user.email).slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <label
                htmlFor="settings-avatar-input"
                className={cn(
                  buttonVariants({ size: "sm", variant: "secondary" }),
                  "cursor-pointer",
                  processingAvatar && "pointer-events-none opacity-50"
                )}
              >
                {processingAvatar ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Pencil className="size-4" />
                )}
                Edit
              </label>
              <input
                id="settings-avatar-input"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleAvatarChange}
                onClick={(e) => {
                  (e.target as HTMLInputElement).value = ""
                }}
              />
              {(avatarPreview || avatarFile) && (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleRemoveAvatar}
                  disabled={processingAvatar || savingProfile}
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              )}
              {(avatarFile || avatarUrl !== savedAvatarUrl) && (
                <SaveButton
                  onClick={handleSaveProfile}
                  disabled={processingAvatar}
                  loading={savingProfile}
                  label="Save profile picture"
                />
              )}
            </div>
          }
        />
        {profileError && <p className="text-xs text-destructive">{profileError}</p>}
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
                <SaveButton
                  onClick={handleSaveProfile}
                  loading={savingProfile}
                  label="Save name"
                />
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

      <SettingsSection title="Session" description="Sign out of your account on this device.">
        <SettingsRow
          label="Sign out"
          action={
            <Button
              size="sm"
              variant="secondary"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDialog("signout")}
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
    <SettingsSection title="Security" description="Manage your SkyElements account.">
      <SettingsRow
        label="Reset password"
        action={
          <Button asChild size="icon-sm" variant="secondary">
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
            onClick={() => {
              setAccountError(null)
              setConfirmDialog("account")
            }}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        }
      />
    </SettingsSection>
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
            <SaveButton
              onClick={handleSaveProfile}
              loading={savingProfile}
              label="Save custom instructions"
            />
          )}
        </div>
      </SettingsSection>

      <Separator />

      <SettingsSection title="Theme" description="Choose your preferred color.">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
            const isActive = theme === value
            return (
              <Button
                key={value}
                type="button"
                variant="secondary"
                onClick={() => setTheme(value)}
                className={cn(
                  "h-auto flex-col gap-1.5 py-3 sm:py-4 border-2",
                  isActive ? "border-foreground" : "border-transparent"
                )}
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
      <SettingsSection title="Your data" description="Manage your Lithium data.">
        <SettingsRow
          label="Clear notes"
          action={
            <Button
              size="sm"
              variant="secondary"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDialog("notes")}
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
              onClick={() => setConfirmDialog("chats")}
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
            <Button asChild size="icon-sm" variant="secondary">
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

  const tabSections = [
    { id: "account", label: "Account", icon: User, content: accountSection },
    { id: "security", label: "Security", icon: Shield, content: securitySection },
    { id: "personalization", label: "Personalization", icon: Palette, content: personalizationSection },
    { id: "data", label: "Data controls", icon: Database, content: dataSection },
  ]

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
            <DialogClose className="rounded-xs opacity-100 disabled:pointer-events-none">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          {isMobile ? (
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 pt-8 pb-8">
              <div className="space-y-8">
                {tabSections.map((section, index) => (
                  <div key={section.id} className="space-y-8">
                    {index > 0 && <Separator />}
                    {section.content}
                  </div>
                ))}
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
                {tabSections.map(({ id, label, icon: Icon }) => (
                  <TabsTrigger
                    key={id}
                    value={id}
                    className="gap-2 px-3 py-2 text-sm rounded-md data-[state=active]:bg-accent justify-start"
                  >
                    <Icon className="size-4" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="flex-1 min-h-0 px-6 py-5 overflow-y-auto scrollbar-thin">
                {tabSections.map(({ id, content }) => (
                  <TabsContent key={id} value={id} className="space-y-6 m-0">
                    {content}
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Reusable Alert Dialog for confirmations */}
      <AlertDialog
        open={confirmDialog !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setConfirmDialog(null)
            setAccountError(null)
          }
        }}
      >
        {activeConfirm && (
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                <activeConfirm.icon />
              </AlertDialogMedia>
              <AlertDialogTitle>{activeConfirm.title}</AlertDialogTitle>
              <AlertDialogDescription>{activeConfirm.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={activeConfirm.loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={activeConfirm.loading}
                onClick={(e) => {
                  if (activeConfirm.loading !== undefined) {
                    e.preventDefault()
                  }
                  void activeConfirm.onConfirm()
                }}
              >
                {activeConfirm.loading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  "Confirm"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  )
}

function SaveButton({
  onClick,
  disabled = false,
  loading = false,
  label,
}: {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  label: string
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={label}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
    </Button>
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
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="space-y-2 sm:space-y-3">{children}</div>
    </section>
  )
}

function SettingsRow({
  label,
  action,
  wideAction = false,
  compactAction = false,
}: {
  label: string
  action?: React.ReactNode
  wideAction?: boolean
  compactAction?: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-h-9 items-center justify-between gap-3 sm:gap-4",
        wideAction && "flex-col items-stretch sm:flex-row sm:items-center"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
      </div>
      {action && (
        <div
          className={cn(
            "shrink-0 flex items-center",
            wideAction && cn("w-full", compactAction ? "sm:max-w-sm" : "sm:max-w-md")
          )}
        >
          {action}
        </div>
      )}
    </div>
  )
}
