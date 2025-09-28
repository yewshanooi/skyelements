"use client"

import * as React from "react"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

export function NavigationBar() {
  return (
    <div className="flex justify-center my-4 px-2">
      <NavigationMenu viewport={false}>
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
                        Open source discord bot with application commands and a user-friendly interface
                      </p>
                    </Link>
                  </NavigationMenuLink>
                </li>
                <ListItem href="https://github.com/yewshanooi/sodium/blob/main/README.md#guides" title="Get Started">
                  Customize & host your own Sodium bot
                </ListItem>
                <ListItem href="https://github.com/yewshanooi/sodium/blob/main/LICENSE" title="License">
                  Sodium is licensed under MIT License
                </ListItem>
                <ListItem href="https://github.com/yewshanooi/sodium" title="Source Code">
                  Check out the source code at GitHub
                </ListItem>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
              <Link href="/commands">
                Commands
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
              <Link href="/cookie-policy">
                Cookie Policy
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
              <a href="https://github.com/yewshanooi/skye" target="_blank" className="flex-row items-center gap-2">
                GitHub <ExternalLink />
              </a>
            </NavigationMenuLink>
          </NavigationMenuItem>
          
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  )
}

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link href={href}>
          <div className="text-sm leading-none font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}
