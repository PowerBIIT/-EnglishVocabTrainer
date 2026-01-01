-- CreateTable
CREATE TABLE "AiRequestLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "languagePair" TEXT,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "inputCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorType" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDailyStats" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "languagePair" TEXT,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgDurationMs" INTEGER NOT NULL DEFAULT 0,
    "maxDurationMs" INTEGER NOT NULL DEFAULT 0,
    "minDurationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiDailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGlobalDailyStats" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgDurationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiGlobalDailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contextSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiRequestLog_userId_createdAt_idx" ON "AiRequestLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiRequestLog_feature_createdAt_idx" ON "AiRequestLog"("feature", "createdAt");

-- CreateIndex
CREATE INDEX "AiRequestLog_createdAt_idx" ON "AiRequestLog"("createdAt");

-- CreateIndex
CREATE INDEX "AiRequestLog_sessionId_idx" ON "AiRequestLog"("sessionId");

-- CreateIndex
CREATE INDEX "AiDailyStats_date_idx" ON "AiDailyStats"("date");

-- CreateIndex
CREATE INDEX "AiDailyStats_userId_date_idx" ON "AiDailyStats"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyStats_date_userId_feature_model_key" ON "AiDailyStats"("date", "userId", "feature", "model");

-- CreateIndex
CREATE INDEX "AiGlobalDailyStats_date_idx" ON "AiGlobalDailyStats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AiGlobalDailyStats_date_feature_model_key" ON "AiGlobalDailyStats"("date", "feature", "model");

-- CreateIndex
CREATE INDEX "RevenueChatMessage_sessionId_createdAt_idx" ON "RevenueChatMessage"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiRequestLog" ADD CONSTRAINT "AiRequestLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyStats" ADD CONSTRAINT "AiDailyStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
