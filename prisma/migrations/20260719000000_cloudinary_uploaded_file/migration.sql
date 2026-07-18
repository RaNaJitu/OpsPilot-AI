-- AlterTable: replace local path with Cloudinary fields
ALTER TABLE "UploadedFile" ADD COLUMN "fileUrl" TEXT;
ALTER TABLE "UploadedFile" ADD COLUMN "publicId" TEXT;

-- Existing local-path rows cannot be recovered on serverless; clear them if present
UPDATE "UploadedFile" SET "fileUrl" = COALESCE("fileUrl", ''), "publicId" = COALESCE("publicId", "id") WHERE "fileUrl" IS NULL OR "publicId" IS NULL;

ALTER TABLE "UploadedFile" ALTER COLUMN "fileUrl" SET NOT NULL;
ALTER TABLE "UploadedFile" ALTER COLUMN "publicId" SET NOT NULL;

CREATE UNIQUE INDEX "UploadedFile_publicId_key" ON "UploadedFile"("publicId");

ALTER TABLE "UploadedFile" DROP COLUMN IF EXISTS "path";
