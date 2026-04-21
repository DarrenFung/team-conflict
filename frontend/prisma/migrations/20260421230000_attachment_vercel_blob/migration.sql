-- Switch Attachment storage from GCS to Vercel Blob.
-- The old GCS bucket is being left in place per infra, but objects there
-- won't be referenced anymore. Existing rows point at GCS paths the app can
-- no longer reach, so drop them rather than fabricating blob URLs.
TRUNCATE TABLE "Attachment";

ALTER TABLE "Attachment" DROP COLUMN "bucket";
ALTER TABLE "Attachment" DROP COLUMN "objectPath";

ALTER TABLE "Attachment" ADD COLUMN "url" TEXT NOT NULL;
ALTER TABLE "Attachment" ADD COLUMN "pathname" TEXT NOT NULL;
