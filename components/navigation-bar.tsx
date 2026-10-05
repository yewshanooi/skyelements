"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ExternalLink, Menu, X } from "lucide-react"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { UserNav } from "@/components/user-nav";
import { SettingsDialog } from "@/components/settings-dialog";
import { useAuthModal } from "@/components/auth/AuthModalContext";
import type { UserProfile } from "@/lib/profile";

interface NavigationBarProps {
  forceShow?: boolean;
  user?: UserProfile | null;
}

export function NavigationBar({ forceShow = false, user: initialUser }: NavigationBarProps = {}) {
  const { requireAuth, user: contextUser, signOut } = useAuthModal()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(
    initialUser !== undefined ? initialUser : (contextUser ?? null)
  )
  const pathname = usePathname()

  React.useEffect(() => {
    if (initialUser !== undefined) {
      setCurrentUser(initialUser)
      return
    }
    setCurrentUser(contextUser)
  }, [initialUser, contextUser])

  useBodyScrollLock(mobileMenuOpen)


  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Hide navigation bar on mini-apps routes (unless forceShow is explicitly true)
  if (
    !forceShow &&
    (pathname === "/apps" ||
      pathname === "/notes" ||
      pathname?.startsWith("/notes/") ||
      pathname === "/sales" ||
      pathname?.startsWith("/sales/"))
  ) {
    return null
  }

  return (
    <div className="sticky top-4 z-40 flex justify-center px-4 w-full">
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-gray-200/20 rounded-xl shadow-xs px-6 py-3 w-full max-w-7xl pointer-events-auto">
        {/* Desktop Navigation */}
        <div className="hidden lg:grid grid-cols-3 items-center gap-8">
          <div className="flex justify-start">
            <Link href="/" className="flex-shrink-0">
              <Image 
                src="/logo/skyelements.png" 
                alt="SkyElements Logo" 
                width={239} 
                height={55}
                className="h-9 w-auto"
                priority
              />
            </Link>
          </div>

          <div className="flex justify-center">
            <NavigationMenu viewport={false}>
              <NavigationMenuList>

                <NavigationMenuItem>
                  <NavigationMenuTrigger>Sodium</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-2 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                      <li className="row-span-3">
                        <NavigationMenuLink asChild>
                          <Link
                            href="/sodium"
                            className="from-muted/50 to-muted flex h-full w-full flex-col justify-end rounded-md bg-linear-to-b p-6 no-underline outline-hidden select-none focus:shadow-md items-start"
                          >
                            <div className="mt-4 mb-2 text-lg font-medium">
                              Sodium
                            </div>
                            <p className="text-muted-foreground text-sm leading-tight">
                              Multipurpose discord bot with application commands and a user-friendly interface
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <ListItem href="/commands" title="Commands">
                        Preview commands from Sodium
                      </ListItem>
                      <ListItem href="https://github.com/yewshanooi/sodium/blob/main/README.md#guides" title={<>Get Started <ExternalLink className="ml-1 h-4 w-4" /></>} target="_blank">
                        Customize & host your own Sodium bot
                      </ListItem>
                      <ListItem href="https://github.com/yewshanooi/sodium/blob/main/LICENSE" title={<>License <ExternalLink className="ml-1 h-4 w-4" /></>} target="_blank">
                        Sodium is licensed under MIT License
                      </ListItem>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link
                      href="/apps"
                      onClick={(e) => {
                        if (!requireAuth(e, "/apps")) return;
                      }}
                    >
                      Mini Apps
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link href="/branding">
                      Branding
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link href="/credits">
                      Credits
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link href="/policies">
                      Policies
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="w-60">
                      <ListItem href="https://skyelements.betteruptime.com/" title={<>Uptime <ExternalLink className="ml-1 h-4 w-4" /></>} target="_blank">
                        View our uptime on Better Stack
                      </ListItem>
                      <ListItem href="https://github.com/yewshanooi/skyelements" title={<>Source Code <ExternalLink className="ml-1 h-4 w-4" /></>} target="_blank">
                        View our source code on GitHub
                      </ListItem>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="flex justify-end items-center gap-2">
            <UserNav user={currentUser} onOpenSettingsClick={() => setSettingsOpen(true)} />
          </div>
        </div>


      {/* Mobile Navigation */}
      <div className="flex lg:hidden w-full items-center gap-2">
        <Link href="/" className="flex-shrink-0" onClick={() => setMobileMenuOpen(false)}>
          <Image 
            src="/logo/skyelements.png" 
            alt="SkyElements Logo" 
            width={160} 
            height={55}
            priority
          />
        </Link>
        
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} modal={false}>
            <SheetContent 
              side="top" 
              showCloseButton={false}
              hideOverlay
              className="h-dvh w-screen max-w-none flex flex-col border-none rounded-none m-0 p-0 pb-8 bg-background fixed inset-0 z-30 pt-24 duration-200 ease-in-out data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
            >
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">Access all sections of the site.</SheetDescription>

              <div className="w-full max-w-[280px] mx-auto flex-1 min-h-0 flex flex-col gap-6 overflow-y-auto overflow-x-hidden scrollbar-thin text-left px-4">
                <Link href="/" className="text-2xl font-medium transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  Home
                </Link>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="sodium">
                    <AccordionTrigger className="justify-between items-center gap-2 text-2xl font-medium hover:no-underline transition-colors [&>svg]:size-5 py-0">
                      Sodium
                    </AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-5 pt-4 pb-2 pl-2 [&_a]:no-underline">
                      <Link href="/sodium" className="text-xl text-muted-foreground hover:text-foreground transition-colors text-left" onClick={() => setMobileMenuOpen(false)}>
                        About
                      </Link>
                      <Link href="/commands" className="text-xl text-muted-foreground hover:text-foreground transition-colors text-left" onClick={() => setMobileMenuOpen(false)}>
                        Commands
                      </Link>
                      <a 
                        href="https://github.com/yewshanooi/sodium/blob/main/README.md#guides"
                        className="text-xl text-muted-foreground hover:text-foreground transition-colors flex items-center justify-start gap-2"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Get Started <ExternalLink className="h-5 w-5" />
                      </a>
                      <a 
                        href="https://github.com/yewshanooi/sodium/blob/main/LICENSE"
                        className="text-xl text-muted-foreground hover:text-foreground transition-colors flex items-center justify-start gap-2"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        License <ExternalLink className="h-5 w-5" />
                      </a>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Link
                  href="/apps"
                  className="text-2xl font-medium transition-colors"
                  onClick={(e) => {
                    if (!requireAuth(e, "/apps")) {
                      setMobileMenuOpen(false);
                      return;
                    }
                    setMobileMenuOpen(false);
                  }}
                >
                  Mini Apps
                </Link>
                
                <Link href="/branding" className="text-2xl font-medium transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  Branding
                </Link>
                
                <Link href="/credits" className="text-2xl font-medium transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  Credits
                </Link>

                <Link href="/policies" className="text-2xl font-medium transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  Policies
                </Link>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="resources">
                    <AccordionTrigger className="justify-between items-center gap-2 text-2xl font-medium hover:no-underline transition-colors [&>svg]:size-5 py-0">
                      Resources
                    </AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-5 pt-4 pb-2 pl-2 [&_a]:no-underline">
                      <a 
                        href="https://skyelements.betteruptime.com/"
                        className="text-xl text-muted-foreground hover:text-foreground transition-colors flex items-center justify-start gap-2"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Uptime <ExternalLink className="h-5 w-5" />
                      </a>
                      <a 
                        href="https://github.com/yewshanooi/skyelements"
                        className="text-xl text-muted-foreground hover:text-foreground transition-colors flex items-center justify-start gap-2"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Source Code <ExternalLink className="h-5 w-5" />
                      </a>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Mobile Drawer Auth Footer */}
              <div className="w-full max-w-[280px] mx-auto pt-4 mt-auto border-t border-border/40">
                <UserNav
                  variant="mobile"
                  user={currentUser}
                  onAction={() => setMobileMenuOpen(false)}
                  onOpenSettingsClick={() => {
                    setMobileMenuOpen(false);
                    setSettingsOpen(true);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      </div>

      {currentUser && (
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          user={currentUser}
          signout={signOut}
          onProfileUpdated={(updated) => {
            setCurrentUser(updated);
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("skyelements:profile-updated", { detail: updated }));
            }
          }}
        />
      )}
    </div>
  )
}

function ListItem({
  title,
  children,
  href,
  target,
  ...props
}: Omit<React.ComponentPropsWithoutRef<"li">, "title"> & { 
  href: string
  title: React.ReactNode
  target?: string
}) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link href={href} target={target}>
          <div className="flex flex-col gap-1 text-sm">
            <div className="leading-none font-medium flex items-center gap-1">{title}</div>
            <div className="line-clamp-2 text-muted-foreground">{children}</div>
          </div>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}
