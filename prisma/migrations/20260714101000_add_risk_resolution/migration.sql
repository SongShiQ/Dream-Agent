-- CreateTable
CREATE TABLE "RiskResolution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "riskId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "note" TEXT NOT NULL DEFAULT '',
    "handledBy" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "RiskResolution_riskId_key" ON "RiskResolution"("riskId");

-- CreateIndex
CREATE INDEX "RiskResolution_status_idx" ON "RiskResolution"("status");

-- CreateIndex
CREATE INDEX "RiskResolution_updatedAt_idx" ON "RiskResolution"("updatedAt");
