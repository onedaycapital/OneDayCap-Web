import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-slate-50 text-center">
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Page not found</h1>
      <p className="text-slate-600 mb-6">The page you’re looking for doesn’t exist.</p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-full font-medium text-white bg-[var(--brand-blue)] hover:opacity-90 transition-opacity"
      >
        Go home
      </Link>
    </div>
  );
}
