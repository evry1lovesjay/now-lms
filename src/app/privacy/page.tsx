import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { SUPPORT_EMAIL } from "@/components/site-footer";

export const metadata: Metadata = { title: "Privacy policy · NowLMS" };

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy policy" intro="This page explains what information NowLMS keeps about you and why.">
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Your name, email address and a securely hashed password (we never store the password itself).</li>
          <li>Your enrolments, lesson progress, assignment submissions and grades.</li>
          <li>Files you upload, such as assignment submissions.</li>
          <li>A record of administrative actions, such as accounts being blocked or unblocked.</li>
        </ul>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>
          We use one cookie to keep you signed in and one to remember your light or dark theme. We do not use advertising or
          tracking cookies.
        </p>
      </section>
      <section>
        <h2>How we use it</h2>
        <p>
          Only to run your courses: showing your progress, letting tutors grade your work and keeping accounts secure. We do not
          sell your information. Course videos show your email address as a watermark to discourage sharing.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          To see, correct or delete your information, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand-700 hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>
    </InfoPage>
  );
}
