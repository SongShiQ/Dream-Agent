-- Add cross-device personal task completion state.
-- This records personal_done only; it must not be used as mastered evidence.

CREATE TABLE "DailyTaskProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL DEFAULT '',
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyTaskProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DailyTaskProgress_studentId_date_taskId_key" ON "DailyTaskProgress"("studentId", "date", "taskId");
CREATE INDEX "DailyTaskProgress_studentId_date_idx" ON "DailyTaskProgress"("studentId", "date");
CREATE INDEX "DailyTaskProgress_taskId_idx" ON "DailyTaskProgress"("taskId");
