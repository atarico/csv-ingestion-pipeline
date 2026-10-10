import { UploadList } from '@/features/document-processing/components/UploadList';
import { parsePageParam } from '@/shared/lib/pagination';

export default async function UploadsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  return <UploadList page={parsePageParam(page)} />;
}
