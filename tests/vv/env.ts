import path from 'path';
import { pathToFileURL } from 'url';
import crypto from 'crypto';
import { FakePrisma } from './fake-prisma';

export const ROOT = process.env.VV_ROOT || process.cwd();
export const db = new FakePrisma();
(globalThis as any).prisma = db; // src/lib/prisma.ts reutiliza esta instância

export async function load(rel: string, absolute = false) {
  const file = absolute ? rel : path.join(ROOT, rel);
  return import(pathToFileURL(file).href);
}

export type Res = { status: number; json: any };

export async function call(handler: (req: Request, ctx?: any) => Promise<Response>, method: string, opts: { url?: string; body?: any; params?: any } = {}): Promise<Res> {
  const init: RequestInit = { method, headers: { 'content-type': 'application/json' } };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  const req = new Request(opts.url || 'http://localhost/api', init);
  try {
    const res = await handler(req, opts.params ? { params: opts.params } : undefined);
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      /* sem corpo */
    }
    return { status: res.status, json };
  } catch (e: any) {
    return { status: 599, json: { error: 'exceção não tratada: ' + (e?.message || e) } };
  }
}

export const legacyHash = (pw: string, salt = 'aa'.repeat(16)) => salt + ':' + crypto.pbkdf2Sync(pw, salt, 1000, 64, 'sha512').toString('hex');
export const modernHash = (pw: string, salt = 'bb'.repeat(16), rounds = 120000) =>
  'pbkdf2$' + rounds + '$' + salt + '$' + crypto.pbkdf2Sync(pw, salt, rounds, 64, 'sha512').toString('hex');

const DAY = 86400000;

export function freshDb() {
  db.reset();
  const legacy = legacyHash('Senha@123');
  db.seed('user', [
    { id: 'u-admin', name: 'Admin', email: 'admin@feirae.com', role: 'ADMIN', passwordHash: legacy },
    { id: 'u-client', name: 'Maria', email: 'maria@feirae.com', role: 'CLIENT', passwordHash: legacy, phone: '(87) 90000-0000' },
    { id: 'u-v1', name: 'Ze', email: 'ze@feirae.com', role: 'VENDOR', passwordHash: legacy },
    { id: 'u-v2', name: 'Neusa', email: 'neusa@feirae.com', role: 'VENDOR', passwordHash: legacy },
    { id: 'u-v3', name: 'V3', email: 'v3@feirae.com', role: 'VENDOR' },
    { id: 'u-v4', name: 'V4', email: 'v4@feirae.com', role: 'VENDOR' },
    { id: 'u-v5', name: 'V5', email: 'v5@feirae.com', role: 'VENDOR' },
    { id: 'u-legacy', name: 'Sem hash', email: 'semhash@feirae.com', role: 'CLIENT', passwordHash: null },
  ]);
  db.seed('vendor', [
    { id: 'v1', userId: 'u-v1', businessName: 'Horta do Ze', slug: 'horta-do-ze', description: 'd', category: 'Hortifruti', fairLocation: 'Praca' },
    { id: 'v2', userId: 'u-v2', businessName: 'Doces da Neusa', slug: 'doces-neusa', description: 'd', category: 'Doces', fairLocation: 'Praca', plan: 'PRO', isSubscriber: true, maxProducts: 9999, commissionRate: 0 },
    { id: 'v3', userId: 'u-v3', businessName: 'Banca 3', slug: 'banca-3', description: 'd', category: 'Frutas', fairLocation: 'Praca' },
    { id: 'v4', userId: 'u-v4', businessName: 'Banca 4', slug: 'banca-4', description: 'd', category: 'Frutas', fairLocation: 'Praca' },
    { id: 'v5', userId: 'u-v5', businessName: 'Banca fechada', slug: 'banca-5', description: 'd', category: 'Frutas', fairLocation: 'Praca', active: false },
  ]);
  const prod = (id: string, vendorId: string, price: number, stock: number, extra: any = {}) => ({ id, vendorId, name: 'Produto ' + id, description: 'd', category: 'Hortalicas', price, stock, ...extra });
  db.seed('product', [
    prod('p1', 'v1', 10, 5),
    prod('p2', 'v1', 20, 3),
    prod('p3', 'v2', 15, 4),
    ...[1, 2, 3, 4].map(i => prod('a' + i, 'v3', 5, 5)),
    ...[1, 2, 3, 4, 5].map(i => prod('b' + i, 'v4', 5, 5)),
  ]);
  db.seed('coupon', [
    { id: 'c-promo', code: 'PROMO10', discountType: 'PERCENTAGE', discountValue: 10 },
    { id: 'c-fixo', code: 'FIXO5', discountType: 'FIXED', discountValue: 5, minOrderValue: 20, vendorId: 'v1' },
    { id: 'c-exp', code: 'EXPIRADO', discountValue: 10, expiresAt: new Date(Date.now() - DAY) },
    { id: 'c-max', code: 'ESGOTADO', discountValue: 10, maxUses: 1, usedCount: 1 },
    { id: 'c-v2', code: 'SOV2', discountValue: 10, vendorId: 'v2' },
    { id: 'c-plat', code: 'PLATAFORMA', discountValue: 15 },
  ]);
}

export function seedOrder(id: string, status: string, extra: any = {}) {
  db.seed('order', [{
    id, orderNumber: 'FE-2026-' + id, clientId: 'u-client', clientName: 'Maria', clientPhone: '(87) 90000-0000', clientEmail: 'maria@feirae.com',
    vendorId: 'v1', totalAmount: 100, status, paymentMethod: 'RETIRADA', pickupDate: 'Sabado', pickupLocation: 'Praca', ...extra,
  }]);
  db.seed('orderItem', [{ id: 'it-' + id, orderId: id, productId: 'p1', productName: 'Produto p1', productUnit: 'kg', unitPrice: 10, quantity: 2, subtotal: 20 }]);
}

export const stockOf = (id: string) => db.tables.product.find(p => p.id === id)?.stock;
export const orderCount = () => db.tables.order.length;
export const short = (r: Res) => r.status + (r.json?.error ? ' "' + String(r.json.error).slice(0, 70) + '"' : '');
