# Pickleball Booking Web

Independent Next.js customer and staff web application, intended for Vercel.

## Requirements

Node.js 20+ and npm 10+.

## Local setup

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000. `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` must point to the independently deployed API; never put server secrets in this project.

## Validation and deployment

Run `npm run lint` and `npm run build`. Vercel should use the project root as its deployment root and configure the two public API URL variables per environment.
