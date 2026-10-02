import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { SUPPORT_EMAIL } from "@/components/site-footer";

export const metadata: Metadata = { title: "Contact & support · NowLMS" };

export default function ContactPage() {
  return (
    <InfoPage title="Contact & support" intro="Questions about a course, your account or a technical problem? We are happy to help.">
      <section>
        <h2>Email us</h2>
        <p>
          Write to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand-700 hover:underline">
            {SUPPORT_EMAIL}
          </a>{" "}
          and we will reply within two working days.
        </p>
      </section>
      <section>
        <h2>Common questions</h2>
        <ul>
          <li>
            <strong>My account is disabled.</strong> Accounts are disabled by an administrator. Email us from the address you
            registered with and we will look into it.
          </li>
          <li>
            <strong>A video will not play.</strong> Make sure you are signed in and enrolled in the course, then refresh the page.
            Videos stream only inside NowLMS and cannot be downloaded.
          </li>
          <li>
            <strong>I need help with an assignment.</strong> Contact your course tutor through the live class or course resources
            links on the course page.
          </li>
        </ul>
      </section>
    </InfoPage>
  );
}
