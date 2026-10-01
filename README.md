# HortiCurti

Sistema de gestão de pedidos para hortifrúti que recebe pedidos via WhatsApp, processa com IA e oferece dashboard, precificação e controle de entregas em aplicativo mobile.

## Visão Geral

O HortiCurti é uma solução completa para distribuidores de hortifrúti que permite:

- **Recebimento de pedidos via WhatsApp** — bot inteligente que interpreta mensagens de clientes e extrai produtos, quantidades e unidades
- **Dashboard de vendas** — resumo de receita, lucro, ticket médio e produtos mais vendidos
- **Gestão de pedidos** — visualização, edição, cancelamento e conferência de entrega
- **Precificação por pedido** — cálculo de preço de venda com margem sobre custo
- **Lista do dia** — consolidação de todos os pedidos para um dia de compra específico
- **Controle de clientes** — cadastro com WhatsApp e margem padrão individual
- **Backorders** — transferência automática de faltas para o próximo pedido do cliente

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      HortiCurti                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   WhatsApp   │    │   Backend    │    │   Mobile     │  │
│  │   (Bot)      │◄──►│   (API)      │◄──►│   (App)      │  │
│  │              │    │              │    │              │  │
│  │ whatsapp-web │    │   Express    │    │    Expo      │  │
│  │     .js      │    │   + Prisma  │    │  React Native│  │
│  └──────────────┘    └──────┬───────┘    └──────────────┘  │
│                             │                                │
│                      ┌──────▼───────┐                        │
│                      │  PostgreSQL  │                        │
│                      │   (Prisma)   │                        │
│                      └──────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Tecnologias

### Backend
- **Node.js** + **TypeScript** — runtime e tipagem
- **Express** — framework HTTP
- **Prisma** — ORM e migrações
- **PostgreSQL** — banco de dados relacional
- **whatsapp-web.js** — integração com WhatsApp Web
- **Groq AI** — processamento de linguagem natural para extração de pedidos
- **Puppeteer** — automação do Chrome para WhatsApp Web

### Mobile
- **Expo** — framework de desenvolvimento mobile
- **React Native** — UI nativa
- **React Navigation** — navegação por abas e stack
- **react-native-gifted-charts** — gráficos do dashboard
- **AsyncStorage** — armazenamento local

## Estrutura do Projeto

```
HortCurti/
├── backend/                    # API e bot do WhatsApp
│   ├── src/
│   │   ├── controllers/        # Controladores das rotas
│   │   ├── services/           # Lógica de negócio
│   │   ├── routes/             # Definição de rotas
│   │   ├── lib/                # Utilitários (Prisma, datas, sessão)
│   │   ├── data/               # Catálogo de produtos
│   │   ├── app.ts              # Configuração do Express
│   │   └── server.ts           # Entry point
│   ├── prisma/
│   │   ├── schema.prisma       # Modelagem do banco
│   │   └── migrations/         # Migrações do banco
│   ├── docker-compose.yml      # PostgreSQL local
│   └── tsconfig.json
├── mobile/                     # Aplicativo React Native
│   ├── src/
│   │   ├── screens/            # Telas do app
│   │   ├── components/         # Componentes reutilizáveis
│   │   ├── services/           # Comunicação com API
│   │   ├── hooks/              # Hooks customizados
│   │   ├── utils/              # Funções utilitárias
│   │   └── theme.ts            # Tema do app
│   ├── App.tsx                 # Componente raiz
│   ├── app.json                # Configuração Expo
│   └── eas.json                # Build EAS
├── docs/                       # Documentação técnica
├── output/                     # APKs e PDFs gerados
└── prisma/                     # Schema legado (raiz)
```

## Configuração

### Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- Google Chrome instalado (para WhatsApp Web)
- Conta Groq AI (para API de IA)

### Backend

1. **Instale as dependências:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   
   Crie o arquivo `.env` no diretório `backend/`:
   ```env
   DATABASE_URL="postgresql://horticurti:horticurti123@localhost:5432/horticurti"
   GROQ_API_KEY="sua_chave_aqui"
   PORT=3000
   HOST=0.0.0.0
   ```

3. **Suba o banco de dados:**
   ```bash
   docker compose up -d
   ```

4. **Execute as migrações:**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

5. **Inicie o servidor:**
   ```bash
   npm run dev
   ```

6. **Conecte o WhatsApp:**
   - Um QR Code será exibido no terminal
   - Escaneie com o WhatsApp do distribuidor
   - A sessão será salva localmente (LocalAuth)

### Mobile

1. **Instale as dependências:**
   ```bash
   cd mobile
   npm install
   ```

2. **Configure a URL da API:**
   
   Edite `mobile/app.json` e ajuste `expo.extra.apiUrl`:
   ```json
   {
     "expo": {
       "extra": {
         "apiUrl": "http://SEU_IP:3000"
       }
     }
   }
   ```

3. **Inicie o app:**
   ```bash
   npm start
   ```

4. **Build do APK (Android):**
   ```bash
   npx eas-cli build --platform android --profile preview
   ```

## API Endpoints

### Clientes
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/clients` | Lista todos os clientes |
| GET | `/clients/:id` | Busca cliente por ID |
| POST | `/clients` | Cria novo cliente |
| PATCH | `/clients/:id` | Atualiza cliente |
| DELETE | `/clients/:id` | Remove cliente |

### Pedidos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/order` | Lista todos os pedidos |
| GET | `/order/:id` | Busca pedido por ID |
| POST | `/order` | Cria novo pedido |
| PATCH | `/order/:id` | Edita pedido |
| PATCH | `/order/:id/status` | Altera status (cancelar) |
| PATCH | `/order/:id/deliver` | Confirma entrega |
| PATCH | `/order/:id/pricing` | Aplica precificação |

### Dias de Compra
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/shopDay` | Lista dias de compra |
| GET | `/shopDay/:id` | Busca dia por ID |
| POST | `/shopDay` | Cria novo dia |

### Dashboard
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/dashboard/sales?days=30` | Resumo de vendas |

### Saúde
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status da API |

## Fluxo de Pedido

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐
│ Cliente │────►│  WhatsApp   │────►│     IA      │────►│ Pedido  │
│         │     │    Bot      │     │  (Groq)     │     │ Pendente│
└─────────┘     └─────────────┘     └─────────────┘     └────┬────┘
                                                              │
                                                              ▼
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐
│ Entrega │◄────│  Distribuidor│◄────│ Precificação │◄────│  Lista  │
│         │     │  (App)       │     │             │     │  do Dia │
└─────────┘     └─────────────┘     └─────────────┘     └─────────┘
```

1. **Cliente** envia pedido via WhatsApp
2. **Bot** recebe e processa a mensagem
3. **IA** extrai produtos, quantidades e unidades
4. **Pedido** é criado como pendente
5. **Distribuidor** visualiza na Lista do Dia
6. **Distribuidor** aplica precificação
7. **Distribuidor** confere e entrega
8. **Faltas** podem ser transferidas para próximo pedido (backorder)

## Funcionalidades

### Bot WhatsApp
- Conversa guiada em português
- Extração inteligente de produtos com IA
- Mapeamento de apelidos (ex: "tomate" → "Tomate Salada")
- Conversão de unidades (ex: "cx" → "caixa", "mço" → "maço")
- Validação de datas de entrega
- Confirmação antes de salvar

### Dashboard
- Receita total e lucro bruto
- Ticket médio
- Margem percentual
- Vendas diárias (gráfico)
- Top 5 produtos por receita
- Pedidos recentes

### Precificação
- Margem padrão por cliente
- Margem individual por pedido
- Cálculo automático: `venda = custo × (1 + margem%)`
- Edição manual de preços
- Versionamento para evitar conflitos

### Backorders
- Registro de faltas na entrega
- Transferência automática para próximo pedido
- Quantidades preservadas
- Novos preços no pedido de destino

## Acesso Remoto (Piloto)

O projeto utiliza **Tailscale** para acesso seguro sem expor portas:

```
Celular + Tailscale ──► Tailscale VPN ──► API (100.123.207.8:3000)
```

- Nenhuma porta do roteador é aberta
- Tráfego criptografado dentro do túnel
- IP privado fixo no Tailscale

## Documentação Adicional

- [Piloto Controlado](docs/PILOTO_CONTROLADO.md) — guia de operação do piloto
- [Precificação por Pedido](docs/PRECIFICACAO_POR_PEDIDO.md) — detalhes da precificação
- [Acesso Remoto](docs/ACESSO_REMOTO_PILOTO.md) — configuração Tailscale
- [Edição de Clientes](docs/EDICAO_CLIENTES.md) — gestão de clientes
- [Modelagem do Banco](docs/HortiCurti-modelagem-banco.md) — DER e regras

## Licença

ISC
