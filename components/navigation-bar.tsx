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
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ThemeToggle } from "./theme-client";

export function NavigationBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const pathname = usePathname()

  // Hide navigation bar on /lithium
  if (pathname === "/lithium") {
    return null
  }

  return (
    <div className="sticky top-4 z-[60] flex justify-center px-4">
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-gray-200/20 rounded-xl shadow-xs px-6 py-3 w-full max-w-7xl">
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
                    <Link href="/lithium">
                      Lithium
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
                  <NavigationMenuTrigger className="cursor-pointer">Policies</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="w-90">
                      <ListItem href="/cookie-policy" title="Cookie Policy">
                        How we use cookies to improve your experience
                      </ListItem>
                      <ListItem href="/privacy-policy" title="Privacy Policy">
                        How we collect, use, and protect your personal data
                      </ListItem>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="cursor-pointer">Resources</NavigationMenuTrigger>
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

          <div className="flex justify-end">
            <ThemeToggle />
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
            priority
          />
        </Link>
        
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="icon" className="cursor-pointer" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} modal={false}>
            <SheetContent 
              side="top" 
              showCloseButton={false}
              className="h-[100dvh] w-full flex flex-col border-none pt-[140px] pb-8 bg-background"
            >
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">Access all sections of the site.</SheetDescription>
              
              <div className="w-full max-w-[280px] mx-auto flex-1 flex flex-col gap-6 overflow-y-auto overflow-x-hidden scrollbar-hide text-left">
                <Link href="/" className="text-2xl font-medium hover:text-muted-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  Home
                </Link>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="sodium">
                    <AccordionTrigger className="justify-between gap-2 text-2xl font-medium hover:no-underline hover:text-muted-foreground transition-colors [&>svg]:size-5 py-0">
                      Sodium
                    </AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-5 pt-4 pb-2 pl-4">
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
                
                <Link href="/lithium" className="text-2xl font-medium hover:text-muted-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  Lithium
                </Link>
                
                <Link href="/branding" className="text-2xl font-medium hover:text-muted-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  Branding
                </Link>
                
                <Link href="/credits" className="text-2xl font-medium hover:text-muted-foreground transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  Credits
                </Link>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="policies">
                    <AccordionTrigger className="justify-between gap-2 text-2xl font-medium hover:no-underline hover:text-muted-foreground transition-colors [&>svg]:size-5 py-0">
                      Policies
                    </AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-5 pt-4 pb-2 pl-4">
                      <Link href="/cookie-policy" className="text-xl text-muted-foreground hover:text-foreground transition-colors text-left" onClick={() => setMobileMenuOpen(false)}>
                        Cookie Policy
                      </Link>
                      <Link href="/privacy-policy" className="text-xl text-muted-foreground hover:text-foreground transition-colors text-left" onClick={() => setMobileMenuOpen(false)}>
                        Privacy Policy
                      </Link>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="resources">
                    <AccordionTrigger className="justify-between gap-2 text-2xl font-medium hover:no-underline hover:text-muted-foreground transition-colors [&>svg]:size-5 py-0">
                      Resources
                    </AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-5 pt-4 pb-2 pl-4">
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

              <div className="w-full max-w-[280px] mx-auto pt-4 mt-auto flex justify-start">
                <ThemeToggle align="start" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
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
