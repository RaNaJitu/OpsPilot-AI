-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "checksum" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "UploadedFile_checksum_key" ON "UploadedFile"("checksum");

