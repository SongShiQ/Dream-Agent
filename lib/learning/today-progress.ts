/**
 * 今日三步完成态 — 按学员 + 本地日期持久化（localStorage）
 */

export type TodayProgressState = {
  date: string;
  /** 已完成的 step.id 列表 */
  done: string[];
  /** 生成步骤时的指纹，阶段/薄弱变化则重置 */
  fingerprint: string;
};

export function localDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayProgressStorageKey(studentId: string): string {
  return `opencamp-today-steps-${studentId}`;
}

export function stepsFingerprint(opts: {
  currentStage: string;
  totalQuestions: number;
  weakPoints: string[];
  stepIds: string[];
}): string {
  const isNew = opts.totalQuestions === 0 ? '1' : '0';
  const hasWeak = opts.weakPoints.length > 0 ? '1' : '0';
  return `${opts.currentStage}|${isNew}|${hasWeak}|${opts.stepIds.join(',')}`;
}

export function loadTodayProgress(
  studentId: string,
  fingerprint: string
): TodayProgressState {
  const date = localDateKey();
  const empty: TodayProgressState = { date, done: [], fingerprint };
  if (typeof window === 'undefined' || !studentId) return empty;
  try {
    const raw = localStorage.getItem(todayProgressStorageKey(studentId));
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as TodayProgressState;
    if (parsed.date !== date || parsed.fingerprint !== fingerprint) {
      return empty;
    }
    return {
      date,
      done: Array.isArray(parsed.done) ? parsed.done.map(String) : [],
      fingerprint,
    };
  } catch {
    return empty;
  }
}

export function saveTodayProgress(studentId: string, state: TodayProgressState): void {
  if (typeof window === 'undefined' || !studentId) return;
  try {
    localStorage.setItem(todayProgressStorageKey(studentId), JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function markStepDone(
  studentId: string,
  fingerprint: string,
  stepId: string
): TodayProgressState {
  const cur = loadTodayProgress(studentId, fingerprint);
  const done = cur.done.includes(stepId) ? cur.done : [...cur.done, stepId];
  const next: TodayProgressState = {
    date: localDateKey(),
    done,
    fingerprint,
  };
  saveTodayProgress(studentId, next);
  return next;
}
