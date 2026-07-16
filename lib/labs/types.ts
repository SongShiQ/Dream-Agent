/** 实验关卡类型 — 与 data/labs/gates.json 对齐 */

export type JudgeKind = 'none' | 'unit_oj' | 'integration_oj' | 'manual_teacher';
export type EditorMode = 'web_snippet' | 'ide_first';
export type GateProgressStatus = 'locked' | 'unlocked' | 'passed';
/** STATIC = 仅静态分析，绝不能过关 */
export type JudgeVerdict =
  | 'AC'
  | 'WA'
  | 'CE'
  | 'RE'
  | 'TLE'
  | 'SE'
  | 'PENDING'
  | 'STATIC';

export type GateChecklistItem = {
  id: string;
  text: string;
  required: boolean;
};

export type LabGateDef = {
  id: string;
  title: string;
  chapter: string;
  stageIds: string[];
  order: number;
  judgeKind: JudgeKind;
  editorMode: EditorMode;
  docLinks: { label: string; url: string }[];
  checklist: GateChecklistItem[];
  conceptTags: string[];
  unlockAfter: string[];
  testHint?: string;
};

export type GatesFile = {
  version: number;
  policy: { passRule: string; note: string };
  gates: LabGateDef[];
};
