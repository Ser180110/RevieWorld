import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">404</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="underline">
          RevieWorld
        </Link>
      </p>
    </div>
  );
}
