import { NextResponse } from 'next/server';
import { buildRiskQueue, riskItemsToCsv, updateRiskResolution, type RiskQueueFilters } from '@/lib/ops/risk';
import { workerAuthError } from '@/lib/judge/worker';

function parseFilters(req: Request): RiskQueueFilters & { format: string } {
  const url = new URL(req.url);
  const severity = url.searchParams.get('severity') || 'all';
  const status = url.searchParams.get('status') || 'all';
  const cohortId = url.searchParams.get('cohortId') || undefined;
  const format = url.searchParams.get('format') || 'json';
  return {
    severity: ['high', 'medium', 'low', 'all'].includes(severity)
      ? (severity as RiskQueueFilters['severity'])
      : 'all',
    status: ['open', 'acknowledged', 'resolved', 'ignored', 'all'].includes(status)
      ? (status as RiskQueueFilters['status'])
      : 'all',
    cohortId,
    format,
  };
}

export async function GET(req: Request) {
  const auth = workerAuthError(req);
  if (auth) return auth;

  try {
    const { format, ...filters } = parseFilters(req);
    const riskQueue = await buildRiskQueue(filters);
    if (format === 'csv') {
      return new NextResponse(riskItemsToCsv(riskQueue.items), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="opencamp-risk-queue-${riskQueue.generatedAt.slice(0, 10)}.csv"`,
        },
      });
    }
    return NextResponse.json({ riskQueue });
  } catch (error) {
    console.error('Ops risk GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = workerAuthError(req);
  if (auth) return auth;

  try {
    const body = (await req.json()) as {
      riskId?: string;
      status?: 'open' | 'acknowledged' | 'resolved' | 'ignored';
      note?: string;
      handledBy?: string;
    };
    if (!body.riskId || !body.status) {
      return NextResponse.json({ error: 'riskId and status required' }, { status: 400 });
    }
    if (!['open', 'acknowledged', 'resolved', 'ignored'].includes(body.status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }
    const resolution = await updateRiskResolution({
      riskId: body.riskId,
      status: body.status,
      note: body.note,
      handledBy: body.handledBy,
    });
    const riskQueue = await buildRiskQueue();
    return NextResponse.json({ resolution, riskQueue });
  } catch (error) {
    console.error('Ops risk POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
