# Bitespeed Identity Reconciliation

Backend service for linking customer contacts across multiple purchases.

## Live Endpoint

**Base URL:** `https://your-app.onrender.com`

### POST /identify

Identifies and consolidates contact information.

**Request:**
```json
{
  "email": "example@email.com",
  "phoneNumber": "123456"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["primary@email.com", "secondary@email.com"],
    "phoneNumbers": ["123456", "789012"],
    "secondaryContactIds": [2, 3]
  }
}
```

## Tech Stack

- Node.js + TypeScript
- Express.js
- PostgreSQL + Prisma ORM
- Hosted on Render

## Local Development

1. Clone the repo
2. Install dependencies: `npm install`
3. Set up `.env` with your `DATABASE_URL`
4. Run migrations: `npm run migrate`
5. Start dev server: `npm run dev`

## Deployment

The app is configured for Render deployment with Neon PostgreSQL.
