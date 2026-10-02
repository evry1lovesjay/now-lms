import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = { title: "Terms of use · NowLMS" };

export default function TermsPage() {
  return (
    <InfoPage title="Terms of use" intro="By creating an account or using NowLMS you agree to these terms.">
      <section>
        <h2>Your account</h2>
        <ul>
          <li>Keep your password private. You are responsible for activity on your account.</li>
          <li>Accounts are personal and may not be shared.</li>
          <li>Administrators may disable accounts that break these terms.</li>
        </ul>
      </section>
      <section>
        <h2>Course content</h2>
        <ul>
          <li>Videos, outlines and materials are for your personal learning while you are enrolled.</li>
          <li>Do not download, record, copy or redistribute course videos or materials.</li>
          <li>Submitted assignments must be your own work.</li>
        </ul>
      </section>
      <section>
        <h2>Changes</h2>
        <p>We may update these terms. Continuing to use NowLMS after a change means you accept the updated terms.</p>
      </section>
    </InfoPage>
  );
}
