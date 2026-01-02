-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('PENDING', 'CONFIRMED', 'APPROVED', 'DECLINED');

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'PENDING',
    "confirmationTokenHash" TEXT,
    "confirmationExpiresAt" TIMESTAMP(3),
    "confirmationSentAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "source" TEXT,
    "language" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_email_key" ON "WaitlistEntry"("email");

-- CreateIndex
CREATE INDEX "WaitlistEntry_status_confirmedAt_idx" ON "WaitlistEntry"("status", "confirmedAt");
