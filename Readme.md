# Feiraê - Plataforma Digital para Feiras Livres

Plataforma web full stack para digitalização de feiras livres urbanas e agroecológicas em Petrolina - PE. Conecta feirantes e consumidores locais por meio de pré-encomendas (*Click & Collect*), mapas interativos, pagamentos digitais (Pix/Cartão) e painéis de gestão.

---

## 1. Nome do Projeto
**Feiraê** — Sistema web de intermediação comercial e gestão para feiras livres e produtores locais.

---

## 2. Objetivo
- **Problema:** Filas extensas, falta de informação prévia sobre produtos frescos, ausência de canais digitais de pagamento e dificuldade de gestão de pedidos e estoque para os feirantes.
- **Público-alvo:** Consumidores locais em busca de produtos frescos/orgânicos, pequenos feirantes/produtores familiares e administradores de feiras.
- **Solução:** Permitir que clientes reservem itens e retirem com agilidade via QR Code (*Passe de Retirada*), enquanto feirantes operam pedidos via Kanban, ajustam produtos pesáveis na balança e fecham caixa.

---

## 3. Funcionalidades Principais

- **Para Clientes:**
  - Vitrine com catálogo de produtos, filtros por categoria e busca em tempo real.
  - Filtro exclusivo de **Produtores Orgânicos Certificados**.
  - **Mapa Interativo** com a localização física das barracas por setor/alameda.
  - Carrinho com suporte a unidades e itens pesáveis (kg/g) com cálculo estimado.
  - Escolha de **Janela de Retirada** (dia e horário).
  - Checkout via **Mercado Pago (Pix / Cartão)** ou Pagamento na Retirada.
  - Aplicação de **Cupons de Desconto**.
  - **Passe de Retirada Digital** com QR Code para conferência na barraca.
  - Histórico de pedidos, notificações de status e avaliações com nota/comentário.
  - Contato direto com o feirante via WhatsApp.

- **Para Feirantes (Painel do Vendedor):**
  - **Quadro Kanban** de pedidos (*Novo*, *Em Preparo*, *Pronto*, *Retirado*, *Cancelado*).
  - **Ajuste de Balança**: Recálculo automático do subtotal com base no peso real aferido.
  - Gestão de produtos, fotos, preços e estoque.
  - Gestão de janelas de retirada e vinculação a múltiplas feiras da cidade.
  - Fechamento de caixa e extrato financeiro (vendas brutas, comissão e repasse líquido).
  - Upload de comprovantes para obtenção do **Selo Orgânico**.
  - Resposta às avaliações dos clientes e Destaque Patrocinado da barraca.

- **Para Administradores:**
  - Métricas gerais de faturamento (GMV), pedidos e feirantes ativos.
  - **Dashboard AARRR** (Métricas de produto e funil de conversão).
  - **Simulador de Monetização** (projeção de receitas por comissão e planos PRO).
  - Moderação de certificados e aprovação de selos orgânicos.
  - Exportação de dados de pedidos e comissões em **CSV**.

---

## 4. Tecnologias Utilizadas

| Tecnologia | Finalidade |
|---|---|
| **Next.js 14 (App Router)** | Framework Full Stack (SSR, CSR e API Routes) |
| **React 18 & TypeScript 5** | Interface de usuário componentizada e tipada |
| **Tailwind CSS & Lucide React** | Estilização responsiva e biblioteca de ícones |
| **Prisma ORM 5** | Mapeamento objeto-relacional e migrações |
| **PostgreSQL (Neon / Local)** | Banco de dados relacional |
| **Mercado Pago SDK** | Processamento de pagamentos (Pix e Cartão) |
| **Zod** | Validação de esquemas e dados |

---

## 5. Pré-requisitos

- **Node.js**: Versão `18.18+` ou `20+` (LTS recomendada).
- **NPM**: Versão `9+` ou `10+`.
- **PostgreSQL**: Instância ativa via Docker, PostgreSQL local ou conexão com o Neon.
- **Arquivo `.env`**: **Já está presente na raiz do projeto**, configurado por padrão para banco local.

---

## 6. Banco de Dados

O arquivo `.env` já existe na raiz. Escolha qual apontamento utilizar:

### Configuração no `.env`
- **Para Banco Local (Padrão já configurado):**
  ```env
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/feirae?schema=public"
  DIRECT_URL="postgresql://postgres:postgres@localhost:5432/feirae?schema=public"
