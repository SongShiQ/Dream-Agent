-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "currentStage" TEXT NOT NULL DEFAULT 'pre_study_theory',
    "weakPoints" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "theory" INTEGER NOT NULL DEFAULT 0,
    "coding" INTEGER NOT NULL DEFAULT 0,
    "rust" INTEGER NOT NULL DEFAULT 0,
    "weakPoints" TEXT NOT NULL DEFAULT '[]',
    "assessedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Assessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 50,
    "knowledgePoints" TEXT NOT NULL DEFAULT '[]',
    "content" TEXT NOT NULL,
    "options" TEXT NOT NULL DEFAULT '[]',
    "answer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AnswerRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "answeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnswerRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnswerRecord_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearningPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "currentStage" TEXT NOT NULL,
    "dailyTasks" TEXT NOT NULL DEFAULT '[]',
    "weeklyGoals" TEXT NOT NULL DEFAULT '[]',
    "estimatedCompletion" DATETIME,
    "lastAdjustedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearningPlan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE INDEX "Student_currentStage_idx" ON "Student"("currentStage");

-- CreateIndex
CREATE INDEX "Assessment_studentId_idx" ON "Assessment"("studentId");

-- CreateIndex
CREATE INDEX "Question_type_idx" ON "Question"("type");

-- CreateIndex
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");

-- CreateIndex
CREATE INDEX "AnswerRecord_studentId_idx" ON "AnswerRecord"("studentId");

-- CreateIndex
CREATE INDEX "AnswerRecord_questionId_idx" ON "AnswerRecord"("questionId");

-- CreateIndex
CREATE INDEX "AnswerRecord_answeredAt_idx" ON "AnswerRecord"("answeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "LearningPlan_studentId_key" ON "LearningPlan"("studentId");

-- CreateIndex
CREATE INDEX "LearningPlan_currentStage_idx" ON "LearningPlan"("currentStage");
