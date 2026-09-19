// Banco Prisma em memória usado só nos testes: permite executar os handlers reais das rotas sem Postgres.
type Row = Record<string, any>;

const REL: Record<string, Record<string, { model: string; fk?: string; many?: boolean; localKey?: string }>> = {
  order: {
    vendor: { model: 'vendor', localKey: 'vendorId' },
    client: { model: 'user', localKey: 'clientId' },
    items: { model: 'orderItem', fk: 'orderId', many: true },
    review: { model: 'review', fk: 'orderId' },
  },
  orderItem: { product: { model: 'product', localKey: 'productId' }, order: { model: 'order', localKey: 'orderId' } },
  product: { vendor: { model: 'vendor', localKey: 'vendorId' } },
  vendor: {
    user: { model: 'user', localKey: 'userId' },
    products: { model: 'product', fk: 'vendorId', many: true },
    pickupWindows: { model: 'pickupWindow', fk: 'vendorId', many: true },
    reviews: { model: 'review', fk: 'vendorId', many: true },
  },
  coupon: { vendor: { model: 'vendor', localKey: 'vendorId' } },
  user: { vendor: { model: 'vendor', fk: 'userId' } },
  review: { vendor: { model: 'vendor', localKey: 'vendorId' } },
};

const UNIQUE: Record<string, string[]> = {
  user: ['email'],
  vendor: ['slug'],
  coupon: ['code'],
  order: ['orderNumber'],
  review: ['orderId'],
};

const DEFAULTS: Record<string, () => Row> = {
  user: () => ({ role: 'CLIENT', phone: null, whatsappPhone: null, passwordHash: null }),
  vendor: () => ({
    rating: 5, ratingCount: 0, plan: 'FREE', maxProducts: 5, isSubscriber: false, commissionRate: 0.05,
    isFeatured: false, featuredUntil: null, featuredOrder: 0, isCertifiedOrganic: false, certStatus: 'NONE',
    active: true, boothNumber: null, whatsappPhone: null, coverImage: null, avatar: null,
  }),
  product: () => ({ unit: 'kg', stock: 0, imageUrl: null, isOrganic: false, isWeighable: false, isActive: true }),
  order: () => ({ status: 'NOVO', paymentMethod: 'RETIRADA', paymentStatus: 'PENDENTE', discountAmount: 0, couponCode: null, originalAmount: null, notes: null, mpPaymentId: null }),
  orderItem: () => ({ measuredWeight: null }),
  coupon: () => ({ discountType: 'PERCENTAGE', minOrderValue: 0, maxUses: null, usedCount: 0, expiresAt: null, vendorId: null, active: true }),
  notification: () => ({ read: false, orderId: null }),
  pickupWindow: () => ({ maxOrders: 30, active: true, fairLocationId: null }),
  review: () => ({ vendorReply: null, vendorReplyAt: null }),
};

const tick = () => new Promise<void>(r => setImmediate(r));
const OPS = ['equals', 'in', 'notIn', 'gt', 'gte', 'lt', 'lte', 'contains', 'not', 'startsWith'];
const isOp = (v: any) => v && typeof v === 'object' && !(v instanceof Date) && Object.keys(v).some(k => OPS.includes(k));

function assertValid(v: any) {
  if (v instanceof Date && isNaN(v.getTime())) {
    const e: any = new Error('Invalid value for argument: Provided Date object is invalid.');
    e.name = 'PrismaClientValidationError';
    throw e;
  }
}

export class FakePrisma {
  tables: Record<string, Row[]> = {};
  private seq = 0;
  [k: string]: any;

  constructor() {
    for (const m of ['user', 'vendor', 'product', 'order', 'orderItem', 'coupon', 'notification', 'pickupWindow', 'review', 'fairLocation', 'vendorFairLocation']) {
      this.tables[m] = [];
      this[m] = this.model(m);
    }
  }

  reset() {
    for (const k of Object.keys(this.tables)) this.tables[k] = [];
    this.seq = 0;
  }

  seed(model: string, rows: Row[]) {
    for (const r of rows) {
      this.tables[model].push({ createdAt: new Date(), updatedAt: new Date(), ...(DEFAULTS[model]?.() ?? {}), ...r });
    }
  }

  private txQueue: Promise<unknown> = Promise.resolve();

  // Transações interativas são serializadas (equivale ao bloqueio de linhas do Postgres) e desfeitas em caso de erro.
  async $transaction(arg: any) {
    if (typeof arg === 'function') {
      const run = this.txQueue.then(async () => {
        const snap = structuredClone(this.tables);
        try {
          return await arg(this);
        } catch (e) {
          this.tables = snap;
          throw e;
        }
      });
      this.txQueue = run.catch(() => undefined);
      return run;
    }
    return Promise.all(arg);
  }

  matches(model: string, row: Row, where?: Row): boolean {
    if (!where) return true;
    for (const [k, cond] of Object.entries(where)) {
      if (cond === undefined) continue;
      if (k === 'AND') {
        if (!(Array.isArray(cond) ? cond : [cond]).every((c: Row) => this.matches(model, row, c))) return false;
        continue;
      }
      if (k === 'OR') {
        if (!(cond as Row[]).some(c => this.matches(model, row, c))) return false;
        continue;
      }
      if (k === 'NOT') {
        if ((Array.isArray(cond) ? cond : [cond]).some((c: Row) => this.matches(model, row, c))) return false;
        continue;
      }
      const rel = REL[model]?.[k];
      if (rel && cond && typeof cond === 'object' && !isOp(cond) && !(cond instanceof Date)) {
        const related = this.related(model, row, k);
        const list = Array.isArray(related) ? related : related ? [related] : [];
        if (!list.some(r => this.matches(rel.model, r, cond as Row))) return false;
        continue;
      }
      if (!this.fieldMatches(row[k], cond)) return false;
    }
    return true;
  }

  fieldMatches(value: any, cond: any): boolean {
    assertValid(cond);
    if (cond instanceof Date) return value instanceof Date && value.getTime() === cond.getTime();
    if (cond === null) return value === null || value === undefined;
    if (typeof cond !== 'object') return value === cond;
    const ci = cond.mode === 'insensitive';
    const norm = (x: any) => (ci && typeof x === 'string' ? x.toLowerCase() : x);
    const num = (x: any) => (x instanceof Date ? x.getTime() : x);
    for (const [op, arg] of Object.entries(cond)) {
      assertValid(arg);
      if (op === 'mode') continue;
      if (op === 'equals' && norm(value) !== norm(arg)) return false;
      if (op === 'in' && !(arg as any[]).includes(value)) return false;
      if (op === 'notIn' && (arg as any[]).includes(value)) return false;
      if (op === 'not' && (value === arg || (arg && typeof arg === 'object' && this.fieldMatches(value, arg)))) return false;
      if (op === 'gt' && !(num(value) > num(arg))) return false;
      if (op === 'gte' && !(num(value) >= num(arg))) return false;
      if (op === 'lt' && !(num(value) < num(arg))) return false;
      if (op === 'lte' && !(num(value) <= num(arg))) return false;
      if (op === 'contains' && !(typeof value === 'string' && norm(value).includes(norm(arg as string)))) return false;
      if (op === 'startsWith' && !(typeof value === 'string' && norm(value).startsWith(norm(arg as string)))) return false;
    }
    return true;
  }

  related(model: string, row: Row, key: string): any {
    const rel = REL[model][key];
    const target = this.tables[rel.model];
    if (rel.localKey) return target.find(r => r.id === row[rel.localKey!]) ?? null;
    const list = target.filter(r => r[rel.fk!] === row.id);
    return rel.many ? list : list[0] ?? null;
  }

  hydrate(model: string, row: Row, args: Row = {}): Row {
    const out: Row = { ...row };
    if (args.select) {
      const picked: Row = {};
      for (const [k, v] of Object.entries(args.select)) {
        if (!v) continue;
        picked[k] = REL[model]?.[k] ? this.hydrateRelation(model, row, k, v) : row[k];
      }
      return picked;
    }
    if (args.include) {
      for (const [k, v] of Object.entries(args.include)) {
        if (v) out[k] = this.hydrateRelation(model, row, k, v);
      }
    }
    return out;
  }

  hydrateRelation(model: string, row: Row, key: string, spec: any): any {
    const rel = REL[model][key];
    const data = this.related(model, row, key);
    const sub = spec === true ? {} : spec;
    if (rel.many) {
      let list: Row[] = data;
      if (sub.where) list = list.filter(r => this.matches(rel.model, r, sub.where));
      if (sub.take) list = list.slice(0, sub.take);
      return list.map(r => this.hydrate(rel.model, r, sub));
    }
    return data ? this.hydrate(rel.model, data, sub) : null;
  }

  applyData(row: Row, data: Row) {
    for (const [k, v] of Object.entries(data)) {
      assertValid(v);
      if (v && typeof v === 'object' && !(v instanceof Date) && ('increment' in v || 'decrement' in v)) {
        row[k] = (row[k] ?? 0) + ((v as any).increment ?? 0) - ((v as any).decrement ?? 0);
      } else if (v !== undefined) {
        row[k] = v;
      }
    }
    row.updatedAt = new Date();
  }

  checkTypes(model: string, data: Row) {
    // Campos Int do schema não aceitam decimais (mesmo comportamento do Prisma real).
    const ints: Record<string, string[]> = { orderItem: ['quantity'], product: ['stock'] };
    for (const f of ints[model] ?? []) {
      let v = data[f];
      if (v && typeof v === 'object') v = (v as any).increment ?? (v as any).decrement;
      if (typeof v === 'number' && !Number.isInteger(v)) {
        const e: any = new Error('Argument ' + f + ': Invalid value provided. Expected Int, provided Float.');
        e.name = 'PrismaClientValidationError';
        throw e;
      }
    }
  }

  model(name: string) {
    const self = this;
    const table = () => self.tables[name];
    const api: Row = {
      async findMany(args: Row = {}) {
        await tick();
        let rows = table().filter(r => self.matches(name, r, args.where));
        if (args.orderBy) {
          const list = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
          rows = [...rows].sort((a, b) => {
            for (const o of list) {
              const [f, dir] = Object.entries(o)[0] as [string, string];
              const av = a[f] instanceof Date ? a[f].getTime() : a[f];
              const bv = b[f] instanceof Date ? b[f].getTime() : b[f];
              if (av === bv) continue;
              return (av > bv ? 1 : -1) * (dir === 'desc' ? -1 : 1);
            }
            return 0;
          });
        }
        if (args.take) rows = rows.slice(0, args.take);
        return rows.map(r => self.hydrate(name, r, args));
      },
      async findFirst(args: Row = {}) {
        const rows = await api.findMany({ ...args, take: 1 });
        return rows[0] ?? null;
      },
      async findUnique(args: Row) {
        return api.findFirst(args);
      },
      async count(args: Row = {}) {
        await tick();
        return table().filter(r => self.matches(name, r, args.where)).length;
      },
      async create(args: Row) {
        await tick();
        const { data } = args;
        self.checkTypes(name, data);
        const nested: Row = {};
        const flat: Row = {};
        for (const [k, v] of Object.entries(data)) {
          if (v && typeof v === 'object' && !(v instanceof Date) && REL[name]?.[k] && ('create' in (v as Row) || 'connect' in (v as Row))) nested[k] = v;
          else {
            assertValid(v);
            flat[k] = v;
          }
        }
        for (const [k, v] of Object.entries(nested)) {
          if ((v as Row).connect && REL[name][k].localKey) flat[REL[name][k].localKey!] = (v as Row).connect.id;
        }
        const row: Row = { id: name + '_' + ++self.seq, createdAt: new Date(), updatedAt: new Date(), ...(DEFAULTS[name]?.() ?? {}), ...flat };
        for (const f of UNIQUE[name] ?? []) {
          if (row[f] != null && table().some(r => r[f] === row[f])) {
            const e: any = new Error('Unique constraint failed on the fields: (' + f + ')');
            e.code = 'P2002';
            throw e;
          }
        }
        table().push(row);
        for (const [k, v] of Object.entries(nested)) {
          const rel = REL[name][k];
          if (!(v as Row).create) continue;
          const list = Array.isArray((v as Row).create) ? (v as Row).create : [(v as Row).create];
          for (const child of list) await (self[rel.model] as any).create({ data: { ...child, [rel.fk!]: row.id } });
        }
        return self.hydrate(name, row, args);
      },
      async update(args: Row) {
        await tick();
        const row = table().find(r => self.matches(name, r, args.where));
        if (!row) throw Object.assign(new Error('Record to update not found.'), { code: 'P2025' });
        self.checkTypes(name, args.data);
        self.applyData(row, args.data);
        return self.hydrate(name, row, args);
      },
      async updateMany(args: Row) {
        await tick();
        self.checkTypes(name, args.data);
        const rows = table().filter(r => self.matches(name, r, args.where));
        for (const r of rows) self.applyData(r, args.data);
        return { count: rows.length };
      },
      async delete(args: Row) {
        await tick();
        const i = table().findIndex(r => self.matches(name, r, args.where));
        if (i < 0) throw Object.assign(new Error('Record to delete does not exist.'), { code: 'P2025' });
        return table().splice(i, 1)[0];
      },
      async deleteMany(args: Row = {}) {
        const rows = table().filter(r => self.matches(name, r, args.where));
        self.tables[name] = table().filter(r => !rows.includes(r));
        return { count: rows.length };
      },
    };
    return api;
  }
}
