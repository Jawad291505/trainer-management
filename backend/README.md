# Trainer Management API

FastAPI + PostgreSQL backend for the platform. Python 3.12, [uv](https://docs.astral.sh/uv/) for deps, SQLModel + Alembic for the DB, hand-rolled JWT auth.

## Layout

```
app/
  main.py            ASGI app, CORS, router mount
  core/
    config.py        typed settings from .env (pydantic-settings)
    database.py      engine + get_session request dependency
    security.py      bcrypt hashing + JWT encode/decode
  models/            SQLModel tables (the DB schema)
  schemas/           Pydantic request/response DTOs (the API contract)
  crud/              data-access functions — routes call these, not the ORM
  api/
    deps.py          get_current_user, require_roles(...)
    routes/          auth.py, trainers.py  (+ api_router that mounts them)
alembic/             migrations (env.py pulls URL from app settings)
scripts/seed.py      load repo-root data/*.json into Postgres
```

`User` = the login identity for everyone. Role-specific data (e.g. `Trainer`)
lives on its own table keyed by `user_id`. `trainers.py` is a full CRUD slice —
copy its shape for clients, diet plans, exercise plans, etc.

## First-time setup

1. Install uv: https://docs.astral.sh/uv/getting-started/installation/
2. `cd backend && uv sync`
3. Create a Postgres DB on [Neon](https://neon.tech) (free). Copy the **pooled**
   connection string.
4. `cp .env.example .env`, then fill in:
   - `DATABASE_URL` — paste the Neon string, keep the `postgresql+psycopg://` prefix and `?sslmode=require`
   - `JWT_SECRET` — `python -c "import secrets; print(secrets.token_urlsafe(48))"`
5. Generate + apply the initial migration:
   ```
   uv run alembic revision --autogenerate -m "init users and trainers"
   uv run alembic upgrade head
   ```
6. Seed dev data (admin + trainers from `../data/referrals.json`):
   ```
   uv run python -m scripts.seed
   ```
7. Run it:
   ```
   uv run uvicorn app.main:app --reload
   ```
   Open http://127.0.0.1:8000/docs — click **Authorize**, log in as
   `admin@fittrack.io` / `changeme123`, and try the trainer endpoints.

## Everyday commands

| Task | Command |
| --- | --- |
| Run dev server | `uv run uvicorn app.main:app --reload` |
| New migration after a model change | `uv run alembic revision --autogenerate -m "..."` |
| Apply migrations | `uv run alembic upgrade head` |
| Roll back one | `uv run alembic downgrade -1` |
| Lint | `uv run ruff check .` |
| Add a dependency | `uv add <pkg>` |

## Deploy (Railway + Neon)

1. Push this repo. In Railway: **New Project → Deploy from GitHub repo**.
2. Service **Settings → Root Directory → `backend`** (so `railway.toml` + `Dockerfile` are used).
3. **Variables**: add `DATABASE_URL` (Neon pooled string), `JWT_SECRET`,
   `CORS_ORIGINS` (your deployed frontend URLs), `ENV=production`,
   `RESEND_API_KEY` + `EMAIL_FROM` (a verified-domain address in prod).
4. Deploy. `railway.toml`'s `preDeployCommand` runs `alembic upgrade head` on every deploy.
5. One-time seed against prod: `railway run --service <name> python -m scripts.seed` (or skip and create the admin by hand).

Neon and Railway stay independent — you can move either half without touching the other.

## Auth flow (trainer)

Tokens: a short-lived **access JWT** (`ACCESS_TOKEN_EXPIRE_MINUTES`, default 15)
plus a long-lived **refresh token** stored hashed in the `sessions` table — one
row per logged-in device. Send `Authorization: Bearer <access_token>` on every
protected request; when it 401s, call `/refresh`.

| Endpoint | Auth | Body | Returns |
| --- | --- | --- | --- |
| `POST /api/auth/register` | – | email, password, full_name, referral_code? | message (OTP emailed) |
| `POST /api/auth/verify-email` | – | email, code | **access + refresh** (logs you in) |
| `POST /api/auth/resend-verification` | – | email | message (60s cooldown) |
| `POST /api/auth/login` | – | OAuth2 form: `username`=email, `password` | access + refresh |
| `POST /api/auth/refresh` | – | refresh_token | new access + refresh (old one revoked — rotation) |
| `POST /api/auth/logout` | – | refresh_token | 204 (that session revoked) |
| `POST /api/auth/logout-all` | access | – | message (all sessions revoked) |
| `POST /api/auth/forgot-password` | – | email | message (always 200; OTP emailed if account exists) |
| `POST /api/auth/reset-password` | – | email, code, new_password | message (all sessions revoked) |
| `POST /api/auth/change-password` | access | current_password, new_password | message (other sessions revoked) |
| `GET  /api/auth/me` | access | – | current user |

- **OTP**: 6-digit code, HMAC-hashed in the `otps` table, 10-min expiry, 5-attempt
  cap. With `RESEND_API_KEY` unset the code is printed to the server log instead of
  emailed — the whole flow works offline.
- Registration always creates a `role=trainer` user + a `Trainer` profile;
  `referral_code` is recorded on the profile (full referral tracking is separate).
- `get_current_user` (in `app/api/deps.py`) decodes the access token and loads the
  user; `require_roles(UserRole.admin)` guards admin-only routes.
