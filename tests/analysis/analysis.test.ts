import { describe, it, expect } from 'vitest';
import { analyzeCorrectness } from '@/lib/analysis/correctness';
import { analyzeStyle } from '@/lib/analysis/style';
import { analyzeEfficiency } from '@/lib/analysis/efficiency';
import { analyzeSecurity } from '@/lib/analysis/security';
import { analyzeReadability } from '@/lib/analysis/readability';

describe('Code Analysis', () => {
  describe('Correctness Analyzer', () => {
    it('should analyze valid Rust code', async () => {
      const code = `
fn main() {
    let x = 5;
    println!("{}", x);
}
`;
      const result = await analyzeCorrectness(code, 'rust');
      expect(result.dimension).toBe('correctness');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should detect unwrap usage', async () => {
      const code = `
fn main() {
    let s = "hello";
    let n: i32 = s.parse().unwrap();
    println!("{}", n);
}
`;
      const result = await analyzeCorrectness(code, 'rust');
      expect(result.issues.some(i => i.message.includes('unwrap'))).toBe(true);
    });
  });

  describe('Style Analyzer', () => {
    it('should check naming conventions', async () => {
      const code = `
fn MyFunction() {
    println!("hello");
}
`;
      const result = await analyzeStyle(code, 'rust');
      expect(result.issues.some(i => i.message.includes('snake_case'))).toBe(true);
    });
  });

  describe('Efficiency Analyzer', () => {
    it('should detect nested loops', async () => {
      const code = `
fn main() {
    for i in 0..10 {
        for j in 0..10 {
            println!("{} {}", i, j);
        }
    }
}
`;
      const result = await analyzeEfficiency(code, 'rust');
      expect(result.issues.some(i => i.message.includes('嵌套循环'))).toBe(true);
    });
  });

  describe('Security Analyzer', () => {
    it('should detect unsafe blocks', async () => {
      const code = `
fn main() {
    unsafe {
        let x = 5;
    }
}
`;
      const result = await analyzeSecurity(code, 'rust');
      expect(result.issues.some(i => i.message.includes('unsafe'))).toBe(true);
    });
  });

  describe('Readability Analyzer', () => {
    it('should check function length', async () => {
      const longFn = '    println!("line");\n'.repeat(60);
      const code = `
fn long_function() {
${longFn}
}
`;
      const result = await analyzeReadability(code, 'rust');
      expect(result.issues.some(i => i.message.includes('50 行'))).toBe(true);
    });
  });
});
