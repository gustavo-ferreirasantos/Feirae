import fs from 'fs';
import path from 'path';
import { ROOT, load, freshDb } from './env';
import { buildCases, Case, Mods } from './cases';

const MODE = process.env.VV_MODE || 'run';
const LABEL = process.env.VV_LABEL || 'run';
const OUT = process.env.VV_OUT || path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const realConsole = { ...console };
for (const k of ['log', 'warn', 'error', 'info'] as const) (console as any)[k] = () => {};

const FILES: Record<string, string> = {
  products: 'src/app/api/products/route.ts',
  coupons: 'src/app/api/coupons/route.ts',
  couponsId: 'src/app/api/coupons/[id]/route.ts',
  orders: 'src/app/api/orders/route.ts',
  ordersId: 'src/app/api/orders/[id]/route.ts',
  auth: 'src/app/api/auth/route.ts',
  register: 'src/app/api/auth/register/route.ts',
  finance: 'src/app/api/vendors/finance/stats/route.ts',
  adminStats: 'src/app/api/admin/stats/route.ts',
  authLib: 'src/lib/auth.ts',
};
const TARGET_OF: Record<string, string> = { authlib: 'authLib' };

async function loadMods(overrides: Record<string, any> = {}): Promise<Mods> {
  const mods: Mods = {};
  for (const [k, f] of Object.entries(FILES)) mods[k] = overrides[k] ?? (await load(f));
  return mods;
}

async function runCases(cases: Case[]) {
  const results: any[] = [];
  for (const c of cases) {
    let out;
    try {
      out = await c.run();
    } catch (e: any) {
      out = { obtained: 'exceção do teste: ' + (e?.message || e), pass: false };
    }
    results.push({ id: c.id, target: c.target, group: c.group, tech: c.tech, variable: c.variable, klass: c.klass, input: c.input, expected: c.expected, obtained: out.obtained, pass: out.pass });
  }
  return results;
}

(async () => {
  const mods = await loadMods();
  const cases = buildCases(mods);

  if (MODE === 'run') {
    const onlyAuthLibAfter = process.env.VV_SKIP_AUTHLIB === '1';
    const selected = onlyAuthLibAfter ? cases.filter(c => c.target !== 'authlib') : cases;
    const results = await runCases(selected);
    fs.writeFileSync(path.join(OUT, LABEL + '.json'), JSON.stringify({ label: LABEL, root: ROOT, tzOffsetMin: new Date().getTimezoneOffset(), results }, null, 2));
    const pass = results.filter(r => r.pass).length;
    realConsole.log(LABEL + ': ' + pass + '/' + results.length + ' casos com saída obtida = esperada (TZ offset ' + new Date().getTimezoneOffset() + ')');
    for (const r of results.filter(r => !r.pass)) realConsole.log('  FALHA ' + r.id + ' [' + r.group + '] ' + r.input + ' -> ' + r.obtained);
    return;
  }

  // ---------------- Teste de mutação
  const { MUTANTS } = await import('./mutants');
  const baseline: Record<string, any[]> = {};
  const report: any[] = [];
  fs.mkdirSync(path.join(__dirname, '.mut'), { recursive: true });

  for (const mu of MUTANTS) {
    const srcPath = path.join(ROOT, mu.file);
    const src = fs.readFileSync(srcPath, 'utf-8').replace(/\r\n/g, '\n');
    const count = src.split(mu.search).length - 1;
    if (count < 1) throw new Error('mutante ' + mu.id + ': trecho não encontrado: ' + mu.search);
    const mutated = src.replace(mu.search, mu.replace);
    const file = path.join(__dirname, '.mut', mu.id + '.ts');
    fs.writeFileSync(file, mutated);
    const mutMod = await load(file, true);
    const mutMods = await loadMods({ [mu.target]: mutMod });
    const mutCases = buildCases(mutMods);

    const suiteAll = cases.filter(c => c.target === (TARGET_OF[c.target] ? c.target : c.target) && (TARGET_OF[c.target] ?? c.target) === mu.target);
    const key = mu.target;
    if (!baseline[key]) baseline[key] = await runCases(suiteAll);

    const mutSuite = mutCases.filter(c => (TARGET_OF[c.target] ?? c.target) === mu.target);
    const mutResults = await runCases(mutSuite);

    const killedBy = (allowed: string[]) => {
      const list: string[] = [];
      mutResults.forEach((r, i) => {
        const b = baseline[key][i];
        if (allowed.includes(r.tech) && (r.obtained !== b.obtained || r.pass !== b.pass)) list.push(r.id);
      });
      return list;
    };
    const A = killedBy(['PEC']);
    const B = killedBy(['PEC', 'AVL', 'PATH', 'FLUXO']);
    report.push({ id: mu.id, file: mu.file, desc: mu.desc, target: mu.target, equivalent: !!mu.equivalent, killedA: A.length > 0, killedB: B.length > 0, killersA: A, killersB: B });
  }
  fs.writeFileSync(path.join(OUT, 'mutation.json'), JSON.stringify(report, null, 2));
  const nonEq = report.filter(r => !r.equivalent);
  realConsole.log('mutantes: ' + report.length + ' (equivalentes: ' + (report.length - nonEq.length) + ')');
  realConsole.log('suíte A (só partições de equivalência): mortos ' + nonEq.filter(r => r.killedA).length + '/' + nonEq.length);
  realConsole.log('suíte B (+ valor limite, caminhos e fluxos): mortos ' + nonEq.filter(r => r.killedB).length + '/' + nonEq.length);
  for (const r of report) realConsole.log('  ' + r.id + (r.equivalent ? ' [equiv]' : '') + ' A=' + (r.killedA ? 'morto' : 'VIVO') + ' B=' + (r.killedB ? 'morto' : 'VIVO') + ' :: ' + r.desc);
})().catch(e => { realConsole.error(e); process.exit(1); });
