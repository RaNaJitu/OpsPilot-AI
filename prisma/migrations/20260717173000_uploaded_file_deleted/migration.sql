-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "fileDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "UploadedFile_fileDeleted_idx" ON "UploadedFile"("fileDeleted");

