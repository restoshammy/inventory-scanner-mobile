// src/api.ts — uses dynamic endpoints so URL changes take effect immediately
import { API } from './config';

export async function scanAdjust(barcode: string, delta: number, note?: string) {
  const res = await fetch(API.SCAN(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ barcode, delta, note }),
  });
  const text = await res.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch {}
  if (!res.ok) throw new Error(typeof data === 'string' ? data : data?.error || `HTTP ${res.status}`);
  return data as { ok: boolean; productId?: string; qty?: number };
}

export async function getHealth(): Promise<boolean> {
  try {
    const res = await fetch(API.HEALTH(), { method: 'GET' });
    return res.ok;
  } catch { return false as any; }
}

export async function getProductByBarcode(barcode: string) {
  const res = await fetch(API.PRODUCTS());
  const items = await res.json().catch(() => []);
  if (!Array.isArray(items)) return null;
  return items.find((p: any) => p.barcode === barcode) || null;
}
