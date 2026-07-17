/*
  Warnings:

  - Made the column `path` on table `UploadedFile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `checksum` on table `UploadedFile` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "UploadedFile" ALTER COLUMN "path" SET NOT NULL,
ALTER COLUMN "checksum" SET NOT NULL;
