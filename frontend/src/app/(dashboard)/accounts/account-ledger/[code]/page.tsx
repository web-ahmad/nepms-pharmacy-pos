import ClientPage from './page-client';
import { Suspense } from 'react';

export function generateStaticParams() {
  return [{ code: '1' }];
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>}>
      <ClientPage />
    </Suspense>
  );
}
