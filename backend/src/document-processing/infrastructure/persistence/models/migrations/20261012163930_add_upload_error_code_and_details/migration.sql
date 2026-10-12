-- AlterTable
ALTER TABLE "Upload" ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "errorDetails" JSONB;
