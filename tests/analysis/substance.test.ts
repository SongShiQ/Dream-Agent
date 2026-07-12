import { describe, it, expect } from 'vitest';
import { assessSubstance, quickAnalyze } from '@/lib/analysis';

describe('substance + scoring honesty', () => {
  it('flags empty code', () => {
    const s = assessSubstance('   \n\t  ', 'rust');
    expect(s.level).toBe('empty');
    expect(s.scoreCap).toBe(0);
  });

  it('flags comments only', () => {
    const s = assessSubstance('// only comment\n/* block */\n', 'rust');
    expect(s.level).toBe('comments_only');
    expect(s.scoreCap).toBeLessThanOrEqual(5);
  });

  it('flags default hello stub', () => {
    const code = `fn main() {
    println!("hello rCore");
}
`;
    const s = assessSubstance(code, 'rust');
    expect(s.level).toBe('stub');
    expect(s.scoreCap).toBeLessThanOrEqual(25);
  });

  it('quickAnalyze does not give 100 to empty-ish stub', async () => {
    const report = await quickAnalyze(
      `fn main() {
    println!("hello rCore");
}
`,
      'rust'
    );
    expect(report.overallScore).toBeLessThanOrEqual(25);
    expect(report.summary).not.toMatch(/优秀/);
  });

  it('quickAnalyze gives low score for thin snippet', async () => {
    const report = await quickAnalyze('let x = 1;\n', 'rust');
    expect(report.overallScore).toBeLessThanOrEqual(55);
  });

  it('reasonable code can still score above stub cap', async () => {
    const code = `
use core::fmt;

/// Trap frame saved on exception entry
pub struct TrapFrame {
    pub ra: usize,
    pub sp: usize,
}

pub fn trap_handler(tf: &mut TrapFrame) {
    // dispatch by scause in real kernel
    let _ = tf.ra;
    if tf.sp == 0 {
        return;
    }
}
`;
    const report = await quickAnalyze(code, 'rust');
    expect(report.overallScore).toBeGreaterThan(25);
  });
});
