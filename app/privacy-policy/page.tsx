import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How we collect, use, and protect your personal data",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 pt-16 lg:pt-24">

      <div className="flex flex-col gap-4">
        <h1 className="scroll-m-20 text-3xl text-center font-semibold text-balance">
          Privacy Policy
        </h1> 
        <p className="text-muted-foreground text-center text-l max-w-3xl">
          How we collect, use, and protect your personal data.
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
            <AccordionTrigger>Summary</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 text-balance">
              <p>
                This privacy policy (&quot;policy&quot;) will help you understand how SkyElements (&quot;us&quot;, &quot;we&quot;,
                &quot;our&quot;) uses and protects the data you provide to us when you visit and use
                https://skyelements.vercel.app/ (&quot;website&quot;, &quot;service&quot;).
              </p>
              <p>
                We reserve the right to change this policy at any given time, of which you will be
                promptly updated. If you want to make sure that you are up to date with the latest
                changes, we advise you to frequently visit this page.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>What user data we collect</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 text-balance">
              <p>When you visit the website, we may collect the following data:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Your browser information.</li>
                <li>Your email address.</li>
                <li>Other information such as interests and preferences.</li>
                <li>Data profile regarding your online behavior on our website.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Why we collect your data</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 text-balance">
              <p>We are collecting your data for several reasons:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>To provide you with the services.</li>
                <li>To improve our services and products.</li>
                <li>To customize our website according to your online behavior and personal preferences.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger>Safeguarding and securing the data</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 text-balance">
              <p>
                SkyElements is committed to securing your data and keeping it confidential.
                SkyElements has done all in its power to prevent data theft, unauthorized access,
                and disclosure by implementing the latest technologies and software, which help us
                safeguard all the information we collect online.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-5">
            <AccordionTrigger>Links to other websites</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 text-balance">
              <p>
                Our website contains links that lead to other websites. If you click on these links
                SkyElements is not held responsible for your data and privacy protection. Visiting those
                websites is not governed by this privacy policy agreement. Make sure to read the
                privacy policy documentation of the website you go to from our website.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-6">
            <AccordionTrigger>Restricting the collection of your personal data</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 text-balance">
              <p>
                At some point, you might wish to restrict the use and collection of your personal data.
                You can achieve this by doing the following:
              </p>
              <p>
                When you are filling the forms on the website, make sure to check if there is a box which
                you can leave unchecked, if you don&apos;t want to disclose your personal information.
              </p>
              <p>
                If you have already agreed to share your information with us, feel free to contact us via
                email and we will be more than happy to change this for you.
              </p>
              <p>
                SkyElements will not lease, sell or distribute your personal information to any third
                parties, unless we have your permission. We might do so if the law forces us. Your
                personal information will be used when we need to send you important announcements if
                you agree to this privacy policy.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

    </main>
  );
}
