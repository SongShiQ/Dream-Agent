-- Persist the compact knowledge references used for each chat message.
ALTER TABLE "ChatMessage" ADD COLUMN "knowledgeRefs" TEXT NOT NULL DEFAULT '[]';
