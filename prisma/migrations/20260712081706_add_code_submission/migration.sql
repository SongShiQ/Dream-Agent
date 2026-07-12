-- CreateTable
CREATE TABLE "CodeSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "labName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'rust',
    "testResult" TEXT NOT NULL,
    "isPassed" BOOLEAN NOT NULL DEFAULT false,
    "feedback" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CodeSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    CONSTRAINT "AnswerRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnswerRecord_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AnswerRecord" ("answer", "answeredAt", "id", "isCorrect", "questionId", "studentId", "timeSpent") SELECT "answer", "answeredAt", "id", "isCorrect", "questionId", "studentId", "timeSpent" FROM "AnswerRecord";
DROP TABLE "AnswerRecord";
ALTER TABLE "new_AnswerRecord" RENAME TO "AnswerRecord";
CREATE INDEX "AnswerRecord_studentId_idx" ON "AnswerRecord"("studentId");
CREATE INDEX "AnswerRecord_questionId_idx" ON "AnswerRecord"("questionId");
CREATE INDEX "AnswerRecord_answeredAt_idx" ON "AnswerRecord"("answeredAt");
CREATE TABLE "new_Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 50,
    "knowledgePoints" TEXT NOT NULL DEFAULT '[]',
    "content" TEXT NOT NULL,
    "options" TEXT NOT NULL DEFAULT '[]',
    "answer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'basic',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Question" ("answer", "content", "createdAt", "difficulty", "explanation", "id", "knowledgePoints", "options", "type") SELECT "answer", "content", "createdAt", "difficulty", "explanation", "id", "knowledgePoints", "options", "type" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
CREATE INDEX "Question_type_idx" ON "Question"("type");
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");
CREATE INDEX "Question_stage_idx" ON "Question"("stage");
CREATE TABLE "new_Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "currentStage" TEXT NOT NULL DEFAULT 'pre_study_theory',
    "weakPoints" TEXT NOT NULL DEFAULT '[]',
    "feedbackMode" TEXT NOT NULL DEFAULT 'hybrid',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Student" ("createdAt", "currentStage", "email", "id", "name", "updatedAt", "weakPoints") SELECT "createdAt", "currentStage", "email", "id", "name", "updatedAt", "weakPoints" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");
CREATE INDEX "Student_currentStage_idx" ON "Student"("currentStage");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CodeSubmission_studentId_idx" ON "CodeSubmission"("studentId");

-- CreateIndex
CREATE INDEX "CodeSubmission_labName_idx" ON "CodeSubmission"("labName");

-- CreateIndex
CREATE INDEX "CodeSubmission_createdAt_idx" ON "CodeSubmission"("createdAt");
