# Database

Prisma + [Neon](https://neon.tech) Postgres. One `DATABASE_URL` per environment; Neon branches separate dev, preview, and production.

## Initial setup

1. Create a Neon project.
2. Create a branch per environment you want (e.g. `main` for prod, `dev` for local development, plus ephemeral branches for Vercel previews if you want them).
3. Copy the **pooled** connection string from the Neon console for each branch.

## Local development

Put the dev branch's connection string in `frontend/.env.local`:

```
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
```

Then:

```bash
cd frontend
cp .env.local .env        # Prisma CLI reads .env (not .env.local)
yarn db:migrate           # apply migrations
yarn dev
curl http://localhost:3000/api/health/db   # smoke test: should return { ok: true }
```

`.env` is gitignored by the root `.env*` pattern — don't worry about it leaking.

## Creating a new migration

```bash
cd frontend
# edit prisma/schema.prisma, then:
yarn db:migrate --name <short_descriptive_name>
```

Commit both the schema change and the generated `prisma/migrations/<timestamp>_<name>/` folder.

## Production (Vercel) environment variables

Set in the Vercel project settings (per environment — Production, Preview, Development):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string for that environment's branch |

Use the **pooled** endpoint (the one with `-pooler` in the hostname) — Vercel serverless functions are short-lived and benefit from Neon's PgBouncer.

## Running production migrations

Prisma needs a direct (non-pooled) connection for migrations. Use the **direct** (non-pooler) endpoint:

```bash
cd frontend
DATABASE_URL="postgresql://<user>:<password>@<direct-host>/<db>?sslmode=require" \
  yarn db:migrate:deploy
```

You can run this from your laptop or a CI job. The direct URL can be pulled from Vercel's env (add it as a separate secret like `DATABASE_URL_DIRECT`) or fetched from the Neon console.
