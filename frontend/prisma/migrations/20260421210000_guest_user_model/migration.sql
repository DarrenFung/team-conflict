-- Allow guests: email is no longer required, and clerkId is added as the
-- nullable, unique link to Clerk identity once claimed.

-- Existing rows whose `id` happens to be a Clerk id become orphans under the
-- new model (new sign-ins won't match them via clerkId). In the hackathon
-- context the data is disposable, so wipe it here.
TRUNCATE TABLE "Document", "Encounter", "User" RESTART IDENTITY CASCADE;

ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "clerkId" TEXT;

CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");
