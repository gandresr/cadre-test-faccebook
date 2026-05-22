import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 p-12 font-sans dark:bg-black">
      <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Social Network 1.0
      </h1>
      <p className="max-w-md text-center text-lg leading-7 text-zinc-600 dark:text-zinc-400">
        Hello, world. Scaffold is live — Auth0 login coming in P1.
      </p>
      <Link
        href="/api/health"
        className="rounded-full bg-black px-5 py-2 text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
      >
        Check API health
      </Link>
    </main>
  );
}
