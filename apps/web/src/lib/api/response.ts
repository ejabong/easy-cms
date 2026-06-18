import { NextResponse } from 'next/server';

/** Standard success envelope. */
export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, ...(meta && { meta }) });
}

/** Standard error envelope. */
export function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}
