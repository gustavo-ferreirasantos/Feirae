import crypto from 'crypto';
import { call, db, freshDb, seedOrder, stockOf, orderCount, short, legacyHash, modernHash, Res } from './env';

export type Tech = 'PEC' | 'AVL' | 'FLUXO' | 'PATH';
export type Outcome = { obtained: string; pass: boolean };
export type Case = {
  id: string;
  target: string;
  group: string;
  tech: Tech;
  variable: string;
  klass: string;
  input: string;
  expected: string;
  run: () => Promise<Outcome>;
};

export type Mods = Record<string, any>;

const is2xx = (r: Res) => r.status >= 200 && r.status < 300;
const is4xx = (r: Res) => r.status >= 400 && r.status < 500;
const DAY = 86400000;

export function buildCases(m: Mods): Case[] {
  const cases: Case[] = [];
  let n = 0;
  const add = (target: string, group: string, tech: Tech, variable: string, klass: string, input: string, expected: string, run: () => Promise<Outcome>) => {
    n++;
    cases.push({ id: 'CT-' + String(n).padStart(3, '0'), target, group, tech, variable, klass, input, expected, run });
  };
  const ok = (r: Res, extra = true): Outcome => ({ obtained: 'OK (' + r.status + ')', pass: is2xx(r) && extra });
  const err = (r: Res, extra = true): Outcome => ({ obtained: (is4xx(r) ? 'ERRO (' : r.status >= 500 ? 'FALHA (' : 'OK (') + short(r) + (is4xx(r) || r.status >= 500 ? ')' : ')'), pass: is4xx(r) && extra });

  // ---------------------------------------------------------------- Cadastro de produto
  const G1 = 'Cadastro de produto (POST /api/products)';
  const prodBody = (o: any = {}) => ({ vendorId: 'v1', name: 'Alface', description: 'fresca', category: 'Hortalicas', unit: 'un', price: 10, stock: 10, ...o });
  const postProd = async (o: any) => { freshDb(); return call(m.products.POST, 'POST', { body: prodBody(o) }); };
  const prodCase = (tech: Tech, variable: string, klass: string, label: string, over: any, valid: boolean) =>
    add('products', G1, tech, variable, klass, label, valid ? 'OK' : 'ERRO', async () => { const r = await postProd(over); return valid ? ok(r) : err(r); });

  prodCase('PEC', 'Preço (P)', 'válida  P > 0', 'P = 12,50', { price: 12.5 }, true);
  prodCase('PEC', 'Preço (P)', 'inválida P <= 0', 'P = -2,50', { price: -2.5 }, false);
  prodCase('PEC', 'Preço (P)', 'inválida não numérica', 'P = "abc"', { price: 'abc' }, false);
  prodCase('AVL', 'Preço (P)', 'limite inferior', 'P = -0,01', { price: -0.01 }, false);
  prodCase('AVL', 'Preço (P)', 'limite inferior', 'P = 0', { price: 0 }, false);
  prodCase('AVL', 'Preço (P)', 'limite inferior', 'P = 0,01', { price: 0.01 }, true);
  prodCase('PEC', 'Estoque (E)', 'válida  E inteiro >= 0', 'E = 10', { stock: 10 }, true);
  prodCase('PEC', 'Estoque (E)', 'inválida E < 0', 'E = -3', { stock: -3 }, false);
  prodCase('PEC', 'Estoque (E)', 'inválida não inteiro', 'E = 2,5', { stock: 2.5 }, false);
  prodCase('AVL', 'Estoque (E)', 'limite inferior', 'E = -1', { stock: -1 }, false);
  prodCase('AVL', 'Estoque (E)', 'limite inferior', 'E = 0', { stock: 0 }, true);
  prodCase('AVL', 'Estoque (E)', 'limite inferior', 'E = 1', { stock: 1 }, true);
  prodCase('PEC', 'Nome (N)', 'inválida vazio', 'N = ""', { name: '' }, false);
  prodCase('PEC', 'Nome (N)', 'inválida só espaços', 'N = "   "', { name: '   ' }, false);
  prodCase('PEC', 'Barraca (V)', 'inválida inexistente', 'vendorId = "nao-existe"', { vendorId: 'nao-existe' }, false);
  add('products', G1, 'AVL', 'Qtd. de produtos ativos no plano grátis (limite 5)', 'limite inferior', 'barraca com 4 produtos ativos cadastra o 5º', 'OK', async () => {
    freshDb();
    return ok(await call(m.products.POST, 'POST', { body: prodBody({ vendorId: 'v3' }) }));
  });
  add('products', G1, 'AVL', 'Qtd. de produtos ativos no plano grátis (limite 5)', 'limite superior', 'barraca com 5 produtos ativos cadastra o 6º', 'ERRO (403)', async () => {
    freshDb();
    const r = await call(m.products.POST, 'POST', { body: prodBody({ vendorId: 'v4' }) });
    return err(r, r.status === 403);
  });
  add('products', G1, 'PEC', 'Plano da barraca', 'válida plano PRO', 'barraca PRO cadastra produto acima de 5', 'OK', async () => {
    freshDb();
    for (let i = 0; i < 6; i++) db.seed('product', [{ id: 'x' + i, vendorId: 'v2', name: 'x', description: 'd', category: 'c', price: 1, stock: 1 }]);
    return ok(await call(m.products.POST, 'POST', { body: prodBody({ vendorId: 'v2' }) }));
  });

  // ---------------------------------------------------------------- Cadastro de cupom
  const G2 = 'Cadastro de cupom (POST /api/coupons)';
  const cpBody = (o: any = {}) => ({ code: 'NOVO10', discountType: 'PERCENTAGE', discountValue: 10, minOrderValue: 0, maxUses: null, expiresAt: null, vendorId: null, ...o });
  const postCp = async (o: any) => { freshDb(); return call(m.coupons.POST, 'POST', { body: cpBody(o) }); };
  const cpCase = (tech: Tech, variable: string, klass: string, label: string, over: any, valid: boolean) =>
    add('coupons', G2, tech, variable, klass, label, valid ? 'OK' : 'ERRO', async () => { const r = await postCp(over); return valid ? ok(r) : err(r); });

  cpCase('PEC', 'Desconto % (D)', 'válida  0 < D <= 100', 'D = 10 (%)', { discountValue: 10 }, true);
  cpCase('PEC', 'Desconto % (D)', 'inválida D <= 0', 'D = -5 (%)', { discountValue: -5 }, false);
  cpCase('PEC', 'Desconto % (D)', 'inválida D > 100', 'D = 150 (%)', { discountValue: 150 }, false);
  cpCase('PEC', 'Desconto fixo (D)', 'válida D > 0 (sem teto)', 'D = 15 (R$)', { discountType: 'FIXED', discountValue: 15 }, true);
  cpCase('AVL', 'Desconto % (D)', 'limite inferior', 'D = 0 (%)', { discountValue: 0 }, false);
  cpCase('AVL', 'Desconto % (D)', 'limite inferior', 'D = 0,01 (%)', { discountValue: 0.01 }, true);
  cpCase('AVL', 'Desconto % (D)', 'limite superior', 'D = 100 (%)', { discountValue: 100 }, true);
  cpCase('AVL', 'Desconto % (D)', 'limite superior', 'D = 100,01 (%)', { discountValue: 100.01 }, false);
  cpCase('PEC', 'Pedido mínimo (M)', 'válida M >= 0', 'M = 20', { minOrderValue: 20 }, true);
  cpCase('PEC', 'Pedido mínimo (M)', 'inválida M < 0', 'M = -10', { minOrderValue: -10 }, false);
  cpCase('AVL', 'Pedido mínimo (M)', 'limite inferior', 'M = -1', { minOrderValue: -1 }, false);
  cpCase('AVL', 'Pedido mínimo (M)', 'limite inferior', 'M = 0', { minOrderValue: 0 }, true);
  cpCase('AVL', 'Pedido mínimo (M)', 'limite inferior', 'M = 1', { minOrderValue: 1 }, true);
  cpCase('PEC', 'Limite de usos (U)', 'válida U inteiro > 0', 'U = 100', { maxUses: 100 }, true);
  cpCase('PEC', 'Limite de usos (U)', 'inválida U < 0', 'U = -5', { maxUses: -5 }, false);
  cpCase('PEC', 'Limite de usos (U)', 'inválida não inteiro', 'U = 2,5', { maxUses: 2.5 }, false);
  cpCase('AVL', 'Limite de usos (U)', 'limite inferior', 'U = 0', { maxUses: 0 }, false);
  cpCase('AVL', 'Limite de usos (U)', 'limite inferior', 'U = 1', { maxUses: 1 }, true);
  cpCase('PEC', 'Código (C)', 'válida len >= 3', 'C = "DESCONTO"', { code: 'DESCONTO' }, true);
  cpCase('PEC', 'Código (C)', 'inválida len < 3', 'C = "A"', { code: 'A' }, false);
  cpCase('PEC', 'Código (C)', 'inválida duplicado', 'C = "PROMO10" (já existe)', { code: 'PROMO10' }, false);
  cpCase('AVL', 'Código (C)', 'limite inferior', 'C = "AB" (2 caracteres)', { code: 'AB' }, false);
  cpCase('AVL', 'Código (C)', 'limite inferior', 'C = "ABC" (3 caracteres)', { code: 'ABC' }, true);
  cpCase('PEC', 'Validade (V)', 'válida data futura', 'V = hoje + 7 dias', { expiresAt: new Date(Date.now() + 7 * DAY).toISOString() }, true);
  cpCase('PEC', 'Validade (V)', 'inválida data passada', 'V = hoje - 7 dias', { expiresAt: new Date(Date.now() - 7 * DAY).toISOString() }, false);
  cpCase('PEC', 'Validade (V)', 'inválida formato', 'V = "abc"', { expiresAt: 'abc' }, false);
  cpCase('AVL', 'Validade (V)', 'tolerância de 60 s', 'V = agora - 30 s', { expiresAt: new Date(Date.now() - 30000).toISOString() }, true);
  cpCase('AVL', 'Validade (V)', 'tolerância de 60 s', 'V = agora - 120 s', { expiresAt: new Date(Date.now() - 120000).toISOString() }, false);
  cpCase('PEC', 'Barraca do cupom (B)', 'válida barraca existente', 'B = v1', { vendorId: 'v1' }, true);
  add('coupons', G2, 'PEC', 'Barraca do cupom (B)', 'inválida barraca inexistente', 'B = "barraca-inexistente"', 'ERRO (404); cupom NÃO pode virar global', async () => {
    freshDb();
    const r = await call(m.coupons.POST, 'POST', { body: cpBody({ vendorId: 'barraca-inexistente' }) });
    const created = db.tables.coupon.find(c => c.code === 'NOVO10');
    return { obtained: short(r) + (created ? ' -> criado com vendorId=' + created.vendorId : ' -> nada criado'), pass: is4xx(r) && !created };
  });

  // ---------------------------------------------------------------- Cadastro de conta
  const G3 = 'Cadastro de conta (POST /api/auth/register)';
  const regBody = (o: any = {}) => ({ name: 'Joana', email: 'joana@feirae.com', password: 'abc123', ...o });
  const reg = async (o: any) => { freshDb(); return call(m.register.POST, 'POST', { body: regBody(o) }); };
  const regCase = (tech: Tech, variable: string, klass: string, label: string, over: any, valid: boolean) =>
    add('register', G3, tech, variable, klass, label, valid ? 'OK' : 'ERRO', async () => { const r = await reg(over); return valid ? ok(r) : err(r); });
  regCase('PEC', 'Senha (S)', 'válida len >= 6', 'S = "abc123"', { password: 'abc123' }, true);
  regCase('PEC', 'Senha (S)', 'inválida len < 6', 'S = "ab"', { password: 'ab' }, false);
  regCase('PEC', 'Senha (S)', 'inválida ausente', 'S = (não informada)', { password: undefined }, false);
  regCase('AVL', 'Senha (S)', 'limite', 'S = 5 caracteres', { password: 'abcde' }, false);
  regCase('AVL', 'Senha (S)', 'limite', 'S = 6 caracteres', { password: 'abcdef' }, true);
  regCase('AVL', 'Senha (S)', 'limite', 'S = 7 caracteres', { password: 'abcdefg' }, true);
  regCase('PEC', 'E-mail (E)', 'inválida ausente', 'E = (não informado)', { email: undefined }, false);
  regCase('PEC', 'E-mail (E)', 'inválida já cadastrado', 'E = maria@feirae.com', { email: 'maria@feirae.com' }, false);
  regCase('PEC', 'Nome (N)', 'inválida ausente', 'N = (não informado)', { name: undefined }, false);
  regCase('PEC', 'Perfil VENDOR', 'válida com dados da barraca', 'role=VENDOR + barraca/categoria/local', { role: 'VENDOR', businessName: 'Banca Nova', category: 'Frutas', fairLocation: 'Praca' }, true);
  regCase('PEC', 'Perfil VENDOR', 'inválida sem nome da barraca', 'role=VENDOR sem businessName', { role: 'VENDOR', category: 'Frutas', fairLocation: 'Praca' }, false);
  add('register', G3, 'PEC', 'Perfil (role)', 'inválida escalonamento', 'role = "ADMIN" enviado no corpo', 'conta criada como CLIENT', async () => {
    const r = await reg({ role: 'ADMIN' });
    return { obtained: short(r) + ' role=' + r.json?.user?.role, pass: is2xx(r) && r.json?.user?.role === 'CLIENT' };
  });
  add('register', G3, 'FLUXO', 'Senha gravada', 'segurança', 'resposta não expõe passwordHash', 'sem passwordHash', async () => {
    const r = await reg({});
    return { obtained: JSON.stringify(r.json).includes('passwordHash') ? 'expõe passwordHash' : 'não expõe', pass: !JSON.stringify(r.json).includes('passwordHash') };
  });

  // ---------------------------------------------------------------- Login
  const G4 = 'Login (POST /api/auth)';
  const login = async (email: string, password?: any) => { freshDb(); return call(m.auth.POST, 'POST', { body: { email, password } }); };
  add('auth', G4, 'PEC', 'Senha', 'válida', 'maria@feirae.com + senha correta', 'OK (200)', async () => ok(await login('maria@feirae.com', 'Senha@123')));
  add('auth', G4, 'PEC', 'Senha', 'inválida senha errada', 'maria@feirae.com + senha errada', 'ERRO (401)', async () => { const r = await login('maria@feirae.com', 'errada'); return err(r, r.status === 401); });
  add('auth', G4, 'PEC', 'Senha', 'inválida ausente', 'maria@feirae.com sem o campo senha', 'ERRO (400/401)', async () => err(await login('maria@feirae.com', undefined)));
  add('auth', G4, 'AVL', 'Senha', 'inválida vazia', 'maria@feirae.com + senha ""', 'ERRO (400/401)', async () => err(await login('maria@feirae.com', '')));
  add('auth', G4, 'PEC', 'Perfil ADMIN sem senha', 'inválida ausente', 'admin@feirae.com sem o campo senha', 'ERRO (400/401)', async () => err(await login('admin@feirae.com', undefined)));
  add('auth', G4, 'PEC', 'E-mail', 'inválida inexistente', 'fantasma@feirae.com', 'ERRO (404)', async () => { const r = await login('fantasma@feirae.com', 'x'); return err(r, r.status === 404); });
  add('auth', G4, 'PEC', 'E-mail', 'válida caixa alta', 'MARIA@FEIRAE.COM + senha correta', 'OK (200)', async () => ok(await login('MARIA@FEIRAE.COM', 'Senha@123')));
  add('auth', G4, 'PEC', 'Conta sem hash (legado)', 'inválida senha errada', 'semhash@feirae.com + senha "qualquer"', 'ERRO (401)', async () => { const r = await login('semhash@feirae.com', 'qualquer'); return err(r, r.status === 401); });
  add('auth', G4, 'PEC', 'Conta sem hash (legado)', 'válida senha de demonstração', 'semhash@feirae.com + "senha123"', 'OK (200) — resíduo documentado', async () => ok(await login('semhash@feirae.com', 'senha123')));
  add('auth', G4, 'FLUXO', 'Resposta', 'segurança', 'resposta não expõe passwordHash', 'sem passwordHash', async () => {
    const r = await login('maria@feirae.com', 'Senha@123');
    return { obtained: JSON.stringify(r.json).includes('passwordHash') ? 'expõe passwordHash' : 'não expõe', pass: !JSON.stringify(r.json).includes('passwordHash') };
  });
  add('auth', G4, 'FLUXO', 'Cadastro seguido de login', 'integração register + auth', 'cadastra conta nova e entra com a mesma senha', 'OK (200)', async () => {
    freshDb();
    await call(m.register.POST, 'POST', { body: regBody({ email: 'nova@feirae.com', password: 'Novasenha1' }) });
    const good = await call(m.auth.POST, 'POST', { body: { email: 'nova@feirae.com', password: 'Novasenha1' } });
    const bad = await call(m.auth.POST, 'POST', { body: { email: 'nova@feirae.com', password: 'outra' } });
    return { obtained: 'senha certa=' + good.status + ', senha errada=' + bad.status, pass: good.status === 200 && bad.status === 401 };
  });

  // ---------------------------------------------------------------- Pedido
  const G5 = 'Pedido (POST /api/orders)';
  const ordBody = (o: any = {}) => ({
    vendorId: 'v1', clientId: 'u-client', clientName: 'Maria', clientPhone: '(87) 90000-0000', clientEmail: 'maria@feirae.com',
    items: [{ productId: 'p1', quantity: 2 }], paymentMethod: 'RETIRADA', pickupDate: 'Sabado', pickupLocation: 'Praca', ...o,
  });
  const postOrd = async (o: any) => call(m.orders.POST, 'POST', { body: ordBody(o) });
  const qtyCase = (tech: Tech, variable: string, klass: string, label: string, qty: number, valid: boolean, stockAfter?: number) =>
    add('orders', G5, tech, variable, klass, label, valid ? 'OK' : 'ERRO (estoque inalterado)', async () => {
      freshDb();
      const r = await postOrd({ items: [{ productId: 'p1', quantity: qty }] });
      const st = stockOf('p1');
      if (valid) return { obtained: 'OK (' + r.status + '), estoque=' + st, pass: is2xx(r) && st === stockAfter };
      return { obtained: (is4xx(r) ? 'ERRO (' : r.status >= 500 ? 'FALHA (' : 'OK (') + short(r) + '), estoque=' + st + ', pedidos=' + orderCount(), pass: is4xx(r) && st === 5 && orderCount() === 0 };
    });
  qtyCase('PEC', 'Quantidade (Q)', 'válida 0 < Q <= estoque', 'Q = 2 (estoque 5)', 2, true, 3);
  qtyCase('PEC', 'Quantidade (Q)', 'inválida Q < 0', 'Q = -3', -3, false);
  qtyCase('PEC', 'Quantidade (Q)', 'inválida Q > estoque', 'Q = 99 (estoque 5)', 99, false);
  qtyCase('PEC', 'Quantidade (Q)', 'inválida não inteira', 'Q = 1,5', 1.5, false);
  qtyCase('AVL', 'Quantidade (Q)', 'limite inferior', 'Q = -1', -1, false);
  qtyCase('AVL', 'Quantidade (Q)', 'limite inferior', 'Q = 0', 0, false);
  qtyCase('AVL', 'Quantidade (Q)', 'limite inferior', 'Q = 1', 1, true, 4);
  qtyCase('AVL', 'Quantidade (Q)', 'limite superior (= estoque)', 'Q = 5 (estoque 5)', 5, true, 0);
  qtyCase('AVL', 'Quantidade (Q)', 'limite superior (estoque + 1)', 'Q = 6 (estoque 5)', 6, false);

  add('orders', G5, 'PEC', 'Itens', 'inválida lista vazia', 'items = []', 'ERRO (4xx)', async () => { freshDb(); return err(await postOrd({ items: [] })); });
  add('orders', G5, 'PEC', 'Pagamento', 'inválida método desconhecido', 'paymentMethod = "DINHEIRO_VIVO"', 'ERRO (4xx)', async () => { freshDb(); return err(await postOrd({ paymentMethod: 'DINHEIRO_VIVO' })); });
  add('orders', G5, 'PEC', 'Pagamento', 'válida Pix', 'paymentMethod = MERCADO_PAGO_PIX', 'OK; pagamento PENDENTE', async () => {
    freshDb();
    const r = await postOrd({ paymentMethod: 'MERCADO_PAGO_PIX' });
    return { obtained: 'OK (' + r.status + ') paymentStatus=' + r.json?.paymentStatus, pass: is2xx(r) && r.json?.paymentStatus === 'PENDENTE' };
  });
  add('orders', G5, 'PEC', 'Produto', 'inválida produto de outra barraca', 'barraca v1 pedindo o produto p3 (da v2)', 'ERRO (4xx)', async () => { freshDb(); return err(await postOrd({ items: [{ productId: 'p3', quantity: 1 }] })); });
  add('orders', G5, 'PEC', 'Barraca', 'inválida barraca pausada', 'pedido em barraca inativa (v5)', 'ERRO (4xx)', async () => {
    freshDb();
    db.seed('product', [{ id: 'e1', vendorId: 'v5', name: 'e', description: 'd', category: 'c', price: 10, stock: 5 }]);
    return err(await postOrd({ vendorId: 'v5', items: [{ productId: 'e1', quantity: 1 }] }));
  });

  const cpOrd = (klass: string, label: string, code: string, qty: number, expected: string, check: (r: Res) => boolean, tech: Tech = 'PEC', vendorId = 'v1', productId = 'p1') =>
    add('orders', G5 + ' — cupom', tech, 'Cupom aplicado', klass, label, expected, async () => {
      freshDb();
      const r = await postOrd({ vendorId, couponCode: code, items: [{ productId, quantity: qty }] });
      const passed = check(r);
      return { obtained: short(r) + (is2xx(r) ? ' total=' + r.json?.totalAmount : ''), pass: passed };
    });
  cpOrd('válido (percentual)', 'PROMO10, 2 x R$ 10 = R$ 20', 'PROMO10', 2, 'OK; total R$ 18,00', r => is2xx(r) && r.json?.totalAmount === 18);
  cpOrd('inválido inexistente', 'NAOEXISTE', 'NAOEXISTE', 2, 'ERRO (4xx); estoque inalterado', r => is4xx(r) && stockOf('p1') === 5);
  cpOrd('inválido expirado', 'EXPIRADO', 'EXPIRADO', 2, 'ERRO (4xx); estoque inalterado', r => is4xx(r) && stockOf('p1') === 5);
  cpOrd('inválido esgotado', 'ESGOTADO (1 de 1 usos)', 'ESGOTADO', 2, 'ERRO (4xx); estoque inalterado', r => is4xx(r) && stockOf('p1') === 5);
  cpOrd('inválido de outra barraca', 'SOV2 usado na barraca v1', 'SOV2', 2, 'ERRO (4xx); estoque inalterado', r => is4xx(r) && stockOf('p1') === 5);
  cpOrd('limite: total = pedido mínimo', 'FIXO5 (mín. R$ 20), total R$ 20', 'FIXO5', 2, 'OK; total R$ 15,00', r => is2xx(r) && r.json?.totalAmount === 15, 'AVL');
  cpOrd('limite: total abaixo do mínimo', 'FIXO5 (mín. R$ 20), total R$ 10', 'FIXO5', 1, 'ERRO (4xx); estoque inalterado', r => is4xx(r) && stockOf('p1') === 5, 'AVL');
  cpOrd('válido (plataforma)', 'PLATAFORMA (global, 15%)', 'PLATAFORMA', 2, 'OK; total R$ 17,00', r => is2xx(r) && r.json?.totalAmount === 17);

  add('orders', G5 + ' — integridade', 'FLUXO', 'Atomicidade', 'segundo item sem estoque', 'itens [p1 x2, p2 x99]', 'ERRO; estoque de p1 volta a 5', async () => {
    freshDb();
    const r = await postOrd({ items: [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 99 }] });
    return { obtained: short(r) + ', estoque p1=' + stockOf('p1'), pass: is4xx(r) && stockOf('p1') === 5 };
  });
  add('orders', G5 + ' — integridade', 'FLUXO', 'Atomicidade', 'cupom inválido após baixar estoque', 'item p1 x2 + cupom inexistente', 'ERRO; estoque de p1 = 5', async () => {
    freshDb();
    const r = await postOrd({ couponCode: 'NAOEXISTE' });
    return { obtained: short(r) + ', estoque p1=' + stockOf('p1'), pass: is4xx(r) && stockOf('p1') === 5 };
  });
  add('orders', G5 + ' — integridade', 'FLUXO', 'Atomicidade', 'cupom consumido sem pedido', 'cupom válido + segundo item sem estoque', 'ERRO; usedCount do cupom continua 0', async () => {
    freshDb();
    const r = await postOrd({ couponCode: 'PROMO10', items: [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 99 }] });
    const used = db.tables.coupon.find(c => c.code === 'PROMO10')?.usedCount;
    return { obtained: short(r) + ', usedCount=' + used, pass: is4xx(r) && used === 0 };
  });
  add('orders', G5 + ' — integridade', 'FLUXO', 'Concorrência', 'dois pedidos simultâneos', '2 pedidos de 3 un. sobre estoque 5', 'só 1 é aceito; estoque = 2', async () => {
    freshDb();
    const [a, b] = await Promise.all([postOrd({ items: [{ productId: 'p1', quantity: 3 }] }), postOrd({ items: [{ productId: 'p1', quantity: 3 }] })]);
    const accepted = [a, b].filter(is2xx).length;
    return { obtained: accepted + ' aceito(s); estoque=' + stockOf('p1'), pass: accepted === 1 && stockOf('p1') === 2 };
  });
  add('orders', G5 + ' — integridade', 'FLUXO', 'Cliente do pedido', 'cliente desconhecido', 'clientId/e-mail inexistentes', 'pedido vinculado a um cliente NOVO, não a outro', async () => {
    freshDb();
    const r = await postOrd({ clientId: 'zzz', clientEmail: 'desconhecido@feirae.com', clientName: 'Fulano' });
    const linked = db.tables.user.find(u => u.id === db.tables.order[0]?.clientId);
    return { obtained: short(r) + ' cliente=' + linked?.email, pass: is2xx(r) && linked?.email === 'desconhecido@feirae.com' };
  });
  add('orders', G5 + ' — integridade', 'FLUXO', 'Vazamento de pedidos', 'GET por cliente', 'GET /api/orders?clientId=user-client-1 com pedidos de 2 clientes', 'só os pedidos do próprio id', async () => {
    freshDb();
    db.seed('user', [{ id: 'user-client-1', name: 'Demo', email: 'demo@x.com', role: 'CLIENT' }]);
    seedOrder('o-a', 'NOVO');
    seedOrder('o-b', 'NOVO', { clientId: 'user-client-1', clientEmail: 'demo@x.com' });
    const r = await call(m.orders.GET, 'GET', { url: 'http://localhost/api/orders?clientId=user-client-1' });
    const count = Array.isArray(r.json) ? r.json.length : -1;
    return { obtained: r.status + ', ' + count + ' pedido(s) retornado(s)', pass: is2xx(r) && count === 1 };
  });

  // ---------------------------------------------------------------- Status do pedido
  const G6 = 'Status do pedido (PATCH /api/orders/[id])';
  const patchOrd = async (from: string, body: any) => { freshDb(); seedOrder('o1', from); return call(m.ordersId.PATCH, 'PATCH', { body, params: { id: 'o1' } }); };
  const stCase = (tech: Tech, klass: string, from: string, to: string, valid: boolean, extra?: () => boolean) =>
    add('ordersId', G6, tech, 'Transição de status', klass, from + ' → ' + to, valid ? 'OK' : 'ERRO (4xx)', async () => {
      const r = await patchOrd(from, { status: to });
      const state = db.tables.order[0]?.status;
      return valid
        ? { obtained: 'OK (' + r.status + ') status=' + state, pass: is2xx(r) && state === to && (extra ? extra() : true) }
        : { obtained: (is4xx(r) ? 'ERRO (' : r.status >= 500 ? 'FALHA (' : 'OK (') + short(r) + ') status=' + state, pass: is4xx(r) && state === from };
    });
  stCase('PEC', 'válida', 'NOVO', 'EM_PREPARO', true);
  stCase('PEC', 'válida', 'EM_PREPARO', 'PRONTO', true);
  stCase('PEC', 'válida', 'PRONTO', 'RETIRADO', true);
  stCase('PEC', 'válida (cancelar devolve estoque)', 'NOVO', 'CANCELADO', true, () => stockOf('p1') === 7);
  stCase('PEC', 'inválida (pula etapa)', 'NOVO', 'RETIRADO', false);
  stCase('PEC', 'inválida (volta de estado final)', 'RETIRADO', 'NOVO', false);
  stCase('PEC', 'inválida (reabre cancelado)', 'CANCELADO', 'EM_PREPARO', false);
  stCase('PEC', 'inválida (status inexistente)', 'NOVO', 'FOO', false);
  add('ordersId', G6, 'AVL', 'Transição de status', 'mesmo status (idempotente)', 'NOVO → NOVO', 'sem nova notificação', async () => {
    const r = await patchOrd('NOVO', { status: 'NOVO' });
    return { obtained: short(r) + ', notificações=' + db.tables.notification.length, pass: is2xx(r) && db.tables.notification.length === 0 };
  });
  const wCase = (tech: Tech, klass: string, w: number, valid: boolean) =>
    add('ordersId', G6, tech, 'Peso medido (W)', klass, 'W = ' + w + ' kg', valid ? 'OK' : 'ERRO (4xx)', async () => {
      const r = await patchOrd('NOVO', { itemId: 'it-o1', measuredWeight: w });
      return valid ? ok(r) : err(r);
    });
  wCase('PEC', 'válida W >= 0', 1.5, true);
  wCase('PEC', 'inválida W < 0', -2, false);
  wCase('AVL', 'limite inferior', -0.1, false);
  wCase('AVL', 'limite inferior', 0, true);

  // ---------------------------------------------------------------- Extrato financeiro
  const G7 = 'Extrato do vendedor (GET /api/vendors/finance/stats)';
  const fairsCase = (label: string, total: number, expected: string[]) =>
    add('finance', G7, 'FLUXO', 'Feiras exibidas no gráfico', label, label, 'datas ' + expected.join(', ') + ' (cronológico)', async () => {
      freshDb();
      for (let i = 1; i <= total; i++) seedOrder('f' + i, 'RETIRADO', { pickupDate: 'D' + i, createdAt: new Date(2026, 0, i) });
      const r = await call(m.finance.GET, 'GET', { url: 'http://localhost/api/vendors/finance/stats?vendorId=v1' });
      const dates = (r.json?.recentFairs || []).map((f: any) => f.date);
      return { obtained: dates.join(', ') || short(r), pass: JSON.stringify(dates) === JSON.stringify(expected) };
    });
  fairsCase('6 feiras concluídas: mostra as 4 mais recentes', 6, ['D3', 'D4', 'D5', 'D6']);
  fairsCase('2 feiras concluídas: ordem cronológica', 2, ['D1', 'D2']);
  fairsCase('4 feiras concluídas (limite): todas', 4, ['D1', 'D2', 'D3', 'D4']);

  // ---------------------------------------------------------------- Painel admin
  const G8 = 'Painel do administrador (GET /api/admin/stats)';
  const stats = async (qs: string, seed?: () => void) => { freshDb(); seed?.(); return call(m.adminStats.GET, 'GET', { url: 'http://localhost/api/admin/stats?' + qs }); };
  add('adminStats', G8, 'PEC', 'Data inicial (custom)', 'inválida formato', 'startDate = "abc"', 'ERRO (4xx)', async () => err(await stats('period=custom&startDate=abc&endDate=2026-09-19')));
  add('adminStats', G8, 'PEC', 'Intervalo (custom)', 'inválida início > fim', 'startDate 2026-09-20, endDate 2026-09-19', 'ERRO (4xx)', async () => err(await stats('period=custom&startDate=2026-09-20&endDate=2026-09-19')));
  add('adminStats', G8, 'PEC', 'Intervalo (custom)', 'válida', 'startDate 2026-09-01, endDate 2026-09-19', 'OK (200)', async () => ok(await stats('period=custom&startDate=2026-09-01&endDate=2026-09-19')));
  add('adminStats', G8, 'AVL', 'Fuso horário do limite final', 'pedido às 23h (Brasília) do último dia', 'pedido 2026-09-19 23:00 (UTC-3) com filtro até 2026-09-19', 'pedido incluído (totalOrders = 1)', async () => {
    const r = await stats('period=custom&startDate=2026-09-19&endDate=2026-09-19', () => seedOrder('tz', 'RETIRADO', { createdAt: new Date('2026-09-19T23:00:00-03:00') }));
    return { obtained: short(r) + ' totalOrders=' + r.json?.totalOrders, pass: is2xx(r) && r.json?.totalOrders === 1 };
  });
  add('adminStats', G8, 'FLUXO', 'Comissão simulada', 'pedido não concluído', 'pedido NOVO de R$ 100 (plano grátis, 5%)', 'comissão R$ 0,00 (só pedidos RETIRADO)', async () => {
    const r = await stats('period=all', () => { seedOrder('n1', 'NOVO'); seedOrder('r1', 'RETIRADO'); });
    const list = r.json?.recentOrders || [];
    const nov = list.find((o: any) => o.id === 'n1')?.commissionAmount;
    const ret = list.find((o: any) => o.id === 'r1')?.commissionAmount;
    return { obtained: 'NOVO=' + nov + ', RETIRADO=' + ret, pass: nov === 0 && ret === 5 };
  });
  add('adminStats', G8, 'FLUXO', 'Tamanho da resposta', '250 pedidos no período', 'lista de pedidos recentes', 'no máximo 200 itens', async () => {
    const r = await stats('period=all', () => { for (let i = 0; i < 250; i++) seedOrder('m' + i, 'NOVO'); });
    const len = r.json?.recentOrders?.length;
    return { obtained: short(r) + ' recentOrders=' + len, pass: is2xx(r) && len <= 200 };
  });

  // ---------------------------------------------------------------- Cupons (alteração)
  const G9 = 'Alteração de cupons (PATCH/DELETE /api/coupons/[id])';
  const patchCp = async (id: string, body: any) => { freshDb(); db.seed('coupon', [{ id: 'c-used', code: 'USADO3', discountValue: 10, usedCount: 3, maxUses: 10 }]); return call(m.couponsId.PATCH, 'PATCH', { body, params: { id } }); };
  const delCp = async (id: string, vendorId?: string) => { freshDb(); return call(m.couponsId.DELETE, 'DELETE', { url: 'http://localhost/api/coupons/' + id + (vendorId ? '?vendorId=' + vendorId : ''), params: { id } }); };
  add('couponsId', G9, 'PEC', 'Autor da alteração', 'válida dono do cupom', 'v1 pausa o próprio cupom FIXO5', 'OK (200)', async () => ok(await patchCp('c-fixo', { active: false, vendorId: 'v1' })));
  add('couponsId', G9, 'PEC', 'Autor da alteração', 'inválida cupom global', 'v1 tenta pausar o cupom da plataforma PROMO10', 'ERRO (403)', async () => { const r = await patchCp('c-promo', { active: false, vendorId: 'v1' }); return err(r, r.status === 403); });
  add('couponsId', G9, 'PEC', 'Autor da alteração', 'inválida cupom de outra barraca', 'v2 tenta pausar o cupom FIXO5 da v1', 'ERRO (403)', async () => { const r = await patchCp('c-fixo', { active: false, vendorId: 'v2' }); return err(r, r.status === 403); });
  add('couponsId', G9, 'PEC', 'Autor da alteração', 'válida administração', 'admin (sem vendorId) pausa PROMO10', 'OK (200)', async () => ok(await patchCp('c-promo', { active: false })));
  add('couponsId', G9, 'PEC', 'Exclusão', 'inválida cupom de outra barraca', 'v2 tenta excluir o cupom FIXO5 da v1', 'ERRO (403); cupom permanece', async () => {
    const r = await delCp('c-fixo', 'v2');
    return { obtained: short(r) + ', cupom existe=' + db.tables.coupon.some(c => c.id === 'c-fixo'), pass: is4xx(r) && db.tables.coupon.some(c => c.id === 'c-fixo') };
  });
  add('couponsId', G9, 'PEC', 'Exclusão', 'válida dono do cupom', 'v1 exclui o próprio cupom FIXO5', 'OK (200); cupom removido', async () => {
    const r = await delCp('c-fixo', 'v1');
    return { obtained: short(r) + ', cupom existe=' + db.tables.coupon.some(c => c.id === 'c-fixo'), pass: is2xx(r) && !db.tables.coupon.some(c => c.id === 'c-fixo') };
  });
  add('couponsId', G9, 'PEC', 'Limite de usos (U)', 'inválida U = 0', 'maxUses = 0', 'ERRO (4xx); não vira ilimitado', async () => {
    const r = await patchCp('c-promo', { maxUses: 0 });
    const mu = db.tables.coupon.find(c => c.id === 'c-promo')?.maxUses;
    return { obtained: short(r) + ', maxUses=' + mu, pass: is4xx(r) && mu === null };
  });
  add('couponsId', G9, 'AVL', 'Limite de usos (U)', 'inválida U < usos já feitos', 'maxUses = 2 com 3 usos realizados', 'ERRO (4xx)', async () => err(await patchCp('c-used', { maxUses: 2 })));
  add('couponsId', G9, 'AVL', 'Limite de usos (U)', 'limite: U = usos já feitos', 'maxUses = 3 com 3 usos realizados', 'OK (200)', async () => ok(await patchCp('c-used', { maxUses: 3 })));
  add('couponsId', G9, 'PEC', 'Pedido mínimo (M)', 'inválida M < 0', 'minOrderValue = -5', 'ERRO (4xx)', async () => err(await patchCp('c-promo', { minOrderValue: -5 })));
  add('couponsId', G9, 'PEC', 'Validade (V)', 'inválida formato', 'expiresAt = "abc"', 'ERRO (4xx) — sem erro 500', async () => err(await patchCp('c-promo', { expiresAt: 'abc' })));

  // ---------------------------------------------------------------- verifyPassword (unidade + caminhos)
  const GU = 'Função verifyPassword (src/lib/auth.ts)';
  const vp = (fn: () => boolean): Outcome & { raw: boolean } => ({ obtained: '', pass: false, raw: fn() });
  const unit = (tech: Tech, variable: string, klass: string, input: string, expected: boolean, fn: () => boolean) =>
    add('authlib', GU, tech, variable, klass, input, String(expected), async () => {
      let got: boolean | string;
      try { got = fn(); } catch (e: any) { got = 'exceção: ' + e.message; }
      return { obtained: String(got), pass: got === expected };
    });
  const V = (pw: any, stored: any) => () => m.authLib.verifyPassword(pw, stored);
  const legacy = legacyHash('segredo');
  const modern = modernHash('segredo');
  unit('PEC', 'Senha informada', 'válida (hash atual)', 'senha correta + hash pbkdf2$120000', true, V('segredo', modern));
  unit('PEC', 'Senha informada', 'inválida (hash atual)', 'senha errada + hash pbkdf2$120000', false, V('errada', modern));
  unit('PEC', 'Formato do hash', 'válida (hash legado salt:hash)', 'senha correta + hash legado', true, V('segredo', legacy));
  unit('PEC', 'Formato do hash', 'inválida (hash legado)', 'senha errada + hash legado', false, V('errada', legacy));
  unit('PEC', 'Conta sem hash', 'válida demo', '"senha123" + hash nulo', true, V('senha123', null));
  unit('PEC', 'Conta sem hash', 'inválida', '"outra" + hash nulo', false, V('outra', null));
  unit('PEC', 'Senha informada', 'inválida vazia', '"" + hash atual', false, V('', modern));
  unit('PATH', 'Caminho P1', 'senha vazia', '"" (nó 1 → saída)', false, V('', modern));
  unit('PATH', 'Caminho P2', 'sem hash', 'senha123 + null (1→3→4)', true, V('senha123', null));
  unit('PATH', 'Caminho P3', 'hash atual malformado', '"pbkdf2$0$sal$abc" (1→3→5→6→7→8)', false, V('segredo', 'pbkdf2$0$sal$abc'));
  unit('PATH', 'Caminho P4', 'hash atual válido', 'senha correta (1→3→5→6→7→9)', true, V('segredo', modern));
  unit('PATH', 'Caminho P5', 'legado malformado', '"semdoispontos" (1→3→5→10→11→12)', false, V('segredo', 'semdoispontos'));
  unit('PATH', 'Caminho P6', 'legado válido', 'senha correta (1→3→5→10→11→13)', true, V('segredo', legacy));
  unit('AVL', 'Condição do nó 7', 'salt ausente', '"pbkdf2$120000$$abc"', false, V('segredo', 'pbkdf2$120000$$abc'));
  unit('AVL', 'Condição do nó 7', 'hash ausente', '"pbkdf2$120000$sal$"', false, V('segredo', 'pbkdf2$120000$sal$'));
  unit('AVL', 'Condição do nó 7', 'iterações não inteiras', '"pbkdf2$abc$sal$abc"', false, V('segredo', 'pbkdf2$abc$sal$abc'));
  unit('AVL', 'Condição do nó 7', 'iterações = 0 (limite)', '"pbkdf2$0$sal$abc"', false, V('segredo', 'pbkdf2$0$sal$abc'));
  unit('AVL', 'Condição do nó 7', 'iterações = 1 (limite)', 'hash com 1 iteração, senha correta', true, V('segredo', modernHash('segredo', 'cc'.repeat(16), 1)));
  unit('AVL', 'Condição do nó 11', 'salt ausente (legado)', '":abc"', false, V('segredo', ':abc'));
  unit('AVL', 'Condição do nó 11', 'hash ausente (legado)', '"sal:"', false, V('segredo', 'sal:'));
  unit('AVL', 'Comparação do hash', 'hash de tamanho diferente', 'hash truncado', false, V('segredo', modern.slice(0, modern.length - 2)));
  unit('AVL', 'Hash gerado pela própria função', 'roundtrip', 'hashPassword → verifyPassword', true, () => m.authLib.verifyPassword('Roundtrip#1', m.authLib.hashPassword('Roundtrip#1')));
  unit('AVL', 'Hash gerado pela própria função', 'sal aleatório', 'dois hashes da mesma senha diferem', true, () => m.authLib.hashPassword('igual') !== m.authLib.hashPassword('igual'));

  return cases;
}
