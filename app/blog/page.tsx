import Link from 'next/link';
import type { Metadata } from 'next';
import { BLOG_POSTS } from '@/lib/blog/posts';

export const metadata: Metadata = {
  title: 'Blog | Taskello',
  description:
    'Time tracking for freelancers, estimate vs actual planning, and calm proof of work. Practical guides for solo developers and independent professionals.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Blog | Taskello',
    description:
      'Time tracking for freelancers, estimate vs actual planning, and calm proof of work. Practical guides for solo developers and independent professionals.',
    url: 'https://taskello.app/blog',
    type: 'website',
  },
};

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Blog</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300 leading-relaxed">
          Practical articles about freelance time tracking, estimate vs actual planning, and client-ready proof of work.
        </p>

        <div className="mt-10 space-y-5">
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="block rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5 hover:bg-white/80 dark:hover:bg-slate-950/70 transition"
            >
              <div className="text-sm text-slate-500 dark:text-slate-400">{new Date(p.date).toDateString()}</div>
              <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{p.title}</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{p.description}</div>
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">Read more</div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-sm text-slate-600 dark:text-slate-300">
          Back to{' '}
          <Link href="/" className="underline underline-offset-4">
            Taskello
          </Link>
        </div>
      </div>
    </div>
  );
}
