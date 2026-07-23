-- CreateTable
CREATE TABLE "ExperimentAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "courseVersion" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "instanceId" TEXT NOT NULL,
    "variantIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "promptSnapshot" TEXT NOT NULL,
    "inputSnapshot" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "isCorrect" BOOLEAN,
    "feedback" TEXT NOT NULL DEFAULT '',
    "activeKey" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    CONSTRAINT "ExperimentAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentAttempt_activeKey_key" ON "ExperimentAttempt"("activeKey");

-- CreateIndex
CREATE INDEX "ExperimentAttempt_studentId_courseVersion_templateId_startedAt_idx" ON "ExperimentAttempt"("studentId", "courseVersion", "templateId", "startedAt");

-- CreateIndex
CREATE INDEX "ExperimentAttempt_studentId_status_startedAt_idx" ON "ExperimentAttempt"("studentId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "ExperimentAttempt_templateId_status_idx" ON "ExperimentAttempt"("templateId", "status");
