-- AlterTable
ALTER TABLE "password_reset_tokens" ADD COLUMN "otp_hash" TEXT,
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "email_verification_tokens" ADD COLUMN "otp_hash" TEXT,
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "password_reset_tokens_otp_hash_idx" ON "password_reset_tokens"("otp_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_otp_hash_idx" ON "email_verification_tokens"("otp_hash");
