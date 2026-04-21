# 🏦 MoneyBank — Banco Imobiliário Digital

Substitui a máquina física do Banco Imobiliário por um sistema de gestão de dinheiro **totalmente digital e em tempo real**. Cada jogador abre a aplicação no seu telemóvel; o bancário controla tudo numa interface de admin dedicada.

---

## Arquitetura

```
moneybank/
├── server/          Node.js + Express + Socket.io (WebSockets)
│   ├── package.json
│   └── server.js
└── client/          React + Vite + Tailwind CSS
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── socket.js
        ├── context/
        │   └── GameContext.jsx   ← estado global + todas as ações
        └── components/
            ├── Home.jsx              ← criar / entrar na sala
            ├── BankerDashboard.jsx   ← painel do bancário
            ├── PlayerDashboard.jsx   ← painel do jogador
            ├── RankingList.jsx       ← ranking reativo
            ├── TransactionHistory.jsx← extrato de movimentos
            ├── TransferModal.jsx     ← modal de transferência
            └── Toast.jsx             ← notificações push
```

---

## Pré-requisitos

- **Node.js** ≥ 18
- **npm** ≥ 9

---

## Instalação e Execução

### 1 — Servidor

```bash
cd server
npm install
npm run dev       # desenvolvimento (nodemon — recarrega ao salvar)
# ou
npm start         # produção
```

O servidor fica disponível em `http://localhost:3001`.

### 2 — Cliente

Abre um **segundo terminal**:

```bash
cd client
npm install
npm run dev
```

Abre o browser em `http://localhost:5173`.

---

## Como Jogar

| Papel | Passos |
|---|---|
| **Bancário (Host)** | 1. Abre a app → "Criar Sala" → define o teu nome e o saldo inicial por jogador → clica **Criar Sala** |
| | 2. Partilha o **código de 6 caracteres** com todos os jogadores |
| **Jogador** | 1. Abre a app → "Entrar na Sala" → insere o código → escolhe nome e peão → clica **Entrar na Sala** |

### Funcionalidades do Bancário
- **Pagar** — creditar dinheiro a um jogador (ex: Passou na Largada)
- **Cobrar** — debitar dinheiro de um jogador (ex: Imposto de Luxo)
- **Motivo** — campo opcional para registar o motivo no extrato
- **Reiniciar Saldos** — repõe todos os saldos ao valor inicial
- **Encerrar Sala** — fecha a partida e desliga todos os jogadores

### Funcionalidades do Jogador
- **Transferência** — pagar a outro jogador ou ao Banco com valor personalizado
- **Atalhos rápidos** — M$50 / M$100 / M$200 / M$500 / M$1000 na modal de transferência
- **Ranking** — lista animada e ordenada por saldo em tempo real
- **Extrato** — últimas 50 transações (as que te envolvem ficam destacadas)

### Reconexão Automática
Se um jogador fechar o browser acidentalmente, ao reabrir a app a **sessão é recuperada automaticamente** via `localStorage`. O jogador volta à partida com o saldo correto, sem perder nada.

---

## Variáveis de Ambiente

| Ficheiro | Variável | Padrão | Descrição |
|---|---|---|---|
| `server/.env` | `PORT` | `3001` | Porta do servidor |
| `server/.env` | `CLIENT_URL` | `http://localhost:5173` | URL do cliente (CORS) |
| `client/.env` | `VITE_SOCKET_URL` | `http://localhost:3001` | URL do servidor socket |

Exemplo `server/.env`:
```
PORT=3001
CLIENT_URL=http://localhost:5173
```

Exemplo `client/.env`:
```
VITE_SOCKET_URL=http://localhost:3001
```

---

## Segurança Implementada

- Sanitização de todos os inputs no servidor (nomes, valores, reason)
- Validação de autorização: só o socket correto pode iniciar uma transferência do seu saldo
- Apenas o bancário (verificado por `socket.id`) pode `adjust_balance`, `reset_balances` e `close_room`
- Limites máximos em valores (+1 000 000 000) e nomes (20 chars)
- Máximo de 8 jogadores por sala

---

## Deploy em Produção (sugestão rápida)

1. **Servidor:** Railway, Fly.io ou qualquer VPS com Node.js. Expõe a porta e define `CLIENT_URL` com o domínio do cliente.
2. **Cliente:** Vercel ou Netlify. Define `VITE_SOCKET_URL` com a URL do servidor. Corre `npm run build` e faz deploy da pasta `dist/`.
