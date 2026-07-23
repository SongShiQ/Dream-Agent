import { createHash } from 'node:crypto';
import type {
  AddressTranslationExpected,
  AddressTranslationInput,
  AddressTranslationScenario,
  AddressTranslationTemplate,
  GeneratedExperimentVariant,
} from './types';

const SCENARIOS: AddressTranslationScenario[] = [
  'mapped',
  'not_present',
  'privilege_fault',
  'write_fault',
];

function hashNumber(value: string): number {
  return Number.parseInt(createHash('sha256').update(value).digest('hex').slice(0, 12), 16);
}

function pickInt(seed: string, min: number, max: number): number {
  return min + (hashNumber(seed) % (max - min + 1));
}

export function evaluateAddressTranslation(input: AddressTranslationInput): AddressTranslationExpected {
  if (!input.present) return { kind: 'fault', fault: 'PAGE_FAULT_NOT_PRESENT' };
  if (!input.userAccessible) return { kind: 'fault', fault: 'PAGE_FAULT_PRIVILEGE' };
  if (input.access === 'write' && !input.writable) {
    return { kind: 'fault', fault: 'PAGE_FAULT_WRITE' };
  }
  return {
    kind: 'physical_address',
    physicalAddress: input.physicalFrame * input.pageSize + input.offset,
  };
}

function buildInput(
  template: AddressTranslationTemplate,
  variantIndex: number,
  scenario: AddressTranslationScenario
): AddressTranslationInput {
  const seed = `${template.id}:v${template.generator.version}:${variantIndex}`;
  const pageSize = template.generator.pageSizes[
    pickInt(`${seed}:page-size`, 0, template.generator.pageSizes.length - 1)
  ];
  const virtualPage = pickInt(
    `${seed}:vpn`,
    template.generator.virtualPageMin,
    template.generator.virtualPageMax
  );
  const physicalFrame = pickInt(
    `${seed}:pfn`,
    template.generator.physicalFrameMin,
    template.generator.physicalFrameMax
  );
  const offset = pickInt(`${seed}:offset`, 0, pageSize - 1);
  return {
    pageSize,
    virtualAddress: virtualPage * pageSize + offset,
    virtualPage,
    offset,
    physicalFrame,
    present: scenario !== 'not_present',
    userAccessible: scenario !== 'privilege_fault',
    writable: scenario !== 'write_fault',
    access: scenario === 'write_fault' || pickInt(`${seed}:access`, 0, 1) === 1 ? 'write' : 'read',
  };
}

function renderPrompt(input: AddressTranslationInput): string {
  return [
    `页大小为 ${input.pageSize} 字节。用户程序执行 ${input.access === 'write' ? '写' : '读'}访问，虚拟地址为 0x${input.virtualAddress.toString(16)}。`,
    `对应页表项：VPN=${input.virtualPage}，PFN=${input.physicalFrame}，present=${Number(input.present)}，user=${Number(input.userAccessible)}，writable=${Number(input.writable)}。`,
    '若访问成功，回答物理地址（十进制或 0x 十六进制）；否则回答 PAGE_FAULT_NOT_PRESENT、PAGE_FAULT_PRIVILEGE 或 PAGE_FAULT_WRITE。',
  ].join('\n');
}

export function generateAddressTranslationVariantByIndex(
  template: AddressTranslationTemplate,
  variantIndex: number,
  includeExpected = false
): GeneratedExperimentVariant {
  const normalizedIndex = ((variantIndex % template.generator.variantCount) + template.generator.variantCount) %
    template.generator.variantCount;
  const scenario = SCENARIOS[normalizedIndex % SCENARIOS.length];
  const input = buildInput(template, normalizedIndex, scenario);
  return {
    instanceId: `${template.id}:v${template.generator.version}:${normalizedIndex}`,
    templateId: template.id,
    templateVersion: template.generator.version,
    courseVersion: template.courseVersion,
    gateIds: template.gateIds,
    conceptTags: template.conceptTags,
    variantIndex: normalizedIndex,
    scenario,
    prompt: renderPrompt(input),
    input,
    ...(includeExpected ? { expected: evaluateAddressTranslation(input) } : {}),
    assessment: {
      mode: template.assessment.mode,
      masteryImpact: template.assessment.masteryImpact,
    },
    resources: template.resources,
  };
}

export function generateAddressTranslationVariant(
  template: AddressTranslationTemplate,
  learnerKey: string,
  sequence = 0,
  includeExpected = false
) {
  const index = hashNumber(`${template.id}:${learnerKey}:${sequence}`) % template.generator.variantCount;
  return generateAddressTranslationVariantByIndex(template, index, includeExpected);
}

export function gradeAddressTranslationAnswer(
  expected: AddressTranslationExpected,
  answer: string
): { correct: boolean; normalizedAnswer: string; expectedAnswer: string } {
  const normalizedAnswer = answer.trim().toUpperCase();
  if (expected.kind === 'fault') {
    return {
      correct: normalizedAnswer === expected.fault,
      normalizedAnswer,
      expectedAnswer: expected.fault,
    };
  }
  const numeric = normalizedAnswer.startsWith('0X')
    ? Number.parseInt(normalizedAnswer.slice(2), 16)
    : Number.parseInt(normalizedAnswer, 10);
  return {
    correct: Number.isFinite(numeric) && numeric === expected.physicalAddress,
    normalizedAnswer: Number.isFinite(numeric) ? String(numeric) : normalizedAnswer,
    expectedAnswer: `${expected.physicalAddress} (0x${expected.physicalAddress.toString(16)})`,
  };
}
