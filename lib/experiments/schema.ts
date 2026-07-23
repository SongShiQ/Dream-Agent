import { z } from 'zod';

const scenarioSchema = z.enum(['mapped', 'not_present', 'privilege_fault', 'write_fault']);

export const addressTranslationTemplateSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,80}$/),
  courseVersion: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(10),
  publicationStatus: z.enum(['draft', 'published', 'deprecated']),
  reviewStatus: z.enum(['pending', 'reviewed']),
  reviewedBy: z.string().min(1).optional(),
  reviewedAt: z.string().datetime().optional(),
  sourceRefs: z.array(z.string().min(1)).min(1),
  gateIds: z.array(z.string().min(1)).min(1),
  conceptTags: z.array(z.string().min(1)).min(1),
  generator: z.object({
    kind: z.literal('address_translation_v1'),
    version: z.literal(1),
    variantCount: z.number().int().min(16).max(10_000),
    pageSizes: z.array(z.number().int().positive()).min(1),
    virtualPageMin: z.number().int().nonnegative(),
    virtualPageMax: z.number().int().positive(),
    physicalFrameMin: z.number().int().nonnegative(),
    physicalFrameMax: z.number().int().positive(),
  }),
  assessment: z.object({
    mode: z.literal('formative'),
    masteryImpact: z.literal('none'),
    answerFormat: z.literal('physical_address_or_fault'),
    hiddenCaseCount: z.number().int().min(4).max(100),
    requiredScenarios: z.array(scenarioSchema).min(4),
  }),
  resources: z.object({
    timeLimitMs: z.number().int().min(100).max(10_000),
    memoryMb: z.number().int().min(16).max(1024),
    network: z.literal('none'),
  }),
});
