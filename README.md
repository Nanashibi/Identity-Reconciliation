# Bitespeed Identity Reconciliation

Backend service for linking customer contacts across multiple purchases.

## Live Endpoint

**Base URL:** `https://identity-reconciliation-5caq.onrender.com`

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

## Testing

Run the full test suite against the live endpoint:

```bash
npm test
```

To test against a different URL:

```bash
BASE_URL=https://your-url.onrender.com npm test
```

The test script covers:
- New contact creation (primary)
- Same info re-submitted (no duplicate created)
- Same phone, new email → secondary created
- Same email, new phone → secondary created
- Only email provided
- Only phone provided
- Two separate primaries being merged (older stays primary)
- Invalid request body (no email or phone) → 400

## Tech Stack

- Node.js + TypeScript
- Express.js
- PostgreSQL (Neon) + Prisma ORM
- Hosted on Render

## Local Development

1. Clone the repo
2. Install dependencies: `npm install`
3. Set up `.env` with your `DATABASE_URL`
4. Run migrations: `npm run migrate`
5. Start dev server: `npm run dev`
