-- DropIndex
DROP INDEX "UploadedFile_checksum_idx";

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "errorMessage" TEXT;

-- AlterTable
ALTER TABLE "UploadedFile" DROP COLUMN "checksum";

