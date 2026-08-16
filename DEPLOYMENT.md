# Becky’s Garden — Cloudflare + Supabase

## Architecture

- Cloudflare Worker serves the static files from `public/` and the `/api/*` routes.
- Supabase Postgres stores editable content and questionnaire responses.
- Supabase Auth protects the admin panel.
- GitHub Actions validates, migrates and deploys every push to `main`.

## One-time account setup

### Supabase

1. Create a Supabase project in the EU region closest to the audience.
2. Save the project URL, anon key, service-role key, project ref and database password.
3. Apply `supabase/migrations/202608050001_initial_schema.sql`.
4. Run the initial content seed:

   ```bash
   SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." npm run supabase:seed:remote
   ```

5. In Authentication, create the admin user.
6. Add the admin email to the Worker secret `ADMIN_EMAILS`.

Never expose the service-role key in browser code or commit it to Git.

### Cloudflare

1. Add `beckysgarden.ro` to Cloudflare and replace the current Hostgate nameservers with those supplied by Cloudflare.
2. Authenticate Wrangler once with `npx wrangler login`.
3. Create the Worker secrets:

   ```bash
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_ANON_KEY
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put ADMIN_EMAILS
   ```

4. Deploy once with `npm run deploy`, then attach `beckysgarden.ro` and `www.beckysgarden.ro` as custom domains.

### GitHub

Create a private repository and add these repository Actions secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

The Cloudflare token should be scoped to this Worker/account. The Supabase token is used only by the migration job.

## Local development

The existing Node server remains available:

```bash
npm run dev
```

For the Cloudflare runtime, copy `.dev.vars.example` to `.dev.vars`, add development credentials, then run:

```bash
npm run dev:cloudflare
```

`.dev.vars` is ignored by Git.

## Production flow

1. Work and test locally.
2. Commit the change.
3. Push to `main`.
4. GitHub validates the Worker and applies new Supabase migrations.
5. Cloudflare deploys only if the previous jobs succeeded.

Initial seed data is deliberately not reapplied during deployments, so content edited in production cannot be overwritten by repository data.

