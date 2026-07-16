-- Add lightweight cohort and operations fields for staged release filtering.
ALTER TABLE "Student" ADD COLUMN "cohortId" TEXT NOT NULL DEFAULT '2026-summer-os-main';
ALTER TABLE "Student" ADD COLUMN "learningStatus" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Student" ADD COLUMN "curriculumVersion" TEXT NOT NULL DEFAULT '2026-summer-os';

CREATE INDEX "Student_cohortId_idx" ON "Student"("cohortId");
CREATE INDEX "Student_learningStatus_idx" ON "Student"("learningStatus");
