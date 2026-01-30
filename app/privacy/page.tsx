import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Privacy Policy | OneDay Capital",
  description: "OneDay Capital Terms & Privacy Policy - how we collect, use, and protect your information.",
};

export default function PrivacyPolicy() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto prose prose-slate prose-headings:font-heading prose-headings:font-bold prose-headings:text-[var(--brand-black)] prose-a:text-[var(--brand-blue)]">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-[var(--brand-black)] mb-8">
            Terms & Privacy Policy
          </h1>

          <p className="text-slate-600 leading-relaxed mb-6">
            OneDay Capital (&quot;OneDayCap&quot;) matches small businesses and small business
            owners with alternative sources of funding (&quot;Funding Providers&quot;) through our
            website www.onedaycap.com. This Privacy Policy describes the information
            OneDay Capital. (&quot;OneDay Capital,&quot; &quot;we,&quot; &quot;us&quot; or &quot;our&quot;) collects information
            about you, how we use and share that information, and the privacy choices we
            offer. This policy applies to information we collect when you register for OneDay
            Capital&apos;s funding matching service, access or use our website, mobile
            applications, products, and services (collectively, the &quot;Services&quot;), or when you
            otherwise interact with us. As used in this Privacy Policy, the term &quot;Site&quot;
            includes: all websites and all devices or applications operated by OneDay Capital
            that collect personal information from you and that link to this Privacy Policy;
            pages within each such website, device, or application, any equivalent, mirror,
            replacement, substitute, or backup website, device, or application; and pages
            that are associated with each such website, device, or application. The use of
            the word &quot;including&quot; in this Agreement to refer to specific examples will be
            construed to mean &quot;including, without limitation&quot; or &quot;including but not limited
            to&quot; and will not be construed to mean that the examples given are an exclusive
            list of the topics covered. By accessing the Site and by using the Service, you
            agree to, and are bound by, the terms and conditions of this Privacy Policy. If
            you do not agree to this privacy policy, you may not access or otherwise use
            this site or service.
          </p>

          <ol className="list-decimal pl-6 space-y-6 text-slate-600 leading-relaxed">
            <li>
              <strong className="text-[var(--brand-black)]">Collection of Information.</strong> OneDay Capital may collect the following categories
              of personal information about you, including but not limited to the following:
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li><strong>Registration Information:</strong> When you register for the Service, you will be asked for basic registration information, such as a username and password.</li>
                <li><strong>Identification Information:</strong> You may also be asked to provide identification information to confirm your identity, including your first and last name and certain financial information.</li>
                <li><strong>Application Information:</strong> You may also be asked to provide additional information that will be provided to OneDay Capital&apos;s Funding Providers in connection with your applications for funding from such Funding Providers, including certain financial information and other documents required by Funding Providers to complete an application.</li>
                <li><strong>Third-Party Credentials:</strong> You may also enter in certain passwords, usernames, account numbers, and other account information for third-party sites and Internet services (&quot;Third-Party Sites&quot;).</li>
                <li><strong>Information from Third-Party Sites:</strong> In order to display information to you or to fulfill your requests for certain products and services through a Service, we may collect, on your behalf, your account and other personal information from Third-Party Sites that you register under your account via the Service. We may also collect information about you from credit bureaus, mailing list providers, publicly available sources, and other third parties.</li>
                <li><strong>Information Collected by Cookies and Web Beacons:</strong> We use various technologies to collect information, and this may include sending cookies to your computer or mobile device. Cookies are small data files that are stored on your hard drive or in device memory by a website. Among other things, cookies support the integrity of our registration process, retain your preferences and account settings, and help evaluate and compile aggregated statistics about user activity. We may also collect information using web beacons. Web beacons are electronic images that may be used in our Services or emails. We may use web beacons to deliver cookies, count visits, understand usage, and determine whether an email has been opened and acted upon.</li>
                <li><strong>Technical and Navigational Information:</strong> We may collect your computer browser type, Internet protocol address, pages visited, and average time spent on our Site. This information may be used, for example, to alert you to software compatibility issues, or it may be analyzed to improve our web design and functionality.</li>
              </ul>
            </li>

            <li>
              <strong className="text-[var(--brand-black)]">Use of Your Information.</strong> We may use the information you provide about
              yourself and about your Third-Party Sites to fulfill your requests for our
              Services, to respond to your inquiries about our Services, and to offer you other
              products, programs, or services that we believe may be of interest to you. We
              may use your information to complete transactions you request, to verify the
              existence and condition of your accounts, or to assist with a transaction. For
              example, we may use the account information you provide or that we collect
              from Third-Party Sites to confirm your accounts are valid. We may use your
              information to improve and personalize the Services and any related services,
              including future products and services. For example, we may use your
              information to pre-fill form fields on the Sites for your convenience.
            </li>

            <li>
              <strong className="text-[var(--brand-black)]">Sharing of Information.</strong> We may share personal information about you as
              follows:
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>With your consent and approval, to third-party credit reporting services when we request a credit report on your behalf or to Funding Providers in connection with your application for funding;</li>
                <li>With third parties to provide, maintain, and improve our Services;</li>
                <li>In connection with, or during the negotiation of, any merger, sale of company stock or assets, financing, acquisition, divestiture, or dissolution of all or a portion of our business;</li>
                <li>To respond to subpoenas, court orders, or legal process;</li>
                <li>In order to investigate, prevent, defend against, or take other action regarding violations of our Terms of Service, illegal activities, suspected fraud, or situations involving potential threats to the legal rights or physical safety of any person or the security of our network, Sites or Services;</li>
                <li>Non-personalized, anonymous data may be aggregated with data from other users and other data sources may be collected and shared with partners or for marketing purposes;</li>
                <li>To respond to claims that any posting or other content violates the rights of third parties;</li>
                <li>In an emergency, to protect the health and safety of our Sites&apos; users or the general public; or</li>
                <li>As otherwise required by law.</li>
              </ul>
            </li>

            <li>
              <strong className="text-[var(--brand-black)]">Security.</strong> We take reasonable measures, including firewall barriers, SSL
              encryption techniques, and authentication procedures, to help protect personal
              information from loss, theft, misuse, and unauthorized access, disclosure,
              alteration, and destruction. You acknowledge, however, that no system is
              perfectly secure and that, despite OneDay Capital&apos;s efforts to protect your
              personal information, OneDay Capital cannot guarantee that personal
              information may not be accessed, disclosed, altered or destroyed through a
              breach of our administrative, managerial and technical safeguards. Accordingly,
              we urge you to take adequate precautions to protect your personal information
              such as refusing to share your OneDay Capital password and log-in credentials
              with anyone.
            </li>

            <li>
              <strong className="text-[var(--brand-black)]">Email Communications.</strong> We may provide our registered customers with email
              alerts and summaries of their activity on the Service. We may also allow users
              to subscribe to email newsletters and from time to time may transmit emails
              promoting OneDay Capital or third-party goods or services. Registered
              customers have the ability to opt out of receiving our promotional emails and to
              terminate their newsletter subscriptions by following the instructions in the
              emails. Opting out in this manner will not end transmission of service-related
              emails, such as email alerts.
            </li>

            <li>
              <strong className="text-[var(--brand-black)]">SMS / 10DLC Compliance and Text Messaging.</strong> OneDay Capital may operate SMS programs to communicate with merchants and
              prospects regarding funding readiness, reminders, and offers. To comply with 10DLC
              and carrier rules, we follow these practices:
              <p className="mt-3"><strong>SMS Opt-In:</strong> When you submit a form on the Site that includes your mobile number, you may be
              given the option to opt in to receive SMS messages from OneDay Capital by checking a
              consent checkbox and/or clicking &quot;Submit.&quot; A typical consent text may state:
              &quot;By checking this box, you consent to receive SMS messages from OneDay Capital for
              marketing or promotional purposes. Message frequency may vary. Message and data
              rates may also apply. You can opt out at any time by replying STOP. For assistance,
              reply HELP or contact us. For more information, please check the Privacy Policy.&quot;</p>
              <p className="mt-3"><strong>Required SMS Privacy Statements:</strong> In connection with our SMS programs: We do not sell, rent, or share your SMS opt-in information with third parties for their marketing purposes. You may receive up to 3 SMS messages per week. Standard message and data rates may apply as determined by your carrier. You may opt out of SMS messages at any time by replying STOP. For assistance, reply HELP or contact us at subs@onedaycap.com. These commitments apply specifically to SMS opt-in data and are in addition to the broader data-sharing practices described elsewhere in this Policy.</p>
              <p className="mt-3"><strong>Opt-Out &amp; Support:</strong> To stop receiving SMS messages, text STOP to any OneDay Capital message. To get help regarding our SMS program, text HELP or contact us at subs@onedaycap.com. After you opt out, you may still receive non-marketing, transactional messages where permitted by law (e.g., critical account, security, or legal notices).</p>
            </li>

            <li>
              <strong className="text-[var(--brand-black)]">Cookies and Tracking Technologies.</strong> We may use cookies, pixels, and similar technologies to: Recognize you when you return to our Site; Keep you logged in to secure areas; Understand how the Site is used and improve user experience; Personalize content and measure marketing performance. You can adjust your browser settings to refuse cookies or alert you when cookies are being sent. Some features of the Site may not work properly if cookies are disabled.
            </li>

            <li>
              <strong className="text-[var(--brand-black)]">Changes to Your Personal Information.</strong> If you wish to access personal
              information that you have submitted to us or to request the correction of any
              inaccurate information you have submitted to us, you may correct certain
              information via your user account. Alternatively, you can contact us at
              admin@onedaycap.com to request any corrections to your personal information.
              You may also email us if you wish to deregister, but even after you deregister,
              we may retain archived copies of information about you for a period of time that
              is consistent with applicable law.
            </li>

            <li>
              <strong className="text-[var(--brand-black)]">California Privacy Rights.</strong> California Civil Code Section 1798.83, also known
              as the &quot;Shine The Light&quot; law, permits our customers who are California
              residents to request and obtain from us once a year, free of charge, information
              about the personal information (if any) we disclosed to third parties for direct
              marketing purposes in the preceding calendar year. If you are a California
              resident and would like to make such a request, please submit your request to
              admin@onedaycap.com. In your request, please attest to the fact that you are a
              California resident and provide a current California address for our response.
              Please be aware that not all information sharing is covered by the California
              Privacy Rights requirements and only information on covered sharing will be
              included in our response.
            </li>

            <li>
              <strong className="text-[var(--brand-black)]">Changes to Privacy Policy.</strong> We reserve the right, at our sole discretion, to
              make changes to this Privacy Policy from time to time, so please review it
              frequently. You may review updates to our Terms of Service and Privacy Policy
              at any time via links on <Link href="https://onedaycap.com/">https://onedaycap.com/</Link>. Consistent with our Terms of
              Service, you agree to accept electronic communications and/or postings of
              revised versions of this Privacy Policy on <Link href="https://onedaycap.com/">https://onedaycap.com/</Link> and agree that
              such electronic communications or postings constitute notice to you of the
              revised version of this Privacy Policy. Changes take effect immediately upon
              posting.
            </li>
          </ol>

          <p className="mt-10 text-slate-500 text-sm">
            <Link href="/" className="text-[var(--brand-blue)] hover:underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
