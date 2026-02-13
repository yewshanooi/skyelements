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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { SettingsToggle } from "./settings-client";

interface NavigationBarProps {
  userEmail?: string | null;
  signout?: () => Promise<void>;
}

export function NavigationBar({ userEmail, signout }: NavigationBarProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const pathname = usePathname()

  // Hide navigation bar on /chat and protected routes when not authenticated
  if (pathname === "/chat" || (pathname === "/skye" && !userEmail)) {
    return null
  }

  return (
    <div className="sticky top-4 z-50 flex justify-center px-4">
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-gray-200/20 rounded-xl shadow-xs px-6 py-3 w-full max-w-7xl">
        {/* Desktop Navigation */}
        <div className="hidden lg:grid grid-cols-3 items-center gap-8">
          <div className="flex justify-start">
            <Link href="/" className="flex-shrink-0">
              <Image 
                src="/logo/skyelements.png" 
                alt="SkyElements Logo" 
                width={160} 
                height={55}
                // className="hover:opacity-80 transition-opacity"
              />
            </Link>
          </div>

          <div className="flex justify-center">
            <NavigationMenu viewport={false}>
              <NavigationMenuList>

            <NavigationMenuItem>
              <NavigationMenuTrigger className="cursor-pointer">Sodium</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid gap-2 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                  <li className="row-span-3">
                    <NavigationMenuLink asChild>
                      <Link
                        href="/sodium"
                        className="from-muted/50 to-muted flex h-full w-full flex-col justify-end rounded-md bg-linear-to-b p-6 no-underline outline-hidden select-none focus:shadow-md"
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
                <Link href="/cookie-policy">
                  Cookie Policy
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <a href="https://github.com/yewshanooi/skyelements" target="_blank" className="flex-row items-center gap-2">
                  GitHub <ExternalLink />
                </a>
              </NavigationMenuLink>
            </NavigationMenuItem>
            
          </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="flex justify-end">
            <SettingsToggle userEmail={userEmail} signout={signout} />
          </div>
        </div>


      {/* Mobile Navigation */}
      <div className="flex lg:hidden w-full items-center gap-2">
        <Link href="/" className="flex-shrink-0">
          <Image 
            src="/logo/skyelements.png" 
            alt="SkyElements Logo" 
            width={160} 
            height={55}
          />
        </Link>
        
        <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="cursor-pointer ml-auto">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-50 max-h-[70vh] overflow-y-auto"
          >
            <DropdownMenuItem asChild>
              <Link href="/" className="w-full cursor-pointer">
                Home
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            
            <div className="px-2 py-1.5">
              <div className="text-sm font-semibold mb-2 text-muted-foreground">Sodium</div>
              <DropdownMenuItem asChild>
                <Link href="/sodium" className="w-full cursor-pointer pl-4">
                  About
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/commands" className="w-full cursor-pointer pl-4">
                  Commands
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a 
                  href="https://github.com/yewshanooi/sodium/blob/main/README.md#guides"
                  className="w-full cursor-pointer pl-4"
                  target="_blank"
                >
                  Get Started <ExternalLink className="h-4 w-4" />
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a 
                  href="https://github.com/yewshanooi/sodium/blob/main/LICENSE"
                  className="w-full cursor-pointer pl-4"
                  target="_blank"
                >
                  License <ExternalLink className="h-4 w-4" />
                </a>
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/branding" className="w-full cursor-pointer">
                Branding
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/credits" className="w-full cursor-pointer">
                Credits
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/cookie-policy" className="w-full cursor-pointer">
                Cookie Policy
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <a 
                href="https://github.com/yewshanooi/skyelements"
                className="w-full cursor-pointer flex items-center gap-2"
                target="_blank"
              >
                GitHub <ExternalLink className="h-4 w-4" />
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mobile Settings Toggle */}
        <SettingsToggle userEmail={userEmail} signout={signout} />
      </div>
      </div>
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
          <div className="text-sm leading-none font-medium flex items-center gap-1">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}
