import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homePathFor } from "@/lib/roles";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));

  return (
    <div className="card mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-semibold">Create your student account</h1>
      <p className="mb-6 text-sm text-slate-600">Tutors and admins are invited by an administrator.</p>
      <RegisterForm />
      <p className="mt-6 text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
