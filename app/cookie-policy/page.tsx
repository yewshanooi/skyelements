import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Some of the ways our website collects your data",
};

export default function CookiePolicyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 pt-16 lg:pt-24">

      <div className="flex flex-col gap-4">
        <h1 className="scroll-m-20 text-3xl text-center font-semibold text-balance">
          Cookie Policy
        </h1> 
        <p className="text-muted-foreground text-center text-l max-w-3xl">
          Some of the ways our website collects your data.
        </p>
      </div>

      <div className="w-full max-w-3xl mx-auto mt-12">
        <Accordion
          type="single"
          collapsible
          className="w-full"
          // defaultValue="item-1"
        >
          <AccordionItem value="item-1">
            <AccordionTrigger>What are cookies</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 text-balance">
              <p>
                As is common practice with almost all professional websites, this site uses cookies, which are tiny files that are downloaded to your computer, to improve your experience. This page describes what information they gather, how we use it, and why we sometimes need to store these cookies. We will also share how you can prevent these cookies from being stored; however, this may downgrade or &apos;break&apos; certain elements of the site&apos;s functionality.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>How do we use cookies</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 text-balance">
              <p>
                We use cookies for a variety of reasons, detailed below. Unfortunately, in most cases, there are no industry-standard options for disabling cookies without completely disabling the functionality and features they add to this site. It is recommended that you leave on all cookies if you are not sure whether you need them or not, in case they are used to provide a service that you use.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Forms related cookies</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 text-balance">
              <p>
                When you submit data through a form such as those found on contact pages or comment forms, cookies may be set to remember your user details for future correspondence.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger>Third party cookies</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 text-balance">
              <p>
                In some special cases, we also use cookies provided by trusted third parties. Third-party analytics are used to track and measure usage of this site so that we can continue to produce engaging content. These cookies may track things such as how long you spend on the site or pages you visit, which helps us understand how we can improve the site for you.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-5">
            <AccordionTrigger>Disabling cookies</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 text-balance">
              <p>
                You can prevent the setting of cookies by adjusting the settings on your browser (see your browser&apos;s Help for how to do this). Be aware that disabling cookies will affect the functionality of this and many other websites that you visit. Disabling cookies will usually also result in certain functionality and features of this site being disabled. Therefore, it is recommended that you do not disable cookies.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-6">
            <AccordionTrigger>More information</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 text-balance">
              <p>
                Hopefully that has clarified things for you, and as was previously mentioned, if there is something that you aren&apos;t sure whether you need or not, it&apos;s usually safer to leave cookies enabled in case it does interact with one of the features you use on our site.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

    </main>
  );
}
