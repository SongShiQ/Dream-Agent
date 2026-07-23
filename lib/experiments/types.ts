export type ExperimentPublicationStatus = 'draft' | 'published' | 'deprecated';
export type ExperimentReviewStatus = 'pending' | 'reviewed';
export type AddressTranslationScenario =
  | 'mapped'
  | 'not_present'
  | 'privilege_fault'
  | 'write_fault';

export type AddressTranslationTemplate = {
  schemaVersion: 1;
  id: string;
  courseVersion: string;
  title: string;
  description: string;
  publicationStatus: ExperimentPublicationStatus;
  reviewStatus: ExperimentReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  sourceRefs: string[];
  gateIds: string[];
  conceptTags: string[];
  generator: {
    kind: 'address_translation_v1';
    version: 1;
    variantCount: number;
    pageSizes: number[];
    virtualPageMin: number;
    virtualPageMax: number;
    physicalFrameMin: number;
    physicalFrameMax: number;
  };
  assessment: {
    mode: 'formative';
    masteryImpact: 'none';
    answerFormat: 'physical_address_or_fault';
    hiddenCaseCount: number;
    requiredScenarios: AddressTranslationScenario[];
  };
  resources: {
    timeLimitMs: number;
    memoryMb: number;
    network: 'none';
  };
};

export type AddressTranslationInput = {
  pageSize: number;
  virtualAddress: number;
  virtualPage: number;
  offset: number;
  physicalFrame: number;
  present: boolean;
  userAccessible: boolean;
  writable: boolean;
  access: 'read' | 'write';
};

export type AddressTranslationExpected =
  | { kind: 'physical_address'; physicalAddress: number }
  | {
      kind: 'fault';
      fault: 'PAGE_FAULT_NOT_PRESENT' | 'PAGE_FAULT_PRIVILEGE' | 'PAGE_FAULT_WRITE';
    };

export type GeneratedExperimentVariant = {
  instanceId: string;
  templateId: string;
  templateVersion: number;
  courseVersion: string;
  gateIds: string[];
  conceptTags: string[];
  variantIndex: number;
  scenario: AddressTranslationScenario;
  prompt: string;
  input: AddressTranslationInput;
  expected?: AddressTranslationExpected;
  assessment: {
    mode: 'formative';
    masteryImpact: 'none';
  };
  resources: AddressTranslationTemplate['resources'];
};

export type ExperimentAuditIssue = {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
};
