# Unicon Ticket Backend

Minimal serverless Node.js/Express backend.

## API Endpoints

### POST /api/auth/login
Empty login endpoint (to be implemented).

**Response:**
```json
{
  "message": "Login endpoint - to be implemented"
}
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

The server will start on http://localhost:3000

## Deployment

### Vercel

```bash
vercel
```

## Testing with cURL

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```
