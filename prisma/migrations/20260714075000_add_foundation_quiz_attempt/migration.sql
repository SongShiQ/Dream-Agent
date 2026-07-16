-- CreateTable
CREATE TABLE "FoundationQuizAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "curriculumVersion" TEXT NOT NULL DEFAULT '2026-summer-os',
    "unitId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'practice',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "questionIds" TEXT NOT NULL DEFAULT '[]',
    "correct" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "correctRate" INTEGER NOT NULL DEFAULT 0,
    "requiredCorrectRate" INTEGER NOT NULL DEFAULT 80,
    "attemptDate" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    CONSTRAINT "FoundationQuizAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AnswerRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "feedbackMode" TEXT NOT NULL DEFAULT 'hybrid',
    "answeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "foundationAttemptId" TEXT,
    CONSTRAINT "AnswerRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnswerRecord_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnswerRecord_foundationAttemptId_fkey" FOREIGN KEY ("foundationAttemptId") REFERENCES "FoundationQuizAttempt" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AnswerRecord" ("answer", "answeredAt", "feedbackMode", "id", "isCorrect", "questionId", "studentId", "timeSpent") SELECT "answer", "answeredAt", "feedbackMode", "id", "isCorrect", "questionId", "studentId", "timeSpent" FROM "AnswerRecord";
DROP TABLE "AnswerRecord";
ALTER TABLE "new_AnswerRecord" RENAME TO "AnswerRecord";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FoundationQuizAttempt_studentId_unitId_idx" ON "FoundationQuizAttempt"("studentId", "unitId");

-- CreateIndex
CREATE INDEX "FoundationQuizAttempt_studentId_attemptDate_idx" ON "FoundationQuizAttempt"("studentId", "attemptDate");

-- CreateIndex
CREATE INDEX "FoundationQuizAttempt_unitId_status_idx" ON "FoundationQuizAttempt"("unitId", "status");

-- CreateIndex
CREATE INDEX "AnswerRecord_studentId_idx" ON "AnswerRecord"("studentId");

-- CreateIndex
CREATE INDEX "AnswerRecord_questionId_idx" ON "AnswerRecord"("questionId");

-- CreateIndex
CREATE INDEX "AnswerRecord_answeredAt_idx" ON "AnswerRecord"("answeredAt");

-- CreateIndex
CREATE INDEX "AnswerRecord_foundationAttemptId_idx" ON "AnswerRecord"("foundationAttemptId");
