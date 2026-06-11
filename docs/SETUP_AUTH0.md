# Auth0 Setup — Barry O's Old Market Tavern

Staff dashboard authentication uses [Auth0](https://auth0.com) on the client and JWT validation on the Express API. Public site pages do not require login.

---

## 1. Create the Auth0 tenant resources

### Application (SPA — client login)

1. Auth0 Dashboard → **Applications → Applications → Create Application**
2. Name: `Barry O's Staff` (or similar)
3. Type: **Single Page Application**
4. **Settings** tab — configure:

| Field | Value |
|-------|-------|
| **Allowed Callback URLs** | `http://localhost:5173`, `https://barryostavern.com` |
| **Allowed Logout URLs** | `http://localhost:5173`, `https://barryostavern.com` |
| **Allowed Web Origins** | `http://localhost:5173`, `https://barryostavern.com` |

5. Save changes
6. Copy **Domain** and **Client ID** from the same Settings page

### API (server JWT validation)

1. Auth0 Dashboard → **Applications → APIs → Create API**
2. Name: `Barry O's API`
3. **Identifier (Audience):** `http://localhost:3001/api` for local dev  
   (Use your production API URL in production, e.g. `https://api.barryostavern.com/api`)
4. Signing Algorithm: **RS256** (default)
5. Copy the **Identifier** — this is your audience

### Authorize the SPA to use the API (required)

Newer Auth0 tenants require an explicit link between your SPA and API. Without this, login fails with:

> Client "…" is not authorized to access resource server "http://localhost:3001/api"

1. Auth0 Dashboard → **Applications → APIs** → select **Barry O's API**
2. Open the **Application Access** tab (or **Machine to Machine** / **Applications** on older dashboards)
3. Find your **Single Page Application** in the list (Client ID must match `VITE_AUTH0_CLIENT_ID`)
4. Click **Edit** (or the toggle) and **enable User-delegated access** for that application
5. Save — you should see a green checkmark in the User-delegated Access column

Do **not** use the Auth0 "Test Application" client ID in `client/.env` — use the Client ID from your real SPA's Settings page.

---

## 2. Populate environment files

### `client/.env`

```env
VITE_API_URL=http://localhost:3001/api
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=http://localhost:3001/api
```

| Variable | Source |
|----------|--------|
| `VITE_AUTH0_DOMAIN` | SPA Application → Settings → **Domain** |
| `VITE_AUTH0_CLIENT_ID` | SPA Application → Settings → **Client ID** |
| `VITE_AUTH0_AUDIENCE` | API → Settings → **Identifier** |

Restart Vite after editing (`npm run dev`).

### `server/.env`

```env
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=http://localhost:3001/api
```

| Variable | Source |
|----------|--------|
| `AUTH0_DOMAIN` | Same **Domain** as client (must match exactly) |
| `AUTH0_AUDIENCE` | Same **Identifier** as `VITE_AUTH0_AUDIENCE` |

---

## 3. Seed the first manager user

Auth0 proves *who* someone is; MongoDB stores *whether* they are staff and their role. After a staff member logs in once, their Auth0 `sub` claim must exist in the `User` collection.

### Get your Auth0 `sub`

1. Fill in Auth0 env vars and run `npm run dev`
2. Open `http://localhost:5173/admin` and log in via Auth0
3. In browser DevTools → **Application → Local Storage** or decode the access token at [jwt.io](https://jwt.io)
4. Copy the `sub` claim (format: `auth0\|abc123...` or `google-oauth2\|...`)

### Add seed vars to `server/.env`

```env
ADMIN_AUTH0_SUB=auth0|your-sub-here
ADMIN_EMAIL=owner@example.com
ADMIN_NAME=Barry O
```

### Run the seed script (safe to re-run)

From the repository root:

```bash
npx ts-node server/src/scripts/seedAdmin.ts
```

Or from the `server/` directory:

```bash
npx ts-node src/scripts/seedAdmin.ts
```

Expected output:

```
MongoDB connected
Admin user upserted: owner@example.com (manager)
```

The script upserts by `auth0Sub` — running it again updates name/email without creating duplicates.

---

## 4. How auth works in code

```
Browser → Auth0 login → JWT (includes sub + audience)
       → API request with Authorization: Bearer <token>
       → checkJwt validates signature + audience
       → extractAuth0Sub(req) → User lookup
       → requireRole('manager' | 'staff') → 403 if not authorized
```

| Middleware | File | Purpose |
|------------|------|---------|
| `checkJwt` | `server/src/middleware/auth.ts` | Validates Auth0 JWT |
| `extractAuth0Sub` | `server/src/middleware/auth.ts` | Reads `sub` claim for User lookup |
| `requireRole` | `server/src/middleware/requireRole.ts` | Enforces manager/staff role from MongoDB |

Example route usage:

```typescript
router.delete(
  '/submissions/:id',
  checkJwt,
  requireRole('manager'),
  asyncHandler(handler)
);
```

Managers can access routes gated with `requireRole('staff')`.

---

## 5. Production checklist

When deploying to Vercel (client) and Railway (server):

1. Add production URLs to Auth0 SPA **Callback**, **Logout**, and **Web Origins**
2. Create or reuse an API with production audience identifier
3. Set production env vars in Vercel and Railway dashboards
4. Re-run `seedAdmin` against production MongoDB (or add staff users manually)

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Login redirect loop | Callback URL mismatch — add exact origin to Auth0 SPA settings |
| `invalid_request` — client not authorized to access resource server | SPA not authorized on API → **Application Access** tab → enable User-delegated access |
| `401 Unauthorized` on API | Missing/expired token, or `AUTH0_AUDIENCE` mismatch |
| `403 Forbidden — user not registered` | User logged into Auth0 but no `User` document — run seed script |
| `403 Forbidden — insufficient role` | User exists but role is `staff`; route requires `manager` |
| CORS errors | Client origin not in server CORS config or Auth0 Web Origins |
