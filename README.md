<div align="center">

<img src="https://caixify.com.br/logo.png" alt="Caixify" width="160"/>

# Caixify

**PDV e gestão para pequenos varejistas brasileiros**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python)](https://www.python.org/)
[![License](https://img.shields.io/badge/licença-proprietária-red?style=flat-square)]()

[🌐 Site](https://caixify.com.br) · [🚀 Acessar o app](https://app.caixify.com.br) · [📖 Central de Ajuda](https://caixify.com.br/ajuda)

</div>

---

## Sobre o projeto

O **Caixify** é um sistema SaaS multi-tenant de PDV (ponto de venda) e gestão comercial voltado para pequenos varejistas brasileiros — mercadinhos, mercearias e lojas de bairro. O objetivo é entregar uma ferramenta simples, rápida e acessível que cubra o ciclo completo da operação: da venda ao fechamento do caixa.

O sistema está em **beta ativo** com cliente real em Maceió, AL.

---

## Funcionalidades

### PDV
- Registro de vendas com busca de produtos por nome ou código
- Suporte a múltiplas formas de pagamento: Pix, débito, crédito e dinheiro
- Atalhos de teclado para operação ágil (F2, F4, F10, Esc, Delete)
- Abertura e fechamento de turno (caixa) com controle de sangria

### Gestão
- Cadastro de produtos com controle de estoque e preços
- Histórico de vendas por período
- Relatórios de desempenho e ticket médio
- Upload de logotipo por empresa

### Administração (por empresa)
- Gestão de usuários com controle de acesso por perfil
- Configurações da empresa (dados, logo, etc.)

### Superadmin (interno)
- Painel isolado para gestão de todas as empresas clientes
- Controle de acesso, faturamento e status por empresa
- Audit log com snapshots before/after de cada ação

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | FastAPI + Python 3.12 |
| Frontend | React 18 + Vite |
| Banco de dados | PostgreSQL 16 |
| ORM | SQLAlchemy |
| Servidor ASGI | Gunicorn + Uvicorn workers |
| Proxy reverso | Nginx |
| Cache / Rate limiting | Redis |
| Autenticação | JWT (HS256) |
| Deploy | VPS Ubuntu 24.04 LTS (Hostinger) |
| HTTPS | Certbot / Let's Encrypt |

---

## Arquitetura

```
caixify/
├── app/                        # Backend FastAPI
│   ├── main.py                 # Entry point, configuração do app
│   ├── database.py             # Conexão SQLAlchemy
│   ├── models/                 # Models do banco
│   ├── routers/                # Endpoints por módulo
│   │   ├── auth.py
│   │   ├── produtos.py
│   │   ├── vendas.py
│   │   ├── caixa.py
│   │   ├── empresas.py
│   │   ├── usuarios.py
│   │   └── superadmin/
│   ├── schemas/                # Pydantic schemas
│   ├── utils/                  # Helpers (auth, formatting, etc.)
│   └── uploads/                # Arquivos enviados (logos, etc.)
│
├── frontend/                   # Frontend React/Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── PDV/
│   │   │   ├── Produtos/
│   │   │   ├── Vendas/
│   │   │   ├── Caixa/
│   │   │   ├── Configuracoes/
│   │   │   └── Superadmin/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── .env                    # Dev local
│   └── .env.production         # Build de produção
│
└── nginx/
    └── caixify.conf            # Configuração do proxy reverso
```

### Fluxo de requisição (produção)

```
Cliente → Nginx (443) → strip /api → FastAPI (8000) → PostgreSQL
                     ↘ /uploads → arquivos estáticos
                     ↘ /        → frontend React
```

---

## Configuração local

### Pré-requisitos

- Python 3.12+
- Node.js 20+
- PostgreSQL 16
- Redis

### Backend

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/caixify.git
cd caixify

# Crie e ative o ambiente virtual
python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows

# Instale as dependências
pip install -r requirements.txt

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais locais

# Rode o servidor
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend

# Instale as dependências
npm install

# Configure as variáveis (dev local)
# .env já deve conter:
# VITE_API_URL=http://localhost:8000
# VITE_STORAGE_URL=http://localhost:8000

# Rode o servidor de desenvolvimento
npm run dev
```

### Variáveis de ambiente

**Backend (`.env`)**

```env
DATABASE_URL=postgresql://usuario:senha@localhost/caixify_db
SECRET_KEY=sua-chave-secreta
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
API_PREFIX=             # vazio em dev, /api em produção
REDIS_URL=redis://localhost:6379
```

**Frontend (`.env`)**

```env
VITE_API_URL=http://localhost:8000
VITE_STORAGE_URL=http://localhost:8000
```

---

## Deploy em produção

O deploy é feito em VPS Ubuntu 24.04 LTS com Nginx como proxy reverso.

### Build e envio do frontend

```bash
# Na máquina local
cd frontend
npm run build

# Envio via SCP (comando único — sem quebra de linha no Windows)
scp -r dist/* caixify@72.60.1.165:/var/www/caixify/frontend/

# No servidor
~/deploy-frontend.sh
```

### Serviço systemd

O backend roda como serviço (`caixify.service`) gerenciado pelo systemd:

```bash
sudo systemctl status caixify
sudo systemctl restart caixify
sudo journalctl -u caixify -f
```

### Backups

Backup automático do PostgreSQL via cron às 3h da manhã com entrega por e-mail (Gmail SMTP via `ssmtp`):

```bash
# Executa manualmente
pg_dump caixify_db > backup_$(date +%Y%m%d).sql
```

---

## Segurança

- Autenticação JWT com escopo separado para superadmin
- Rate limiting via Redis (proteção contra brute force)
- Lockout de conta após tentativas consecutivas inválidas
- Hash de senha com bcrypt
- HTTPS obrigatório em produção (Let's Encrypt)
- Firewall UFW (portas 22, 80, 443 apenas)
- Fail2ban ativo

---

## Atalhos de teclado (PDV)

| Tecla | Ação |
|---|---|
| `F2` | Focar busca de produto |
| `F10` | Finalizar venda |
| `F4` | Fechar turno |
| `Delete` | Remover último item |
| `Esc` | Fechar modal |

---

## Roadmap

- [ ] Impressão de cupom via impressora térmica (ESC/POS)
- [ ] Rotação de refresh token
- [ ] Autenticação 2FA
- [ ] Migrações com Alembic
- [ ] Relatórios exportáveis (PDF/Excel)
- [ ] Integração com leitor de código de barras

---

## Licença

Este projeto é software proprietário. Todos os direitos reservados © 2025 Caixify.

---

<div align="center">
  Feito com ☕ em Maceió, AL — Brasil
</div>
