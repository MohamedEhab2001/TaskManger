import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getClientShareByTokenPublic } from '@/lib/actions/clientShare';
import ShareClientReport from './share-client-report';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function SharePage({ params }: { params: { token: string } }) {
  const res = await getClientShareByTokenPublic(params.token);

  if (res.status === 'not_found') notFound();

  if (res.status === 'expired') {
    return (
      <ShareClientReport
        mode="expired"
        initialLanguage="en"
        title={res.title}
      />
    );
  }

  return (
    <ShareClientReport
      mode="ok"
      initialLanguage={res.data.defaultLanguage}
      title={res.data.title}
      tagName={res.tagName}
      data={res.data}
    />
  );
}
