# LiveKit Setup Guide for VITANA School ERP

## Overview — Two Modes of Operation

| Mode | Who pays | Who manages | When to use |
|------|----------|-------------|-------------|
| **Vitana Shared Account** (default) | Vitana | Vitana ops team | All schools by default. Zero setup for the school. |
| **School's Own Account** | The school | The school's IT team | Schools that want data sovereignty, cost control, or branded domain. |

Both modes are supported out of the box. The `UseSharedVitanaAccount` toggle in the school settings controls which is active.

---

## Part 1 — Setting Up the Vitana Shared Account (Do This Once)

This is the **master LiveKit account** that Vitana runs for all schools. You only do this one time.

### Step 1 — Create a LiveKit Cloud Account

1. Go to **https://cloud.livekit.io**
2. Click **"Get Started Free"** → sign up with ops@vitanasms.com
3. Choose the **Cloud** plan (not self-hosted)
4. Select region: **ap-south-1 (Mumbai)** — closest to Indian schools
5. Give the project a name: `vitana-sms-production`

### Step 2 — Get the API Credentials

1. In the LiveKit dashboard → left sidebar → **Settings → Keys**
2. Click **"Create New Key"**
3. Name it: `vitana-production`
4. Copy both values shown (you only see the secret once):
   - **API Key**: starts with `API` — e.g. `APIxxxxxxxxxxxxxxxx`
   - **API Secret**: long random string — copy it immediately

5. Go to **Settings → Overview** → copy the **WebSocket URL**:
   - Format: `wss://vitana-sms-production.livekit.cloud`

### Step 3 — Configure the Backend

**Option A — appsettings (development only):**
```json
"LiveKit": {
  "ServerUrl": "wss://vitana-sms-production.livekit.cloud",
  "ApiKey": "APIxxxxxxxxxxxxxxxx",
  "ApiSecret": "your-secret-here",
  "WebhookSecret": "your-secret-here",
  "TokenExpiryMinutes": 15
}
```

**Option B — Environment variables (production — RECOMMENDED):**

Set these on your AWS EC2 / ECS task / App Service. Never put secrets in source code.

```bash
# On Linux/Mac server or in docker-compose.yml / ECS task definition
LiveKit__ServerUrl=wss://vitana-sms-production.livekit.cloud
LiveKit__ApiKey=APIxxxxxxxxxxxxxxxx
LiveKit__ApiSecret=your-secret-here
LiveKit__WebhookSecret=your-secret-here
LiveKit__TokenExpiryMinutes=15
```

> ASP.NET Core automatically reads `LiveKit__ApiKey` from environment as `LiveKit:ApiKey`. Use double underscore `__` as the section separator.

### Step 4 — Set Up the LiveKit Webhook

LiveKit calls your backend whenever a participant joins/leaves or a recording completes. Without this, automatic attendance won't work.

1. In LiveKit dashboard → **Webhooks** → **Add Webhook**
2. URL: `https://api.vitanasms.com/api/webhooks/livekit`
3. Events to subscribe to (tick all):
   - `participant_joined`
   - `participant_left`
   - `egress_ended` (for recordings)
4. Click **Save**

The backend validates each webhook using HMAC-SHA256 (`LiveKit:ApiSecret`). No additional config needed — it uses the same secret.

### Step 5 — Enable Recording (Optional)

If schools want class recordings stored in S3:

1. In LiveKit dashboard → **Egress** → enable
2. Configure S3 output pointing to your existing AWS S3 bucket:
   - Bucket: use the value from `Aws:BucketName` in appsettings
   - Prefix: `online-class-recordings/`
3. In appsettings:
   ```json
   "LiveKit": {
     "RecordingS3Bucket": "sms-resources-145295679999-ap-south-1-an",
     "RecordingS3Prefix": "online-class-recordings/"
   }
   ```

---

## Part 2 — School's Own LiveKit Account (Optional)

Schools that want their own credentials enter them in the web app under:
**Admin Settings → Online Classes → Meeting Provider → uncheck "Use Vitana Shared Account"**

The school follows the same Steps 1–4 above with their own LiveKit Cloud account, then enters:
- LiveKit Server URL
- API Key
- API Secret (stored AES-256 encrypted in your DB — never plaintext)

Vitana bears zero cost for that school once they switch to their own account.

---

## Part 3 — Cost Model

### Vitana Shared Account (Vitana pays)

LiveKit Cloud pricing (as of 2026):
- Video: **$0.006 per participant-minute** (e.g. 10 students × 45 min = 450 participant-minutes = $2.70/class)
- Audio only: **$0.0015 per participant-minute**
- Egress (recording bandwidth): **$0.01/GB**

| Scale | Estimated monthly cost to Vitana |
|-------|----------------------------------|
| 100 students, 5 classes/week | ~$30/mo |
| 500 students, 10 classes/week | ~$150/mo |
| 1,000 students, 20 classes/week | ~$600/mo |
| 5,000 students, 50 classes/week | ~$2,000/mo |

**At ~200+ concurrent daily users:** deploy a LiveKit OSS server on 3× AWS c5.2xlarge (~$600/mo total) to eliminate per-minute fees entirely.

### School's Own Account (School pays)

School bears 100% of their LiveKit Cloud bill. Vitana bears zero incremental cost. This works well for larger schools or those who want cost transparency.

---

## Part 4 — Environment Variable Reference

### Backend (appsettings.json / environment variables)

| Variable | Required | Description |
|----------|----------|-------------|
| `LiveKit__ServerUrl` | Yes | `wss://your-project.livekit.cloud` |
| `LiveKit__ApiKey` | Yes | API Key from LiveKit dashboard |
| `LiveKit__ApiSecret` | Yes | API Secret — keep secret, never commit |
| `LiveKit__WebhookSecret` | Yes | Same as ApiSecret — used for webhook HMAC |
| `LiveKit__TokenExpiryMinutes` | No | Default: `15`. Room JWT TTL in minutes. |
| `LiveKit__RecordingS3Bucket` | No | S3 bucket for LiveKit Egress recordings |
| `LiveKit__RecordingS3Prefix` | No | Default: `online-class-recordings/` |

### Mobile App

The mobile app needs **zero** LiveKit env vars. It gets a room token from the backend via `POST /api/online-classes/{id}/join` and passes it directly to the LiveKit React Native SDK. The WebSocket URL and room name are also returned by the backend. Nothing is hardcoded in the app bundle.

### Web App

Same as mobile — no LiveKit vars needed in the web UI `.env`. The web app calls the same backend join endpoint.

---

## Part 5 — Testing Without a Real LiveKit Account

During development, if you haven't set up a LiveKit account yet:

1. Leave `LiveKit:ApiKey` and `LiveKit:ApiSecret` empty in appsettings
2. The backend will still allow schedule/list/attend API calls
3. Calling `POST /online-classes/{id}/join` will return a token with an empty `wsUrl` — the mobile app will attempt to connect but fail gracefully (shows "Connection Error" alert)
4. All other features (scheduling, notifications, attendance override) work without a real LiveKit account

For a proper end-to-end test, you need real credentials. LiveKit Cloud has a **free tier** with 10,000 participant-minutes/month — more than enough for development.

---

## Part 6 — Quick Checklist

- [ ] LiveKit Cloud account created at https://cloud.livekit.io
- [ ] Project region set to ap-south-1 (Mumbai)
- [ ] API Key + Secret copied from Settings → Keys
- [ ] `LiveKit__ServerUrl`, `LiveKit__ApiKey`, `LiveKit__ApiSecret` set in production env vars
- [ ] Webhook URL configured in LiveKit dashboard pointing to `/api/webhooks/livekit`
- [ ] S3 Egress configured (if recordings are needed)
- [ ] `online_classes` module enabled for the demo school in `SchoolFeaturePermissions` table
- [ ] Smoke test run: `bash mobile/scripts/backend-smoke.sh` — all online-classes checks pass
