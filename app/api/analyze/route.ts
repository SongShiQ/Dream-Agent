// 代码分析 API

import { NextResponse } from 'next/server';
import { analyzeCode, quickAnalyze, fullAnalyze } from '@/lib/analysis/index';
import type { AnalysisConfig } from '@/lib/analysis/types';

export async function POST(req: Request) {
  try {
    const { code, language, mode, dimensions } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    let result;

    switch (mode) {
      case 'quick':
        result = await quickAnalyze(code, language || 'rust');
        break;

      case 'full':
        result = await fullAnalyze(code, language || 'rust');
        break;

      case 'custom':
        if (!dimensions || !Array.isArray(dimensions)) {
          return NextResponse.json(
            { error: 'dimensions array is required for custom mode' },
            { status: 400 }
          );
        }
        const config: AnalysisConfig = {
          dimensions,
          language: language || 'rust',
          strictMode: false,
        };
        result = await analyzeCode(code, config);
        break;

      default:
        // 默认使用快速分析
        result = await quickAnalyze(code, language || 'rust');
    }

    return NextResponse.json({ analysis: result });
  } catch (error) {
    console.error('Analyze API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
