import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">The page you are looking for does not exist.</p>
      <Link href="/" className="btn-primary mt-4">
        Go home
      </Link>
    </div>
  );
}
