-- Allow encounters without a User row (landing / pre-sign-in flow).
-- Anonymous sessions prove access with anonymousAccessToken on /api/chat.

ALTER TABLE "Encounter" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Encounter" ADD COLUMN "anonymousAccessToken" TEXT;

CREATE UNIQUE INDEX "Encounter_anonymousAccessToken_key" ON "Encounter"("anonymousAccessToken");
