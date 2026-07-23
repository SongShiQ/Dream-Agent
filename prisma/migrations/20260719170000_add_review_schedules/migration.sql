-- CreateTable
CREATE TABLE "ReviewSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "curriculumVersion" TEXT NOT NULL DEFAULT '2026-summer-os',
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'scheduled',
    "repetition" INTEGER NOT NULL DEFAULT 0,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TEXT NOT NULL,
    "lastEvidenceType" TEXT NOT NULL DEFAULT '',
    "lastEvidenceId" TEXT NOT NULL DEFAULT '',
    "lastEvidencePassed" BOOLEAN NOT NULL DEFAULT false,
    "lastEvidenceAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReviewSchedule_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewSchedule_studentId_curriculumVersion_targetType_targetId_key" ON "ReviewSchedule"("studentId", "curriculumVersion", "targetType", "targetId");
CREATE INDEX "ReviewSchedule_studentId_dueDate_state_idx" ON "ReviewSchedule"("studentId", "dueDate", "state");
CREATE INDEX "ReviewSchedule_targetType_targetId_idx" ON "ReviewSchedule"("targetType", "targetId");
