import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export const metadata: Metadata = {
  title: "Policies",
  description: "How we use cookies and handle your data.",
};

export default function PoliciesPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 pt-16 lg:pt-24">

      <div className="flex flex-col gap-4">
        <h1 className="scroll-m-20 text-3xl text-center font-semibold text-balance">
          Policies
        </h1>
        <p className="text-muted-foreground text-center text-l max-w-3xl">
          How we use cookies and handle your data.
        </p>
      </div>

      <h2 className="mt-16 text-xl font-semibold text-center text-primary">
        Cookie
      </h2>

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

      <h2 className="mt-16 text-xl font-semibold text-center text-primary">
        Privacy
      </h2>

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
