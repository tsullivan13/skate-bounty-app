# Skate Bounty App

- Install: `npm install`
- Run: `npx expo start`
- Requirements: Node LTS, Git, VS Code

## Database migrations

SQL migrations for Supabase live in `supabase/migrations`. To apply them:

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli)
2. From the repository root, run the migrations against your database URL:
   - Local/remote database: `supabase db push --db-url "$SUPABASE_DB_URL"`
   - Local dockerized database: start it with `supabase db start` and run `supabase db push`
