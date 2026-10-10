-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,
    "totalRows" INTEGER,
    "processedRows" INTEGER,
    "failedRows" INTEGER,
    "errorMessage" TEXT,
    "rowErrors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityData" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Upload_userId_createdAt_idx" ON "Upload"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ActivityData_uploadId_idx" ON "ActivityData"("uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityData_uploadId_rowNumber_key" ON "ActivityData"("uploadId", "rowNumber");

-- AddForeignKey
ALTER TABLE "ActivityData" ADD CONSTRAINT "ActivityData_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE CASCADE ON UPDATE CASCADE;
