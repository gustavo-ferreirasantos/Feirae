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
  ```
- **Para Banco Neon (Nuvem):**
  ```env
  DATABASE_URL="postgresql://usuario:senha@seu-host.neon.tech/feirae?sslmode=require"
  DIRECT_URL="postgresql://usuario:senha@seu-host.neon.tech/feirae?sslmode=require"
  ```

### Criação do Banco Local (se for usar local)
```bash
# Via Docker (recomendado):
docker run --name feirae-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=feirae -p 5432:5432 -d postgres:16-alpine

# Ou via psql:
# CREATE DATABASE feirae;
```

### Sincronização e Carga Inicial (Seed)
```bash
npm run prisma:generate   # Gera os tipos do Prisma Client
npm run prisma:push       # Cria/sincroniza as tabelas no banco
npm run prisma:seed       # Popula o banco com feiras, feirantes, produtos e pedidos
```

---

## 7. Como Executar

### Opção 1: Executar com Banco na Nuvem (Neon)
```bash
# 1. Instalar dependências
npm install

# 2. Configure a URL do Neon no arquivo .env (já existente)

# 3. Sincronizar o banco e carregar dados
npm run prisma:generate
npm run prisma:push
npm run prisma:seed

# 4. Iniciar a aplicação
npm run dev
```

### Opção 2: Executar com Banco Local (Docker)
```bash
# 1. Instalar dependências
npm install

# 2. Subir o contêiner do PostgreSQL (porta 5432)
docker run --name feirae-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=feirae -p 5432:5432 -d postgres:16-alpine

# 3. Sincronizar o banco e carregar dados (.env já vem configurado para o Docker)
npm run prisma:generate
npm run prisma:push
npm run prisma:seed

# 4. Iniciar a aplicação
npm run dev
```

Acesse no navegador: **`http://localhost:3000`**

- **Cliente teste:** `maria.oliveira@email.com`
- **Feirante teste:** `ze.organicos@feirae.com`
- **Admin:** Rota `/admin` ou via seletor rápido no modal de login.

---

## 8. Estrutura do Projeto

```text
Feirae/
├── prisma/
│   ├── schema.prisma          # Esquema relacional das entidades
│   └── seed.ts                # Dados iniciais para demonstração
├── src/
│   ├── app/                   # Páginas e rotas da aplicação
│   │   ├── admin/             # Painel administrativo e funil AARRR
│   │   ├── api/               # Endpoints REST (pedidos, produtos, etc.)
│   │   ├── carrinho/          # Checkout e janelas de retirada
│   │   ├── feirantes/         # Catálogo e perfil público da barraca
│   │   ├── mapa/              # Mapa vetorial da feira livre
│   │   ├── pedidos/           # Meus pedidos e Passe de Retirada
│   │   └── vendedor/          # Painel do feirante (Kanban, Caixa, Balança)
│   ├── components/            # Componentes reutilizáveis de interface
│   ├── lib/                   # Utilitários, contextos (Carrinho, Usuário) e Prisma
│   └── types/                 # Definições de tipos TypeScript
├── .env                       # Variáveis de ambiente (já existente)
└── package.json               # Dependências e scripts
```

---

## 9. Imagens do Sistema

| Interface | Descrição |
|---|---|
| ![Vitrine](https://raw.githubusercontent.com/gustavo-ferreirasantos/Feirae/main/docs/screenshots/home-vitrine.png) | **Vitrine Principal**: Produtos frescos com filtros e busca rápida. |
| ![Mapa](https://raw.githubusercontent.com/gustavo-ferreirasantos/Feirae/main/docs/screenshots/mapa-feira.png) | **Mapa Interativo**: Localização física das bancas na praça. |
| ![Carrinho](https://raw.githubusercontent.com/gustavo-ferreirasantos/Feirae/main/docs/screenshots/carrinho-checkout.png) | **Checkout**: Itens fracionados, cupons e Pix Mercado Pago. |
| ![Kanban](https://raw.githubusercontent.com/gustavo-ferreirasantos/Feirae/main/docs/screenshots/kanban-feirante.png) | **Kanban do Feirante**: Esteira de preparo e ajuste de balança. |
| ![Passe](https://raw.githubusercontent.com/gustavo-ferreirasantos/Feirae/main/docs/screenshots/pickup-pass.png) | **Passe de Retirada**: QR Code para coleta ágil na banca. |
| ![Admin](https://raw.githubusercontent.com/gustavo-ferreirasantos/Feirae/main/docs/screenshots/admin-dashboard.png) | **Admin**: Funil AARRR, comissões e exportação em CSV. |

---

## 10. Modelagem e Documentação

O esquema completo do banco de dados encontra-se em [`prisma/schema.prisma`](./prisma/schema.prisma).

```mermaid
erDiagram
    User ||--o| Vendor : "gerencia"
    User ||--o{ Order : "realiza"
    Vendor ||--o{ Product : "comercializa"
    Vendor ||--o{ PickupWindow : "disponibiliza"
    Vendor ||--o{ Order : "recebe"
    Order ||--|{ OrderItem : "contém"
    Product ||--o{ OrderItem : "referencia"
    PickupWindow ||--o{ Order : "agenda"
    Order ||--o| Review : "possui"
```

A documentação detalhada das User Stories (US01 a US27) e requisitos pode ser consultada na pasta [`/docs`](./docs).

---

## 11. Equipe

| Integrante | GitHub |
|---|---|
| **Gustavo Ferreira Santos** | [@gustavo-ferreirasantos](https://github.com/gustavo-ferreirasantos) |
| **Daniel Paiva** | [@paivadaniel246](https://github.com/paivadaniel246) |
| **Henrique Rodrigues** | [@henrique0rodrigues](https://github.com/henrique0rodrigues) |
| **Vítor R. Machado** | [@VitorRMachado](https://github.com/VitorRMachado) |
| **Heitor F. W.** | [@Heitorfa](https://github.com/Heitorfa) / [@HeitorHFW](https://github.com/HeitorHFW) |

---

## 12. Contribuições

- **Gustavo Ferreira Santos:** Arquitetura do projeto, integração Prisma/PostgreSQL, autenticação, catálogo de produtos, vitrine, carrinho, checkout Mercado Pago, Kanban do feirante e Passe de Retirada.
- **Daniel Paiva:** Cupons de desconto, integração direta de WhatsApp, regras de planos (Free/PRO), respostas às avaliações, exportação de relatórios em CSV e correções de estoque.
- **Henrique Rodrigues:** Fechamento de caixa e extrato financeiro do vendedor, suporte a produtos por peso variável (ajuste na balança), gestão de múltiplas feiras e destaque patrocinado.
- **Vítor R. Machado:** Mapa interativo da feira livre, dashboard de métricas de produto (Funil AARRR), simulador de monetização/GMV e moderação do Selo Orgânico.
- **Heitor F. W.:** Revisão de código (Code Reviews), testes de integração das rotas de API, validação dos fluxos de checkout e homologação do seed.

---

## 13. Limitações e Melhorias Futuras

1. **PWA / App Mobile Offline:** Permitir que feirantes operem e leiam QR Codes sem conexão estável na feira.
2. **Integração com Balanças Bluetooth:** Captura automática do peso no sistema sem necessidade de digitação manual.
3. **Split Automático de Pagamentos:** Divisão instantânea de recebíveis entre feirante e taxa da plataforma via Mercado Pago Marketplace.
4. **GPS na Feira:** Traçado de rotas em tempo real do cliente até a barraca selecionada.
5. **Notificações via WhatsApp:** Envio automatizado de mensagem avisando quando o pedido estiver pronto para retirada.
