import { UploadList } from '@/features/document-processing/components/UploadList';

export default async function UploadsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  return <UploadList page={Number(page ?? '1') || 1} />;
}
