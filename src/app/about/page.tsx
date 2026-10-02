import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = { title: "About us · NowLMS" };

export default function AboutPage() {
  return (
    <InfoPage title="About NowLMS" intro="We help people move into tech with focused, practical courses taught by working professionals.">
      <section>
        <h2>What we teach</h2>
        <p>
          Four career tracks: Software Quality Assurance, Data Analytics, Product Management and Product Design. Each course pairs
          recorded video lessons with a course outline, materials, resources, live classes and graded assignments.
        </p>
      </section>
      <section>
        <h2>How it works</h2>
        <ul>
          <li>Enrol in a course and work through the lessons at your own pace.</li>
          <li>Your tutor posts assignments, reviews your submissions and grades them.</li>
          <li>Track your progress on your dashboard as you complete each lesson.</li>
        </ul>
      </section>
      <p>
        <Link href="/courses" className="btn-primary">
          Explore the courses
        </Link>
      </p>
    </InfoPage>
  );
}
