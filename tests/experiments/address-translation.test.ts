import { describe, expect, it } from 'vitest';
import {
  evaluateAddressTranslation,
  generateAddressTranslationVariant,
  generateAddressTranslationVariantByIndex,
  gradeAddressTranslationAnswer,
  loadExperimentTemplate,
} from '@/lib/experiments';

describe('address translation experiment', () => {
  it('generates stable learner variants without exposing expected answers', async () => {
    const template = await loadExperimentTemplate('vm-address-translation-v1');
    expect(template).not.toBeNull();
    const first = generateAddressTranslationVariant(template!, 'student-1', 0);
    const again = generateAddressTranslationVariant(template!, 'student-1', 0);
    const next = generateAddressTranslationVariant(template!, 'student-1', 1);
    expect(first).toEqual(again);
    expect(first.expected).toBeUndefined();
    expect(next.instanceId).not.toBe(first.instanceId);
    expect(first.assessment.masteryImpact).toBe('none');
    expect(first.resources).toEqual({ timeLimitMs: 1000, memoryMb: 64, network: 'none' });
  });

  it('covers mapped and three fault scenarios deterministically', async () => {
    const template = (await loadExperimentTemplate('vm-address-translation-v1'))!;
    const variants = [0, 1, 2, 3].map((index) =>
      generateAddressTranslationVariantByIndex(template, index, true)
    );
    expect(variants.map((variant) => variant.scenario)).toEqual([
      'mapped',
      'not_present',
      'privilege_fault',
      'write_fault',
    ]);
    expect(variants.map((variant) => variant.expected?.kind)).toEqual([
      'physical_address',
      'fault',
      'fault',
      'fault',
    ]);
  });

  it('grades decimal/hex physical addresses and exact fault codes', () => {
    const mapped = evaluateAddressTranslation({
      pageSize: 4096,
      virtualAddress: 0x1234,
      virtualPage: 1,
      offset: 0x234,
      physicalFrame: 10,
      present: true,
      userAccessible: true,
      writable: true,
      access: 'read',
    });
    expect(gradeAddressTranslationAnswer(mapped, String(10 * 4096 + 0x234)).correct).toBe(true);
    expect(gradeAddressTranslationAnswer(mapped, `0x${(10 * 4096 + 0x234).toString(16)}`).correct).toBe(
      true
    );
    const fault = { kind: 'fault', fault: 'PAGE_FAULT_WRITE' } as const;
    expect(gradeAddressTranslationAnswer(fault, 'page_fault_write').correct).toBe(true);
    expect(gradeAddressTranslationAnswer(fault, 'PAGE_FAULT_NOT_PRESENT').correct).toBe(false);
  });
});
