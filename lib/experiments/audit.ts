import { getKnowledgeSourceRegistry } from '@/lib/knowledge/cards';
import { listGateDefs } from '@/lib/labs';
import { generateAddressTranslationVariantByIndex } from './address-translation';
import type { AddressTranslationTemplate, ExperimentAuditIssue } from './types';

function add(
  issues: ExperimentAuditIssue[],
  severity: ExperimentAuditIssue['severity'],
  code: string,
  message: string
) {
  issues.push({ severity, code, message });
}

export async function auditExperimentTemplate(
  template: AddressTranslationTemplate,
  opts?: { release?: boolean }
) {
  const issues: ExperimentAuditIssue[] = [];
  const [sources, gates] = await Promise.all([getKnowledgeSourceRegistry(), listGateDefs()]);
  const gateMap = new Map(gates.map((gate) => [gate.id, gate]));

  for (const sourceRef of template.sourceRefs) {
    if (!sources[sourceRef]) add(issues, 'error', 'unknown_source', `来源未登记：${sourceRef}`);
  }
  for (const gateId of template.gateIds) {
    const gate = gateMap.get(gateId);
    if (!gate) add(issues, 'error', 'unknown_gate', `Gate 不存在：${gateId}`);
    else if (gate.judgeKind !== 'integration_oj') {
      add(issues, 'warning', 'gate_kind', `${gateId} 不是 integration_oj`);
    }
  }
  if (template.generator.virtualPageMin > template.generator.virtualPageMax) {
    add(issues, 'error', 'vpn_range', 'virtualPageMin 大于 virtualPageMax');
  }
  if (template.generator.physicalFrameMin > template.generator.physicalFrameMax) {
    add(issues, 'error', 'pfn_range', 'physicalFrameMin 大于 physicalFrameMax');
  }
  for (const pageSize of template.generator.pageSizes) {
    if ((pageSize & (pageSize - 1)) !== 0) {
      add(issues, 'error', 'page_size', `页大小不是 2 的幂：${pageSize}`);
    }
  }

  const hidden = Array.from({ length: template.assessment.hiddenCaseCount }, (_, index) =>
    generateAddressTranslationVariantByIndex(template, index, true)
  );
  const scenarios = new Set(hidden.map((variant) => variant.scenario));
  for (const scenario of template.assessment.requiredScenarios) {
    if (!scenarios.has(scenario)) {
      add(issues, 'error', 'coverage', `隐藏样例未覆盖场景：${scenario}`);
    }
  }
  if (new Set(hidden.map((variant) => JSON.stringify(variant.input))).size !== hidden.length) {
    add(issues, 'error', 'duplicate_variant', '隐藏样例存在重复输入');
  }
  if (template.assessment.masteryImpact !== 'none') {
    add(issues, 'error', 'mastery_boundary', '预实验不得直接产生 mastery/Gate passed');
  }
  if (template.reviewStatus !== 'reviewed') {
    add(issues, opts?.release ? 'error' : 'warning', 'pending_review', '模板尚未教师复核');
  }
  if (template.reviewStatus === 'reviewed' && (!template.reviewedBy || !template.reviewedAt)) {
    add(issues, 'error', 'review_provenance', 'reviewed 模板缺 reviewedBy/reviewedAt');
  }
  if (opts?.release && template.publicationStatus !== 'published') {
    add(issues, 'error', 'not_published', '发布验收要求 publicationStatus=published');
  }

  return {
    templateId: template.id,
    releaseRequested: Boolean(opts?.release),
    hiddenCoverage: [...scenarios].sort(),
    hiddenCaseCount: hidden.length,
    issues,
    passed: !issues.some((issue) => issue.severity === 'error'),
  };
}
