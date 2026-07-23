-- CreateTable
CREATE TABLE "ContentReviewDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetKind" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "courseVersion" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "activeKey" TEXT,
    "actor" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "expectedHash" TEXT NOT NULL,
    "proposedHash" TEXT NOT NULL,
    "beforeState" TEXT NOT NULL,
    "afterState" TEXT NOT NULL,
    "failureReason" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentReviewDecision_activeKey_key" ON "ContentReviewDecision"("activeKey");

-- CreateIndex
CREATE INDEX "ContentReviewDecision_targetKind_targetId_createdAt_idx" ON "ContentReviewDecision"("targetKind", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentReviewDecision_status_createdAt_idx" ON "ContentReviewDecision"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContentReviewDecision_actor_createdAt_idx" ON "ContentReviewDecision"("actor", "createdAt");
