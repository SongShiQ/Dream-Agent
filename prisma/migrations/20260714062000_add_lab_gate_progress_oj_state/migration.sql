-- Add OJ gate progress and audited verdict state.
-- Historical CodeSubmission rows came from static analysis, so they are
-- migrated as STATIC feedback and never preserved as passed evidence.

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "assistantPathCompletedAt" DATETIME;

-- CreateTable
CREATE TABLE "LabGateProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "gateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'locked',
    "passedAt" DATETIME,
    "bestVerdict" TEXT,
    "passSubmitId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LabGateProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'chat',
    "title" TEXT NOT NULL DEFAULT '新会话',
    "summary" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChatSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CodeSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "labName" TEXT NOT NULL,
    "gateId" TEXT NOT NULL DEFAULT '',
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'rust',
    "testResult" TEXT NOT NULL DEFAULT '',
    "verdict" TEXT NOT NULL DEFAULT 'PENDING',
    "judgeKind" TEXT NOT NULL DEFAULT 'none',
    "judgeLog" TEXT NOT NULL DEFAULT '',
    "isPassed" BOOLEAN NOT NULL DEFAULT false,
    "feedback" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CodeSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CodeSubmission" (
    "code",
    "createdAt",
    "feedback",
    "gateId",
    "id",
    "isPassed",
    "judgeKind",
    "judgeLog",
    "labName",
    "language",
    "studentId",
    "testResult",
    "verdict"
)
SELECT
    "code",
    "createdAt",
    "feedback",
    "labName",
    "id",
    false,
    'none',
    '',
    "labName",
    "language",
    "studentId",
    "testResult",
    'STATIC'
FROM "CodeSubmission";
DROP TABLE "CodeSubmission";
ALTER TABLE "new_CodeSubmission" RENAME TO "CodeSubmission";
CREATE INDEX "CodeSubmission_studentId_idx" ON "CodeSubmission"("studentId");
CREATE INDEX "CodeSubmission_labName_idx" ON "CodeSubmission"("labName");
CREATE INDEX "CodeSubmission_gateId_idx" ON "CodeSubmission"("gateId");
CREATE INDEX "CodeSubmission_verdict_idx" ON "CodeSubmission"("verdict");
CREATE INDEX "CodeSubmission_createdAt_idx" ON "CodeSubmission"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LabGateProgress_studentId_status_idx" ON "LabGateProgress"("studentId", "status");

-- CreateIndex
CREATE INDEX "LabGateProgress_gateId_idx" ON "LabGateProgress"("gateId");

-- CreateIndex
CREATE UNIQUE INDEX "LabGateProgress_studentId_gateId_key" ON "LabGateProgress"("studentId", "gateId");

-- CreateIndex
CREATE INDEX "ChatSession_studentId_mode_idx" ON "ChatSession"("studentId", "mode");

-- CreateIndex
CREATE INDEX "ChatSession_updatedAt_idx" ON "ChatSession"("updatedAt");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");
