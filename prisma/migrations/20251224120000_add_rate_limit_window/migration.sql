-- CreateTable
CREATE TABLE "RateLimitWindow" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitWindow_key_windowStart_key" ON "RateLimitWindow"("key", "windowStart");
CREATE INDEX "RateLimitWindow_key_idx" ON "RateLimitWindow"("key");
CREATE INDEX "RateLimitWindow_resetAt_idx" ON "RateLimitWindow"("resetAt");
