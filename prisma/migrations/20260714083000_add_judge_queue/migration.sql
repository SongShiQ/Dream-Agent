-- CreateTable
CREATE TABLE "JudgeJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "gateId" TEXT NOT NULL,
    "judgeKind" TEXT NOT NULL DEFAULT 'unit_oj',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 2,
    "leaseOwner" TEXT,
    "leaseUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JudgeJob_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CodeSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JudgeRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "verdict" TEXT NOT NULL DEFAULT 'PENDING',
    "status" TEXT NOT NULL DEFAULT 'completed',
    "publicLog" TEXT NOT NULL DEFAULT '',
    "rawLog" TEXT NOT NULL DEFAULT '',
    "exitCode" INTEGER,
    "timeMs" INTEGER,
    "memoryKb" INTEGER,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JudgeRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JudgeJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JudgeRun_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CodeSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "JudgeJob_submissionId_key" ON "JudgeJob"("submissionId");

-- CreateIndex
CREATE INDEX "JudgeJob_status_priority_createdAt_idx" ON "JudgeJob"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "JudgeJob_studentId_gateId_idx" ON "JudgeJob"("studentId", "gateId");

-- CreateIndex
CREATE INDEX "JudgeJob_submissionId_idx" ON "JudgeJob"("submissionId");

-- CreateIndex
CREATE INDEX "JudgeRun_jobId_idx" ON "JudgeRun"("jobId");

-- CreateIndex
CREATE INDEX "JudgeRun_submissionId_idx" ON "JudgeRun"("submissionId");

-- CreateIndex
CREATE INDEX "JudgeRun_verdict_idx" ON "JudgeRun"("verdict");
