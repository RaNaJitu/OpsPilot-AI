-- DropIndex
DROP INDEX IF EXISTS "UploadedFile_checksum_key";

-- DropIndex
DROP INDEX IF EXISTS "UploadedFile_fileDeleted_idx";

-- AlterTable
ALTER TABLE "UploadedFile" DROP COLUMN IF EXISTS "fileDeleted";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UploadedFile_checksum_idx" ON "UploadedFile"("checksum");
