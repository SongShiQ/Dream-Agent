import { mkdir, mkdtemp, readFile, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  applyOpenKBImport,
  buildOpenKBImportPlan,
  type OpenKBImportOptions,
} from '@/lib/knowledge/openkb-import';

async function fixture(options?: { reviewed?: boolean; sourceRefs?: string[] }) {
  const root = await mkdtemp(join(tmpdir(), 'opencamp-openkb-'));
  const wikiDir = join(root, 'wiki');
  const outputDir = join(root, 'knowledge');
  const manifestPath = join(root, 'manifest.json');
  await mkdir(join(wikiDir, 'concepts'), { recursive: true });
  await writeFile(
    join(wikiDir, 'concepts', 'address-space.md'),
    `---\ntype: "Concept"\nsources: ["rcore-ch4"]\n---\n\n# 地址空间\n\n每个进程拥有独立地址空间。\n`,
    { encoding: 'utf8' }
  );
  await writeFile(
    manifestPath,
    JSON.stringify({
      courseVersion: '2026-summer-os',
      sources: {
        'rcore-ch4': {
          title: 'rCore 地址空间章节',
          kind: 'course-repository',
          version: 'v3',
        },
      },
      defaultSourceRefs: options?.sourceRefs || ['rcore-ch4'],
      reviewStatus: options?.reviewed ? 'reviewed' : 'pending',
      ...(options?.reviewed
        ? { reviewedBy: 'teacher-1', reviewedAt: '2026-07-19T08:00:00Z' }
        : {}),
      overrides: {
        'concepts/address-space.md': {
          id: 'virtual-memory',
          tags: ['memory', 'virtual_memory'],
          labs: ['lab2-address'],
          labGateIds: ['lab2-address'],
        },
      },
    }),
    { encoding: 'utf8' }
  );
  return { root, wikiDir, outputDir, manifestPath };
}

function opts(paths: Awaited<ReturnType<typeof fixture>>, extra?: Partial<OpenKBImportOptions>) {
  return {
    wikiDir: paths.wikiDir,
    manifestPath: paths.manifestPath,
    outputDir: paths.outputDir,
    apply: false,
    publish: false,
    replace: false,
    ...extra,
  } satisfies OpenKBImportOptions;
}

describe('OpenKB import', () => {
  it('builds a dry-run plan with stable IDs and manifest source mapping', async () => {
    const paths = await fixture();
    const plan = await buildOpenKBImportPlan(opts(paths));

    expect(plan.issues).toEqual([]);
    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0]).toMatchObject({
      id: 'virtual-memory',
      publicationStatus: 'draft',
      reviewStatus: 'pending',
      sourceRefs: ['rcore-ch4'],
      labGateIds: ['lab2-address'],
    });
    expect(plan.index.sources).toMatchObject({ 'rcore-ch4': { title: 'rCore 地址空间章节' } });
  });

  it('maps OpenKB source filenames through the explicit sourceMap contract', async () => {
    const paths = await fixture();
    await writeFile(
      join(paths.wikiDir, 'concepts', 'address-space.md'),
      '---\ntype: "Concept"\nsources: ["sources/address.md"]\n---\n\n# 地址空间\n\n正文。\n',
      'utf8'
    );
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        courseVersion: '2026-summer-os',
        sources: { 'rcore-ch4': { title: 'rCore 地址空间章节' } },
        sourceMap: { 'sources/address.md': ['rcore-ch4'] },
        reviewStatus: 'pending',
      }),
      'utf8'
    );
    const plan = await buildOpenKBImportPlan(opts(paths));
    expect(plan.issues).toEqual([]);
    expect(plan.entries[0].sourceRefs).toEqual(['rcore-ch4']);
  });

  it('applies draft cards atomically and preserves the student publication boundary', async () => {
    const paths = await fixture();
    const plan = await buildOpenKBImportPlan(opts(paths, { apply: true }));
    await applyOpenKBImport(plan, { outputDir: paths.outputDir, replace: false });

    const card = await readFile(join(paths.outputDir, 'cards', 'virtual-memory.md'), 'utf8');
    expect(card).toContain('publication_status: "draft"');
    expect(card).toContain('source_refs: ["rcore-ch4"]');
    expect(card).toContain('lab_gate_ids: ["lab2-address"]');
    expect(JSON.parse(await readFile(join(paths.outputDir, 'index.json'), 'utf8')).sources).toHaveProperty(
      'rcore-ch4'
    );
  });

  it('blocks publishing until the manifest marks every imported page reviewed', async () => {
    const paths = await fixture();
    const plan = await buildOpenKBImportPlan(opts(paths, { apply: true, publish: true }));
    expect(plan.issues.map((issue) => issue.message)).toContain(
      'cannot publish a page that is not reviewed'
    );
  });

  it('publishes a reviewed page with reviewer provenance', async () => {
    const paths = await fixture({ reviewed: true });
    const plan = await buildOpenKBImportPlan(opts(paths, { apply: true, publish: true }));
    expect(plan.issues).toEqual([]);
    await applyOpenKBImport(plan, { outputDir: paths.outputDir, replace: false });
    const card = await readFile(join(paths.outputDir, 'cards', 'virtual-memory.md'), 'utf8');
    expect(card).toContain('publication_status: "published"');
    expect(card).toContain('reviewed_by: "teacher-1"');
    expect(card).toContain('reviewed_at: "2026-07-19T08:00:00Z"');
  });

  it('rejects unknown source references instead of creating unverifiable cards', async () => {
    const paths = await fixture({ sourceRefs: ['missing-source'] });
    const plan = await buildOpenKBImportPlan(opts(paths));
    expect(plan.issues.some((issue) => issue.message.includes('unknown source reference'))).toBe(true);
  });

  it('detects a stable ID already owned by another course card', async () => {
    const paths = await fixture();
    await mkdir(join(paths.outputDir, 'legacy'), { recursive: true });
    await writeFile(
      join(paths.outputDir, 'legacy', 'old.md'),
      '---\nid: "virtual-memory"\n---\n\n# Old card\n',
      'utf8'
    );
    const plan = await buildOpenKBImportPlan(opts(paths));
    expect(plan.issues.map((issue) => issue.message)).toContain(
      'stable ID conflicts with imported page: virtual-memory'
    );
  });
});
