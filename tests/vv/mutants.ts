export type Mutant = { id: string; target: string; file: string; desc: string; search: string; replace: string; equivalent?: boolean };

const P = 'src/app/api/products/route.ts';
const C = 'src/app/api/coupons/route.ts';
const A = 'src/lib/auth.ts';

export const MUTANTS: Mutant[] = [
  { id: 'M01', target: 'products', file: P, desc: 'preço: "priceNum <= 0" -> "priceNum < 0"', search: 'priceNum <= 0', replace: 'priceNum < 0' },
  { id: 'M02', target: 'products', file: P, desc: 'preço: "priceNum <= 0" -> "priceNum <= 1"', search: 'priceNum <= 0', replace: 'priceNum <= 1' },
  { id: 'M03', target: 'products', file: P, desc: 'preço: "isNaN(priceNum) ||" -> "isNaN(priceNum) &&"', search: 'isNaN(priceNum) ||', replace: 'isNaN(priceNum) &&' },
  { id: 'M04', target: 'products', file: P, desc: 'estoque: "stockNum < 0" -> "stockNum <= 0"', search: 'stockNum < 0', replace: 'stockNum <= 0' },
  { id: 'M05', target: 'products', file: P, desc: 'estoque: "!Number.isInteger(stockNum)" -> "Number.isInteger(stockNum)"', search: '!Number.isInteger(stockNum)', replace: 'Number.isInteger(stockNum)' },
  { id: 'M06', target: 'products', file: P, desc: 'limite do plano grátis: "activeCount >= maxLimit" -> "activeCount > maxLimit"', search: 'activeCount >= maxLimit', replace: 'activeCount > maxLimit' },
  { id: 'M07', target: 'products', file: P, desc: 'plano: "!isPro && ..." -> "isPro && ..."', search: '!isPro && activeCount', replace: 'isPro && activeCount' },
  { id: 'M08', target: 'coupons', file: C, desc: 'desconto: "discountValue <= 0" -> "discountValue < 0"', search: 'discountValue <= 0', replace: 'discountValue < 0' },
  { id: 'M09', target: 'coupons', file: C, desc: 'teto de 100%: "discountValue > 100" -> "discountValue >= 100"', search: 'discountValue > 100', replace: 'discountValue >= 100' },
  { id: 'M10', target: 'coupons', file: C, desc: 'código: "length < 3" -> "length <= 3"', search: 'formattedCode.length < 3', replace: 'formattedCode.length <= 3' },
  { id: 'M11', target: 'coupons', file: C, desc: 'pedido mínimo: "minOrderValue < 0" -> "minOrderValue <= 0"', search: 'minOrderValue < 0', replace: 'minOrderValue <= 0' },
  { id: 'M12', target: 'coupons', file: C, desc: 'limite de usos: "maxUses <= 0" -> "maxUses < 0"', search: 'maxUses <= 0', replace: 'maxUses < 0' },
  { id: 'M13', target: 'coupons', file: C, desc: 'limite de usos: "!Number.isInteger(maxUses)" -> "Number.isInteger(maxUses)"', search: '!Number.isInteger(maxUses)', replace: 'Number.isInteger(maxUses)' },
  { id: 'M14', target: 'coupons', file: C, desc: 'tolerância de validade: "- 60000" -> "+ 60000"', search: 'Date.now() - 60000', replace: 'Date.now() + 60000' },
  { id: 'M15', target: 'coupons', file: C, desc: 'teto de 100% só para FIXED: "PERCENTAGE" -> "FIXED"', search: "discountType === 'PERCENTAGE' && discountValue > 100", replace: "discountType === 'FIXED' && discountValue > 100" },
  { id: 'M16', target: 'authLib', file: A, desc: 'senha vazia: "if (!password)" -> "if (password)"', search: 'if (!password) return false;', replace: 'if (password) return false;' },
  { id: 'M17', target: 'authLib', file: A, desc: 'conta sem hash: "password === \'senha123\'" -> "!=="', search: "return password === 'senha123';", replace: "return password !== 'senha123';" },
  { id: 'M18', target: 'authLib', file: A, desc: 'formato: "startsWith(\'pbkdf2$\')" -> "startsWith(\'pbkdf2\')"', search: "storedHash.startsWith('pbkdf2$')", replace: "storedHash.startsWith('pbkdf2')", equivalent: true },
  { id: 'M19', target: 'authLib', file: A, desc: 'hash legado: 1000 iterações -> 1001', search: 'crypto.pbkdf2Sync(password, salt, 1000,', replace: 'crypto.pbkdf2Sync(password, salt, 1001,' },
  { id: 'M20', target: 'authLib', file: A, desc: 'iterações: "rounds <= 0" -> "rounds < 0"', search: '!Number.isInteger(rounds) || rounds <= 0', replace: '!Number.isInteger(rounds) || rounds < 0' },
  { id: 'M21', target: 'authLib', file: A, desc: 'comparação: remove "bufA.length > 0 &&"', search: 'bufA.length === bufB.length && bufA.length > 0 &&', replace: 'bufA.length === bufB.length &&', equivalent: true },
  { id: 'M22', target: 'authLib', file: A, desc: 'hash atual sem salt: "!salt ||" removido', search: 'if (!salt || !originalHash || !Number.isInteger(rounds)', replace: 'if (!originalHash || !Number.isInteger(rounds)' },
  { id: 'M23', target: 'authLib', file: A, desc: 'hash legado sem hash: "!originalHash" removido', search: 'if (!salt || !originalHash) return false;\n  const testHash = crypto.pbkdf2Sync(password, salt, 1000', replace: 'if (!salt) return false;\n  const testHash = crypto.pbkdf2Sync(password, salt, 1000' },
];
