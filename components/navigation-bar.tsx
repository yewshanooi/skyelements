"use client"

import * as React from "react"
import Link from "next/link"
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
import { Separator } from "@/components/ui/separator"
import { SettingsToggle } from "./settings-client";

export function NavigationBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const pathname = usePathname()

  // Get current page name for mobile menu button
  const getCurrentPageName = () => {
    if (pathname === "/") return "Home"
    if (pathname === "/sodium") return "Sodium — About"
    if (pathname === "/commands") return "Sodium — Commands"
    if (pathname === "/branding") return "Branding"
    if (pathname === "/credits") return "Credits"
    if (pathname === "/cookie-policy") return "Cookie Policy"
    return "Page Not Found"
  }

  return (
    <div className="flex justify-center m-5 px-3 py-2">
      {/* Desktop Navigation */}
      <NavigationMenu viewport={false} className="hidden md:flex">
        <NavigationMenuList>

          <NavigationMenuItem>
            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
              <Link href="/">
                Home
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuTrigger>Sodium</NavigationMenuTrigger>
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

        <Separator orientation="vertical" className="mx-4 self-center" />

        {/* Desktop Settings Toggle */}
        <SettingsToggle />
      </NavigationMenu>


      {/* Mobile Navigation */}
      <div className="flex md:hidden w-full max-w-sm gap-4">
        <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="flex-1 justify-between"
              aria-label="Toggle menu"
            >
              <span>{getCurrentPageName()}</span>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="start" 
            className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[70vh] overflow-y-auto"
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
        <SettingsToggle />
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
