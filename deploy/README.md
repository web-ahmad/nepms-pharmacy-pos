# Deploying Pharvix to AWS EC2

One EC2 instance running four containers behind nginx. The database stays on
Supabase — nothing here provisions RDS.

```
                     https://pharvix.devjix.com
                              │
                        ┌─────▼─────┐
                        │   nginx   │  :80 :443   (TLS, the only public port)
                        └─────┬─────┘
              /api/v1, /storage │ everything else
                    ┌───────────┴──────────┐
              ┌─────▼─────┐          ┌─────▼─────┐
              │  backend  │          │ frontend  │
              │  :8000    │          │  :3000    │
              └─────┬─────┘          └───────────┘
                    │                ┌───────────┐
                    └───────────────►│ whatsapp  │  :3001
                                     └───────────┘
                    │
              Supabase Postgres (external)
```

---

## 1. Launch the instance

| Setting  | Value                                                              |
| -------- | ------------------------------------------------------------------ |
| AMI      | Ubuntu Server 24.04 LTS                                            |
| Type     | **t3.small** (2 GB RAM) — t3.micro's 1 GB will OOM on `next build`  |
| Storage  | 30 GB gp3                                                          |
| Region   | **ap-northeast-1 (Tokyo)** — same region as the Supabase project, so every database round trip stays in-region. The app makes far more DB calls than the browser makes page loads, so co-locating with the database beats co-locating with users. |

Security group inbound:

| Port | Source          | Why                    |
| ---- | --------------- | ---------------------- |
| 22   | **your IP only** | SSH                   |
| 80   | 0.0.0.0/0       | ACME challenge + redirect |
| 443  | 0.0.0.0/0       | the app                |

Nothing else. 8000, 3000 and 3001 stay private — the containers reach each
other on the compose network and are never published.

Allocate an **Elastic IP** and associate it. Without one the public IP changes
on every stop/start and the DNS record silently goes stale.

## 2. Point the subdomain at it

In Hostinger's DNS panel for `devjix.com`:

| Type | Name      | Value            | TTL  |
| ---- | --------- | ---------------- | ---- |
| A    | `pharvix` | *your Elastic IP* | 300 |

Wait for it to resolve before requesting a certificate — Let's Encrypt fails if
the name does not yet point at the box, and repeated failures hit a rate limit:

```bash
dig +short pharvix.devjix.com     # must print the Elastic IP
```

## 3. Install Docker

```bash
ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP

sudo apt-get update && sudo apt-get upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit                              # log back in for the group to apply
```

## 4. Get the code onto the box

```bash
ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP
git clone <your-repo-url> pharvix && cd pharvix
```

## 5. Configure

```bash
cp .env.production.example .env.production
nano .env.production
```

Fill in `DATABASE_URL` (Supabase session pooler), `SUPABASE_URL`, `SUPABASE_KEY`,
and generate a fresh `SECRET_KEY`:

```bash
openssl rand -hex 32
```

Do not reuse the development `SECRET_KEY`. Every issued session token is signed
with it — if it leaks, anyone can mint a valid admin token.

## 6. First certificate

nginx will not start while `pharvix.conf` points at a certificate that does not
exist yet, and certbot's webroot challenge needs nginx running. Break the loop
with the bootstrap config:

```bash
# a) serve plain HTTP only
sed -i 's|pharvix.conf|bootstrap.conf|' docker-compose.yml
docker compose --env-file .env.production up -d --build frontend backend nginx

# b) request the certificate.
# --entrypoint certbot is required: the service's own entrypoint is a forever
# renew-loop that would swallow this command and hang instead of issuing.
docker compose run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot -d pharvix.devjix.com \
  --agree-tos -m you@example.com --no-eff-email --non-interactive

# c) switch to the real config and bring everything up
sed -i 's|bootstrap.conf|pharvix.conf|' docker-compose.yml
docker compose --env-file .env.production up -d --build
```

The `certbot` container then renews automatically twice a day.

## 7. Verify

```bash
docker compose ps                              # all four Up, backend healthy
curl -fsS https://pharvix.devjix.com/health    # {"status":"healthy","database":"up"}
docker compose logs -f backend
```

Open <https://pharvix.devjix.com> and log in.

## 8. Pair WhatsApp

The Baileys service prints a QR code on first run:

```bash
docker compose logs -f whatsapp
```

Scan it from the phone. The pairing is stored in the `whatsapp_auth` volume and
survives restarts and rebuilds — it is only lost if that volume is deleted.

---

## Updating

```bash
cd pharvix && git pull
docker compose --env-file .env.production up -d --build
```

**After changing any SQLAlchemy model**, also run:

```bash
docker compose exec backend python scripts/sync_schema.py --check
docker compose exec backend python scripts/sync_schema.py --run
```

`create_all()` at startup only creates *missing tables* — it never adds a column
to a table that already exists, so a new model field is silently absent from the
database until something queries it and 500s.

## Backups

Supabase holds all the data and takes its own backups (Dashboard → Database →
Backups). The one thing living only on this instance is the `backend_storage`
volume — uploaded company logos and generated documents:

```bash
docker run --rm -v pharvix_backend_storage:/data -v $(pwd):/backup alpine \
  tar czf /backup/storage-$(date +%F).tar.gz -C /data .
```

## Known limitations on a cloud host

- **Camera snapshots do not work.** `services/camera_service.py` and
  `services/audit_listener.py` call `cv2.VideoCapture(0)` — a webcam physically
  attached to the machine. An EC2 instance has none, so those calls fail. The
  feature needs redesigning (client-side capture and upload) before it can work
  in a hosted deployment.
- **Thermal printing is client-side.** `python-escpos` in the backend cannot
  reach a printer attached to the cashier's PC. Receipt printing already goes
  through the browser's print dialog, which is unaffected.
- **One uvicorn worker, deliberately.** `main.py` starts APScheduler and several
  asyncio polling loops at import time; a second worker would run the nightly
  inventory audit, the scheduled reports and the WhatsApp briefings twice.
  Scaling out means moving those jobs into their own container first.
