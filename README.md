# employs-api

API em Node.js + Express para scraping de vagas do site Emprega Campinas.

## Requisitos

- Node.js 20+
- npm

## Instalação

```bash
npm install
```

## Executar

```bash
npm start
```

Variáveis de ambiente:

- `PORT` (padrão: `3000`)
- `SCRAPER_TIMEOUT_MS` (padrão: `30000`)
- `MAX_CONCURRENCY` (padrão: `4`)

## Endpoint

### `GET /jobs`

Busca vagas por termo.

Query params:

- `search` (obrigatório)
- `limit` (opcional, inteiro entre 1 e 50)

Exemplo:

```bash
curl "http://localhost:3000/jobs?search=limpeza&limit=5"
```

Resposta:

```json
{
  "count": 1,
  "items": [
    {
      "title": "Vaga exemplo",
      "dateTime": "12/03/2026",
      "description": "...",
      "responsibilities": "...",
      "requirements": "...",
      "salary": "...",
      "benefits": "...",
      "observations": "...",
      "contacts": {}
    }
  ]
}
```

## Testes

```bash
npm test
```
