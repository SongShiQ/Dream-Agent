import { createHash } from 'crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'fs/promises';
import { dirname, join, relative, resolve } from 'path';
import { z } from 'zod';

export type OpenKBSource = {
  title: string;
  url?: string;
  kind?: string;
  version?: string;
};

export type OpenKBPageOverride = {
  id?: string;
  title?: string;
  tags?: string[];
  stage?: string;
  labs?: string[];
  sourceRefs?: string[];
  prerequisiteIds?: string[];
  misconceptionIds?: string[];
  questionTags?: string[];
  labGateIds?: string[];
  relatedIds?: string[];
  publicationStatus?: 'published' | 'draft' | 'deprecated';
  reviewStatus?: 'reviewed' | 'pending';
  reviewedBy?: string;
  reviewedAt?: string;
};

export type OpenKBImportManifest = {
  courseVersion: string;
  sources: Record<string, OpenKBSource>;
  defaultSourceRefs?: string[];
  sourceMap?: Record<string, string[]>;
  pageTypes?: Array<'concepts' | 'summaries' | 'entities'>;
  publicationStatus?: 'published' | 'draft' | 'deprecated';
  reviewStatus?: 'reviewed' | 'pending';
  reviewedBy?: string;
  reviewedAt?: string;
  overrides?: Record<string, OpenKBPageOverride>;
};

export type OpenKBImportOptions = {
  wikiDir: string;
  manifestPath: string;
  outputDir: string;
  apply: boolean;
  publish: boolean;
  replace: boolean;
};

export type OpenKBImportIssue = {
  path?: string;
  message: string;
};

export type OpenKBImportEntry = {
  pagePath: string;
  outputPath: string;
  id: string;
  title: string;
  tags: string[];
  stage?: string;
  labs: string[];
  sourceRefs: string[];
  publicationStatus: 'published' | 'draft' | 'deprecated';
  reviewStatus: 'reviewed' | 'pending';
  reviewedBy?: string;
  reviewedAt?: string;
  content: string;
  courseVersion: string;
  prerequisiteIds: string[];
  misconceptionIds: string[];
  questionTags: string[];
  labGateIds: string[];
  relatedIds: string[];
};

export type OpenKBImportPlan = {
  manifest: OpenKBImportManifest;
  entries: OpenKBImportEntry[];
  index: Record<string, unknown>;
  issues: OpenKBImportIssue[];
};

const DEFAULT_PAGE_TYPES: Array<'concepts' | 'summaries'> = ['concepts', 'summaries'];

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^wiki\//, '');
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(asString).filter(Boolean);
  if (typeof value !== 'string') return [];
  const text = value.trim();
  if (!text) return [];
  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) return parsed.map(asString).filter(Boolean);
    } catch {
      // Fall back to the simple YAML-ish representation below.
    }
  }
  return text
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function parseFrontmatter(raw: string): { meta: Record<string, unknown>; body: string } {
  if (!raw.startsWith('---')) return { meta: {}, body: raw };
  const closing = raw.match(/\n---(?:\r?\n|$)/);
  if (!closing || closing.index === undefined) return { meta: {}, body: raw };
  const header = raw.slice(3, closing.index).trim();
  const body = raw.slice(closing.index + closing[0].length).replace(/^\s*\n/, '');
  const meta: Record<string, unknown> = {};
  for (const line of header.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const value = match[2].trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      meta[match[1]] = asStringArray(value);
    } else {
      meta[match[1]] = value.replace(/^['"]|['"]$/g, '');
    }
  }
  return { meta, body };
}

function titleFromBody(body: string, fallback: string): string {
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback;
}

function slugForPage(pagePath: string, pageType: string): string {
  const prefix = `${pageType}/`;
  const withoutType = pagePath.startsWith(prefix) ? pagePath.slice(prefix.length) : pagePath;
  const stem = withoutType.replace(/\.[^.]+$/, '').replace(/\//g, '-');
  const readable = stem
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  const singular = singularPageType(pageType);
  if (readable) return `openkb-${singular}-${readable}`;
  const digest = createHash('sha256').update(pagePath).digest('hex').slice(0, 12);
  return `openkb-${singular}-${digest}`;
}

function singularPageType(pageType: string): 'concept' | 'summary' | 'entity' {
  if (pageType === 'concepts') return 'concept';
  if (pageType === 'summaries') return 'summary';
  return 'entity';
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

const manifestSchema = z.object({
  courseVersion: z.string().trim().min(1),
  sources: z.record(
    z.object({
      title: z.string().trim().min(1),
      url: z.string().trim().optional(),
      kind: z.string().trim().optional(),
      version: z.string().trim().optional(),
    })
  ),
  defaultSourceRefs: z.array(z.string()).optional(),
  sourceMap: z.record(z.array(z.string())).optional(),
  pageTypes: z.array(z.enum(['concepts', 'summaries', 'entities'])).optional(),
  publicationStatus: z.enum(['published', 'draft', 'deprecated']).optional(),
  reviewStatus: z.enum(['reviewed', 'pending']).optional(),
  reviewedBy: z.string().trim().min(1).optional(),
  reviewedAt: z.string().trim().min(1).optional(),
  overrides: z.record(
    z.object({
      id: z.string().trim().optional(),
      title: z.string().trim().optional(),
      tags: z.array(z.string()).optional(),
      stage: z.string().trim().optional(),
      labs: z.array(z.string()).optional(),
      sourceRefs: z.array(z.string()).optional(),
      prerequisiteIds: z.array(z.string()).optional(),
      misconceptionIds: z.array(z.string()).optional(),
      questionTags: z.array(z.string()).optional(),
      labGateIds: z.array(z.string()).optional(),
      relatedIds: z.array(z.string()).optional(),
      publicationStatus: z.enum(['published', 'draft', 'deprecated']).optional(),
      reviewStatus: z.enum(['reviewed', 'pending']).optional(),
      reviewedBy: z.string().trim().optional(),
      reviewedAt: z.string().trim().optional(),
    })
  ).optional(),
});

function scalar(value: string): string {
  return JSON.stringify(value);
}

function list(values: string[]): string {
  return JSON.stringify(unique(values));
}

function renderCard(entry: OpenKBImportEntry): string {
  const lines = [
    `id: ${scalar(entry.id)}`,
    `title: ${scalar(entry.title)}`,
    `tags: ${list(entry.tags)}`,
    ...(entry.stage ? [`stage: ${scalar(entry.stage)}`] : []),
    `labs: ${list(entry.labs)}`,
    `course_version: ${scalar(entry.courseVersion)}`,
    `publication_status: ${scalar(entry.publicationStatus)}`,
    `review_status: ${scalar(entry.reviewStatus)}`,
    ...(entry.reviewedBy ? [`reviewed_by: ${scalar(entry.reviewedBy)}`] : []),
    ...(entry.reviewedAt ? [`reviewed_at: ${scalar(entry.reviewedAt)}`] : []),
    `source_refs: ${list(entry.sourceRefs)}`,
    `prerequisite_ids: ${list(entry.prerequisiteIds ?? [])}`,
    `misconception_ids: ${list(entry.misconceptionIds ?? [])}`,
    `question_tags: ${list(entry.questionTags ?? [])}`,
    `lab_gate_ids: ${list(entry.labGateIds ?? [])}`,
    `related_ids: ${list(entry.relatedIds ?? [])}`,
  ];
  return `---\n${lines.join('\n')}\n---\n\n${entry.content.trim()}\n`;
}

function sourceRefsForPage(
  pagePath: string,
  frontmatterSources: string[],
  manifest: OpenKBImportManifest
): string[] {
  const sourceMap = manifest.sourceMap || {};
  const candidates = [pagePath, `wiki/${pagePath}`, `./${pagePath}`];
  const mappedPage = candidates.flatMap((key) => sourceMap[key] || []);
  const mappedSources = frontmatterSources.flatMap((value) => {
    const normalized = normalizePath(value);
    if (manifest.sources[normalized]) return [normalized];
    return sourceMap[normalized] || sourceMap[value] || [];
  });
  // A default source is an explicit course-level fallback. Unmapped OpenKB
  // source filenames are not copied into source_refs as if they were IDs.
  return unique([...mappedPage, ...mappedSources, ...(manifest.defaultSourceRefs || [])]);
}

function parseManifest(raw: string): OpenKBImportManifest {
  const parsed = manifestSchema.parse(JSON.parse(raw));
  const sources: Record<string, OpenKBSource> = Object.fromEntries(
    Object.entries(parsed.sources).map(([id, source]) => [id.trim(), {
      title: source.title.trim(),
      ...(source.url ? { url: source.url.trim() } : {}),
      ...(source.kind ? { kind: source.kind.trim() } : {}),
      ...(source.version ? { version: source.version.trim() } : {}),
    }])
  );
  if (Object.keys(sources).some((id) => !id)) throw new Error('manifest source IDs must be non-empty');
  const invalidPaths = Object.keys(parsed.sourceMap || {}).filter((path) => {
    const normalized = normalizePath(path);
    return normalized.startsWith('../') || normalized.includes('/../');
  });
  if (invalidPaths.length) throw new Error(`manifest contains unsafe sourceMap path: ${invalidPaths[0]}`);
  const reviewedAtValues = [parsed.reviewedAt, ...Object.values(parsed.overrides || {}).map((item) => item.reviewedAt)]
    .filter((value): value is string => Boolean(value));
  const invalidReviewedAt = reviewedAtValues.find((value) => Number.isNaN(Date.parse(value)));
  if (invalidReviewedAt) throw new Error(`invalid reviewedAt timestamp: ${invalidReviewedAt}`);
  return {
    courseVersion: parsed.courseVersion.trim(),
    sources,
    defaultSourceRefs: unique((parsed.defaultSourceRefs || []).map(normalizePath)),
    sourceMap: Object.fromEntries(
      Object.entries(parsed.sourceMap || {}).map(([key, refs]) => [
        normalizePath(key),
        unique((refs || []).map(normalizePath)),
      ])
    ),
    pageTypes: parsed.pageTypes?.length ? parsed.pageTypes : DEFAULT_PAGE_TYPES,
    publicationStatus: parsed.publicationStatus || 'draft',
    reviewStatus: parsed.reviewStatus || 'pending',
    reviewedBy: parsed.reviewedBy?.trim(),
    reviewedAt: parsed.reviewedAt?.trim(),
    overrides: parsed.overrides || {},
  };
}

async function markdownFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const result: string[] = [];
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) result.push(...(await markdownFiles(path)));
      else if (entry.isFile() && entry.name.endsWith('.md')) result.push(path);
    }
    return result;
  } catch {
    return [];
  }
}

function getOverride(manifest: OpenKBImportManifest, pagePath: string): OpenKBPageOverride {
  const raw = manifest.overrides?.[pagePath] || manifest.overrides?.[`wiki/${pagePath}`];
  return raw || {};
}

function addIndexTags(index: Record<string, unknown>, entry: OpenKBImportEntry): void {
  const tagMap = (index.tagMap && typeof index.tagMap === 'object'
    ? index.tagMap
    : {}) as Record<string, unknown>;
  const tagPath = entry.outputPath.replace(/\\/g, '/');
  for (const [tag, paths] of Object.entries(tagMap)) {
    if (Array.isArray(paths)) tagMap[tag] = paths.map(String).filter((path) => path !== tagPath);
  }
  for (const tag of entry.tags) {
    const existing = Array.isArray(tagMap[tag]) ? (tagMap[tag] as unknown[]).map(String) : [];
    tagMap[tag] = unique([...existing, tagPath]);
  }
  index.tagMap = tagMap;
}

async function findExistingIdConflicts(
  outputDir: string,
  entries: OpenKBImportEntry[]
): Promise<OpenKBImportIssue[]> {
  const targets = new Map(entries.map((entry) => [entry.id, resolve(outputDir, entry.outputPath)]));
  const issues: OpenKBImportIssue[] = [];
  for (const file of await markdownFiles(outputDir)) {
    const raw = await readFile(file, 'utf8');
    const id = asString(parseFrontmatter(raw).meta.id);
    if (!id || !targets.has(id)) continue;
    if (resolve(file) !== targets.get(id)) {
      issues.push({
        path: normalizePath(relative(outputDir, file)),
        message: `stable ID conflicts with imported page: ${id}`,
      });
    }
  }
  return issues;
}

function mergeSourceRegistry(
  existing: Record<string, unknown>,
  manifest: OpenKBImportManifest,
  issues: OpenKBImportIssue[]
): void {
  const sources = (existing.sources && typeof existing.sources === 'object'
    ? existing.sources
    : {}) as Record<string, unknown>;
  for (const [id, source] of Object.entries(manifest.sources)) {
    const old = sources[id];
    if (old && JSON.stringify(old) !== JSON.stringify(source)) {
      issues.push({ path: `sources.${id}`, message: 'source registry conflicts with existing index.json' });
      continue;
    }
    sources[id] = source;
  }
  existing.sources = sources;
}

export async function buildOpenKBImportPlan(
  options: Pick<OpenKBImportOptions, 'wikiDir' | 'manifestPath' | 'outputDir' | 'publish'>
): Promise<OpenKBImportPlan> {
  const manifest = parseManifest(await readFile(resolve(options.manifestPath), 'utf8'));
  const wikiDir = resolve(options.wikiDir);
  const outputDir = resolve(options.outputDir);
  const indexPath = join(outputDir, 'index.json');
  let index: Record<string, unknown> = { version: 1 };
  try {
    const parsed = JSON.parse(await readFile(indexPath, 'utf8')) as unknown;
    if (parsed && typeof parsed === 'object') index = parsed as Record<string, unknown>;
  } catch {
    // A new course package may not have an index yet.
  }

  const issues: OpenKBImportIssue[] = [];
  mergeSourceRegistry(index, manifest, issues);
  for (const ref of [...(manifest.defaultSourceRefs || []), ...Object.values(manifest.sourceMap || {}).flat()]) {
    if (!manifest.sources[normalizePath(ref)]) {
      issues.push({ message: `manifest references unknown source: ${ref}` });
    }
  }

  const entries: OpenKBImportEntry[] = [];
  const pageTypes = manifest.pageTypes || DEFAULT_PAGE_TYPES;
  for (const pageType of pageTypes) {
    const dir = join(wikiDir, pageType);
    const files = await markdownFiles(dir);
    for (const absPath of files) {
      const pagePath = normalizePath(relative(wikiDir, absPath));
      const raw = await readFile(absPath, 'utf8');
      const { meta, body } = parseFrontmatter(raw);
      const override = getOverride(manifest, pagePath);
      const sourceRefs = unique(
        (override.sourceRefs?.length
          ? override.sourceRefs
          : sourceRefsForPage(pagePath, asStringArray(meta.sources), manifest)
        ).map(normalizePath)
      );
      const unknownRefs = sourceRefs.filter((ref) => !manifest.sources[ref]);
      for (const ref of unknownRefs) {
        issues.push({ path: pagePath, message: `unknown source reference: ${ref}` });
      }
      if (!body.trim()) issues.push({ path: pagePath, message: 'page body is empty' });
      if (!sourceRefs.length) issues.push({ path: pagePath, message: 'page has no source reference' });

      const id = asString(override.id) || slugForPage(pagePath, pageType);
      const title = asString(override.title) || titleFromBody(body, pagePath);
      const tags = unique(override.tags || [singularPageType(pageType)]);
      const labs = unique(override.labs || []);
      const reviewStatus = override.reviewStatus || manifest.reviewStatus || 'pending';
      const reviewedBy = override.reviewedBy || manifest.reviewedBy;
      const reviewedAt = override.reviewedAt || manifest.reviewedAt;
      const publicationStatus = options.publish
        ? override.publicationStatus || 'published'
        : 'draft';
      if (options.publish && reviewStatus !== 'reviewed') {
        issues.push({ path: pagePath, message: 'cannot publish a page that is not reviewed' });
      }
      if (options.publish && (!reviewedBy || !reviewedAt)) {
        issues.push({ path: pagePath, message: 'cannot publish without reviewedBy and reviewedAt' });
      }
      const renderable: OpenKBImportEntry = {
        pagePath,
        outputPath: `cards/${id}.md`,
        id,
        title,
        tags,
        ...(asString(override.stage) || asString(meta.stage)
          ? { stage: asString(override.stage) || asString(meta.stage) }
          : {}),
        labs,
        sourceRefs,
        publicationStatus,
        reviewStatus,
        ...(reviewedBy ? { reviewedBy } : {}),
        ...(reviewedAt ? { reviewedAt } : {}),
        content: body.trim(),
        courseVersion: manifest.courseVersion,
        prerequisiteIds: unique(override.prerequisiteIds || []),
        misconceptionIds: unique(override.misconceptionIds || []),
        questionTags: unique(override.questionTags || tags),
        labGateIds: unique(override.labGateIds || labs),
        relatedIds: unique(override.relatedIds || []),
      };
      entries.push(renderable);
    }
  }

  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) issues.push({ path: entry.pagePath, message: `duplicate imported id: ${entry.id}` });
    ids.add(entry.id);
    const target = resolve(outputDir, entry.outputPath);
    const targetRelative = relative(resolve(outputDir), target).replace(/\\/g, '/');
    if (targetRelative.startsWith('..') || targetRelative.includes(':')) {
      issues.push({ path: entry.pagePath, message: 'output path escapes output directory' });
    }
    addIndexTags(index, entry);
  }
  if (!entries.length) issues.push({ message: 'no OpenKB pages matched the selected pageTypes' });
  issues.push(...(await findExistingIdConflicts(outputDir, entries)));
  if (options.publish && manifest.publicationStatus === 'deprecated') {
    issues.push({ message: 'manifest publicationStatus=deprecated cannot be used with --publish' });
  }
  return { manifest, entries, index, issues };
}

async function atomicWrite(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${Date.now()}`;
  await writeFile(temporary, content, 'utf8');
  await rename(temporary, path);
}

export async function applyOpenKBImport(
  plan: OpenKBImportPlan,
  options: Pick<OpenKBImportOptions, 'outputDir' | 'replace'>
): Promise<void> {
  if (plan.issues.length) {
    throw new Error(`cannot apply OpenKB import with ${plan.issues.length} validation issue(s)`);
  }
  const outputDir = resolve(options.outputDir);
  for (const entry of plan.entries) {
    const path = join(outputDir, entry.outputPath);
    if (!options.replace) {
      try {
        await readFile(path, 'utf8');
        throw new Error(`target exists (use --replace): ${entry.outputPath}`);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('target exists')) throw error;
        const code = (error as NodeJS.ErrnoException)?.code;
        if (code !== 'ENOENT') throw error;
      }
    }
    await atomicWrite(path, renderCard(entry));
  }
  await atomicWrite(join(outputDir, 'index.json'), `${JSON.stringify(plan.index, null, 2)}\n`);
}

export function renderOpenKBCardForTest(entry: OpenKBImportEntry): string {
  return renderCard(entry);
}
