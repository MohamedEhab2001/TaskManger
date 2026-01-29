import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BLOG_POSTS, getBlogPostBySlug } from '@/lib/blog/posts';

export async function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = getBlogPostBySlug(params.slug);
  if (!post) return {};

  const url = `https://taskello.app/blog/${post.slug}`;

  return {
    title: `${post.title} | Taskello`,
    description: post.description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | Taskello`,
      description: post.description,
      url,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | Taskello`,
      description: post.description,
    },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPostBySlug(params.slug);
  if (!post) notFound();

  const paragraphs = post.content
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-sm text-slate-500 dark:text-slate-400">{new Date(post.date).toDateString()}</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{post.title}</h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed">{post.description}</p>

        <article className="mt-8 space-y-5">
          {paragraphs.map((p, idx) => (
            <p key={idx} className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {p}
            </p>
          ))}
        </article>

        <div className="mt-10 text-sm text-slate-600 dark:text-slate-300">
          <Link href="/blog" className="underline underline-offset-4">
            Back to blog
          </Link>
        </div>
      </div>
    </div>
  );
}
