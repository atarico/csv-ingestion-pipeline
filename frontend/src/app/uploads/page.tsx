import { UploadList } from '@/features/document-processing/components/UploadList';
import { parseOutcomeParam } from '@/features/document-processing/lib/outcomes';
import { parsePageParam } from '@/shared/lib/pagination';

export default async function UploadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; outcome?: string }>;
}) {
  const { page, outcome } = await searchParams;
  return <UploadList page={parsePageParam(page)} outcome={parseOutcomeParam(outcome)} />;
}
