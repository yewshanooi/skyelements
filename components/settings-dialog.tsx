"use client"

import { useState, useEffect, useRef } from "react"
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
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Upload,
  type LucideIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { cn } from "@/lib/utils"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
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

const MAX_AVATAR_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB
const CROP_SIZE = 200

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)

function validateImageFile(file: File): string | null {
  const isImage =
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|heic|heif|bmp|svg)$/i.test(file.name)
  if (!isImage && file.type !== "") return "Please choose an image file."
  if (file.size > MAX_AVATAR_SIZE_BYTES) return "Avatar image must be 20 MB or smaller."
  return null
}

function handleImageFileInput(
  e: React.ChangeEvent<HTMLInputElement>,
  onError: (msg: string) => void,
  onSuccess: (url: string) => void
) {
  const file = e.target.files?.[0]
  if (!file) return
  const errorMsg = validateImageFile(file)
  if (errorMsg) {
    onError(errorMsg)
  } else {
    onSuccess(URL.createObjectURL(file))
  }
  e.target.value = ""
}

function getAvatarStoragePath(url: string, userId: string): string | null {
  if (!url) return null
  try {
    const { pathname } = new URL(url)
    const prefix = "/storage/v1/object/public/avatars/"
    const idx = pathname.indexOf(prefix)
    if (idx === -1) return null

    const path = decodeURIComponent(pathname.slice(idx + prefix.length))
    return path.startsWith(`${userId}/`) ? path : null
  } catch {
    return null
  }
}

async function deletePreviousAvatar(
  supabase: ReturnType<typeof createClient>,
  url: string,
  userId: string,
  exceptPath?: string
) {
  const previousPath = getAvatarStoragePath(url, userId)
  if (previousPath && previousPath !== exceptPath) {
    const { error } = await supabase.storage.from("avatars").remove([previousPath])
    if (error) console.error("Failed to remove previous avatar:", error)
  }
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
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Profile form and saved state
  const [form, setForm] = useState({
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    systemInstruction: user.systemInstruction,
  })
  const [saved, setSaved] = useState(form)

  // Status state
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [uuidCopied, setUuidCopied] = useState(false)

  // Avatar crop dialog state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogType | null>(null)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)

  const syncProfile = (updated: UserProfile, notify = false) => {
    const next = {
      displayName: updated.displayName,
      avatarUrl: updated.avatarUrl,
      systemInstruction: updated.systemInstruction,
    }
    setForm(next)
    setSaved(next)
    if (notify) onProfileUpdated?.(updated)
  }

  // Synchronize state when user prop changes
  useEffect(() => {
    syncProfile(user)
  }, [user])

  const handleEditAvatarClick = () => {
    setProfileError(null)
    if (form.avatarUrl) {
      setCropImageSrc(form.avatarUrl)
      setCropDialogOpen(true)
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setProfileError(null)
    handleImageFileInput(event, setProfileError, (url) => {
      setCropImageSrc(url)
      setCropDialogOpen(true)
    })
  }

  const handleSaveAvatar = async (file: File) => {
    let supabase: ReturnType<typeof createClient> | null = null
    let uploadedAvatarPath: string | null = null

    try {
      supabase = createClient()
      const extension = file.type.split("/")[1] || "jpg"
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: false })

      if (uploadError) throw new Error(uploadError.message)
      uploadedAvatarPath = path
      const nextAvatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl

      const updatedProfile = await updateProfile({
        ...form,
        avatarUrl: nextAvatarUrl,
      })

      await deletePreviousAvatar(supabase, saved.avatarUrl, user.id, uploadedAvatarPath)

      syncProfile(updatedProfile, true)
      setCropDialogOpen(false)
      setCropImageSrc(null)
      setProfileError(null)
    } catch (error) {
      if (uploadedAvatarPath && supabase) {
        await supabase.storage.from("avatars").remove([uploadedAvatarPath])
      }
      const msg = error instanceof Error ? error.message : "Failed to save your profile picture."
      setProfileError(msg)
      throw error
    }
  }

  const handleRemoveAvatar = async () => {
    setSavingProfile(true)
    setProfileError(null)

    try {
      const updatedProfile = await updateProfile({
        ...form,
        avatarUrl: "",
      })

      const supabase = createClient()
      await deletePreviousAvatar(supabase, saved.avatarUrl, user.id)

      syncProfile(updatedProfile, true)
      setCropDialogOpen(false)
      setCropImageSrc(null)
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Failed to remove avatar.")
      throw error
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setProfileError(null)

    try {
      const updatedProfile = await updateProfile(form)
      syncProfile(updatedProfile, true)
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Failed to save your profile.")
    } finally {
      setSavingProfile(false)
    }
  }

  const handleCopyUuid = async () => {
    await navigator.clipboard.writeText(user.id)
    setUuidCopied(true)
    setTimeout(() => setUuidCopied(false), 1500)
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

  const tabSections = [
    {
      id: "account",
      label: "Account",
      icon: User,
      content: (
        <>
          <SettingsSection title="Account" description="Your account information.">
            <SettingsRow
              label="Profile"
              wideAction
              action={
                <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:justify-end">
                  <Avatar className="size-12 shrink-0">
                    {form.avatarUrl && <AvatarImage src={form.avatarUrl} alt="Your avatar" />}
                    <AvatarFallback>{(form.displayName || user.email).slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleEditAvatarClick}
                    disabled={savingProfile}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                  <input
                    ref={fileInputRef}
                    id="settings-avatar-input"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarSelect}
                  />
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
                    value={form.displayName}
                    maxLength={80}
                    placeholder="What should Lithium call you?"
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, displayName: e.target.value }))
                      setProfileError(null)
                    }}
                  />
                  {form.displayName !== saved.displayName && (
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
                <ActionButton
                  label="Sign out"
                  icon={LogOut}
                  onClick={() => setConfirmDialog("signout")}
                />
              }
            />
          </SettingsSection>
        </>
      ),
    },
    {
      id: "security",
      label: "Security",
      icon: Shield,
      content: (
        <SettingsSection title="Security" description="Manage your SkyElements account.">
          <ExternalLinkRow label="Reset password" href="/reset-password" />
          <SettingsRow
            label="Delete account"
            action={
              <ActionButton
                label="Delete"
                icon={Trash2}
                onClick={() => {
                  setAccountError(null)
                  setConfirmDialog("account")
                }}
              />
            }
          />
        </SettingsSection>
      ),
    },
    {
      id: "personalization",
      label: "Personalization",
      icon: Palette,
      content: (
        <>
          <SettingsSection
            title="Custom instructions"
            description="Additional behavior, style, and tone preferences."
          >
            <div className="flex w-full items-start gap-2">
              <Textarea
                aria-label="Custom instructions"
                className="min-w-0 flex-1 field-sizing-fixed resize-none overflow-y-auto scrollbar-thin text-sm"
                value={form.systemInstruction}
                maxLength={1000}
                rows={4}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, systemInstruction: e.target.value }))
                  setProfileError(null)
                }}
              />
              {form.systemInstruction !== saved.systemInstruction && (
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
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant="secondary"
                  onClick={() => setTheme(value)}
                  className={cn(
                    "h-auto flex-col gap-1.5 py-3 sm:py-4 border-2",
                    theme === value ? "border-foreground" : "border-transparent"
                  )}
                >
                  <Icon className="size-5" />
                  <span className="text-xs sm:text-sm font-medium">{label}</span>
                </Button>
              ))}
            </div>
          </SettingsSection>
        </>
      ),
    },
    {
      id: "data",
      label: "Data controls",
      icon: Database,
      content: (
        <>
          <SettingsSection title="Your data" description="Manage your Lithium data.">
            <SettingsRow
              label="Clear notes"
              action={
                <ActionButton
                  label="Clear"
                  icon={Trash2}
                  onClick={() => setConfirmDialog("notes")}
                />
              }
            />
            <SettingsRow
              label="Clear chats"
              action={
                <ActionButton
                  label="Clear"
                  icon={Trash2}
                  onClick={() => setConfirmDialog("chats")}
                />
              }
            />
          </SettingsSection>

          <Separator />

          <SettingsSection
            title="Policy"
            description="How we collect, use, and protect your data."
          >
            <ExternalLinkRow label="Privacy policy" href="/policies" />
          </SettingsSection>
        </>
      ),
    },
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="p-0 sm:max-w-[760px] gap-0 overflow-hidden max-h-[80dvh] sm:max-h-[90vh] w-[calc(100%-1rem)] flex flex-col"
        >
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-base sm:text-lg">Settings</DialogTitle>
            <DialogClose className="rounded-xs opacity-100 disabled:pointer-events-none">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          {isMobile ? (
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 pt-8 pb-8 space-y-8">
              {tabSections.map((section, index) => (
                <div key={section.id} className="space-y-8">
                  {index > 0 && <Separator />}
                  {section.content}
                </div>
              ))}
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

      {/* Confirmation Dialog */}
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

      {/* Avatar Crop & Edit Dialog */}
      <AvatarCropDialog
        open={cropDialogOpen}
        imageSrc={cropImageSrc}
        hasExistingImage={Boolean(form.avatarUrl || saved.avatarUrl)}
        onOpenChange={(isOpen) => {
          setCropDialogOpen(isOpen)
          if (!isOpen) {
            if (cropImageSrc?.startsWith("blob:")) {
              URL.revokeObjectURL(cropImageSrc)
            }
            setCropImageSrc(null)
          }
        }}
        onCropSave={handleSaveAvatar}
        onRemove={handleRemoveAvatar}
      />
    </>
  )
}

interface AvatarCropDialogProps {
  open: boolean
  imageSrc: string | null
  hasExistingImage?: boolean
  onOpenChange: (open: boolean) => void
  onCropSave: (file: File) => Promise<void>
  onRemove: () => Promise<void>
}

function AvatarCropDialog({
  open,
  imageSrc,
  hasExistingImage = false,
  onOpenChange,
  onCropSave,
  onRemove,
}: AvatarCropDialogProps) {
  const imageRef = useRef<HTMLImageElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const dialogFileInputRef = useRef<HTMLInputElement | null>(null)

  const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(imageSrc)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
  const [imageLoading, setImageLoading] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 })

  // Touch pointer tracking for multi-touch pinch to zoom & drag
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchDistRef = useRef<number | null>(null)
  const initialPinchZoomRef = useRef<number>(1)

  const [isSaving, setIsSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [cropError, setCropError] = useState<string | null>(null)

  const isBusy = isSaving || isRemoving || imageLoading
  const isAtDefaultState = zoom === 1 && position.x === 0 && position.y === 0 && rotation === 0

  const handleReset = () => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
    setRotation(0)
  }

  // Reset state when dialog opens or imageSrc changes
  useEffect(() => {
    if (open) {
      setCurrentImageSrc(imageSrc)
      setImageLoading(true)
      handleReset()
      setIsDragging(false)
      setIsSaving(false)
      setIsRemoving(false)
      setCropError(null)
      pointersRef.current.clear()
      pinchDistRef.current = null
    }
  }, [open, imageSrc])

  const adjustZoom = (delta: number) => setZoom((prev) => clamp(+(prev + delta).toFixed(2), 1, 3))

  // Calculate effective dimensions based on rotation
  const isRotated = rotation === 90 || rotation === 270
  const effW = isRotated ? naturalSize.height : naturalSize.width
  const effH = isRotated ? naturalSize.width : naturalSize.height

  const baseScale =
    effW > 0 && effH > 0
      ? Math.max(CROP_SIZE / effW, CROP_SIZE / effH)
      : 1
  const scale = baseScale * zoom

  const dispWidth = naturalSize.width * scale
  const dispHeight = naturalSize.height * scale
  const maxPanX = Math.max(0, (effW * scale - CROP_SIZE) / 2)
  const maxPanY = Math.max(0, (effH * scale - CROP_SIZE) / 2)

  // Clamp position within bounds when zoom/rotation changes
  useEffect(() => {
    setPosition((prev) => ({
      x: clamp(prev.x, -maxPanX, maxPanX),
      y: clamp(prev.y, -maxPanY, maxPanY),
    }))
  }, [maxPanX, maxPanY])

  // Non-passive wheel event listener for smooth zoom without console warnings
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      adjustZoom(-e.deltaY * 0.002)
    }

    viewport.addEventListener("wheel", handleWheel, { passive: false })
    return () => viewport.removeEventListener("wheel", handleWheel)
  }, [])

  const handleDialogFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCropError(null)
    handleImageFileInput(event, setCropError, (url) => {
      if (currentImageSrc?.startsWith("blob:")) {
        URL.revokeObjectURL(currentImageSrc)
      }
      setCurrentImageSrc(url)
      setImageLoading(true)
      handleReset()
    })
  }

  const handleRemoveClick = async () => {
    setIsRemoving(true)
    setCropError(null)
    try {
      await onRemove()
      onOpenChange(false)
    } catch (err) {
      setCropError(err instanceof Error ? err.message : "Failed to remove avatar.")
    } finally {
      setIsRemoving(false)
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size === 1) {
      setIsDragging(true)
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      }
    } else if (pointersRef.current.size === 2) {
      const [p1, p2] = [...pointersRef.current.values()]
      pinchDistRef.current = Math.hypot(p1.x - p2.x, p1.y - p2.y)
      initialPinchZoomRef.current = zoom
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size === 2 && pinchDistRef.current) {
      const [p1, p2] = [...pointersRef.current.values()]
      const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
      setZoom(clamp(+(initialPinchZoomRef.current * (currentDist / pinchDistRef.current)).toFixed(2), 1, 3))
    } else if (pointersRef.current.size === 1 && isDragging) {
      setPosition({
        x: clamp(dragStartRef.current.posX + (e.clientX - dragStartRef.current.x), -maxPanX, maxPanX),
        y: clamp(dragStartRef.current.posY + (e.clientY - dragStartRef.current.y), -maxPanY, maxPanY),
      })
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }

    if (pointersRef.current.size === 0) {
      setIsDragging(false)
      pinchDistRef.current = null
    } else if (pointersRef.current.size === 1) {
      const [remaining] = pointersRef.current.values()
      pinchDistRef.current = null
      setIsDragging(true)
      dragStartRef.current = {
        x: remaining.x,
        y: remaining.y,
        posX: position.x,
        posY: position.y,
      }
    }
  }

  const handleRotate = () => {
    setRotation((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270)
  }

  const handleSaveCrop = async () => {
    if (!imageRef.current || !naturalSize.width || !naturalSize.height) return
    setIsSaving(true)
    setCropError(null)

    try {
      const OUTPUT_SIZE = 512
      const canvas = document.createElement("canvas")
      canvas.width = OUTPUT_SIZE
      canvas.height = OUTPUT_SIZE
      const ctx = canvas.getContext("2d")

      if (!ctx) throw new Error("Could not create canvas context")

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"

      const scaleRatio = OUTPUT_SIZE / CROP_SIZE
      ctx.translate(
        OUTPUT_SIZE / 2 + position.x * scaleRatio,
        OUTPUT_SIZE / 2 + position.y * scaleRatio
      )
      ctx.rotate((rotation * Math.PI) / 180)

      const drawWidth = dispWidth * scaleRatio
      const drawHeight = dispHeight * scaleRatio
      ctx.drawImage(
        imageRef.current,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      )

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      )

      if (!blob) throw new Error("Failed to process image.")

      await onCropSave(new File([blob], "avatar.jpg", { type: "image/jpeg" }))
    } catch (err) {
      setCropError(err instanceof Error ? err.message : "Failed to save profile picture.")
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 w-[calc(100%-1rem)] sm:max-w-[400px] gap-0 overflow-hidden"
        showCloseButton
      >
        <DialogHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2.5 sm:pb-3 border-b">
          <DialogTitle className="text-base font-medium">Edit profile picture</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Drag to reposition, and use the slider to resize.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center p-4 sm:p-5 gap-3.5">
          {/* Circular Crop Viewport */}
          <div
            ref={viewportRef}
            className={cn(
              "group relative size-[200px] rounded-full overflow-hidden border-2 border-border/80 bg-muted/40 flex items-center justify-center select-none touch-none shadow-sm",
              isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {imageLoading && currentImageSrc && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {currentImageSrc && (
              <img
                ref={imageRef}
                src={currentImageSrc}
                alt="Crop preview"
                crossOrigin="anonymous"
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget
                  setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
                  setImageLoading(false)
                  handleReset()
                }}
                onError={() => {
                  setImageLoading(false)
                  setCropError("Failed to load image. Please choose another one.")
                }}
                className={cn(
                  "absolute pointer-events-none select-none max-w-none origin-center transition-opacity duration-200",
                  imageLoading ? "opacity-0" : "opacity-100"
                )}
                style={{
                  width: `${dispWidth}px`,
                  height: `${dispHeight}px`,
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) rotate(${rotation}deg)`,
                  left: "50%",
                  top: "50%",
                }}
              />
            )}

            {/* Rule of thirds grid overlay */}
            <div
              className={cn(
                "pointer-events-none absolute inset-0 rounded-full transition-opacity duration-200",
                isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                imageLoading && "!opacity-0"
              )}
              aria-hidden="true"
            >
              <div className="absolute left-0 right-0 top-1/3 h-px bg-white/30 dark:bg-white/20 border-t border-dashed border-black/20" />
              <div className="absolute left-0 right-0 top-2/3 h-px bg-white/30 dark:bg-white/20 border-t border-dashed border-black/20" />
              <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/30 dark:bg-white/20 border-l border-dashed border-black/20" />
              <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/30 dark:bg-white/20 border-l border-dashed border-black/20" />
            </div>
          </div>

          {/* Controls */}
          <div className="w-full space-y-2.5 px-1">
            {/* Zoom Slider Control */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => adjustZoom(-0.1)}
                disabled={zoom <= 1 || isBusy}
                aria-label="Zoom out"
              >
                <ZoomOut className="size-4" />
              </Button>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.01}
                onValueChange={([val]) => setZoom(val)}
                disabled={isBusy}
                className="flex-1"
                aria-label="Zoom level"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => adjustZoom(0.1)}
                disabled={zoom >= 3 || isBusy}
                aria-label="Zoom in"
              >
                <ZoomIn className="size-4" />
              </Button>
            </div>

            {/* Action Tools: Zoom Percentage, Rotate & Reset */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium tabular-nums">{Math.round(zoom * 100)}%</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={handleReset}
                  disabled={isBusy || isAtDefaultState}
                >
                  <RotateCcw className="size-3.5" />
                  Reset
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={handleRotate}
                  disabled={isBusy}
                >
                  <RotateCw className="size-3.5" />
                  Rotate
                </Button>
              </div>
            </div>

            {/* Action Row: Remove image / Change image */}
            <div className="flex items-center justify-between w-full pt-3 border-t gap-2">
              {hasExistingImage ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveClick}
                  disabled={isBusy}
                >
                  {isRemoving ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Remove
                </Button>
              ) : (
                <div />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => dialogFileInputRef.current?.click()}
                disabled={isBusy}
              >
                <Upload className="size-4" />
                Change
              </Button>
              <input
                ref={dialogFileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleDialogFileSelect}
              />
            </div>
          </div>

          {cropError && (
            <p className="text-xs text-destructive text-center w-full">{cropError}</p>
          )}
        </div>

        <DialogFooter className="m-0 border-t bg-muted/50 px-4 sm:px-5 py-2.5 sm:py-3 flex-row items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSaveCrop}
            disabled={isBusy || !naturalSize.width}
          >
            {isSaving ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SaveButton({
  onClick,
  loading = false,
  label,
}: {
  onClick: () => void
  loading?: boolean
  label: string
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      onClick={onClick}
      disabled={loading}
      aria-label={label}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
    </Button>
  )
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: LucideIcon
  onClick: () => void
}) {
  return (
    <Button
      size="sm"
      variant="secondary"
      className="text-destructive hover:text-destructive"
      onClick={onClick}
    >
      <Icon className="size-4" />
      {label}
    </Button>
  )
}

function ExternalLinkRow({ label, href }: { label: string; href: string }) {
  return (
    <SettingsRow
      label={label}
      action={
        <Button asChild size="icon-sm" variant="secondary">
          <Link href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
            <ExternalLink className="size-4" />
          </Link>
        </Button>
      }
    />
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
  wideAction,
  compactAction,
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
      <p className="text-sm font-medium min-w-0 flex-1">{label}</p>
      {action && (
        <div
          className={cn(
            "shrink-0 flex items-center",
            wideAction && (compactAction ? "w-full sm:max-w-sm" : "w-full sm:max-w-md")
          )}
        >
          {action}
        </div>
      )}
    </div>
  )
}
