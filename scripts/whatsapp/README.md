# WhatsApp API Test Toolkit

Standalone scripts to test **Meta Cloud API** directly — no Vitana frontend or backend module required.

All templates are **Utility** category only (attendance, fees, exams, admissions, etc.).

## Quick start (15 minutes)

### 1. Create Meta test app and get secrets

| Secret | Where to find it |
|--------|------------------|
| `WHATSAPP_ACCESS_TOKEN` | [developers.facebook.com](https://developers.facebook.com) → Your App → **WhatsApp** → **API Setup** → Temporary access token (24h). For long-term: Business Manager → System Users → Generate token with `whatsapp_business_messaging` + `whatsapp_business_management`. |
| `WHATSAPP_PHONE_NUMBER_ID` | Same page → **Phone number ID** |
| `WHATSAPP_WABA_ID` | Same page → **WhatsApp Business Account ID** |
| `WHATSAPP_APP_SECRET` | App Dashboard → **App settings** → **Basic** → **App secret** → Show |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | **You invent this** (any string). Must match what you enter in Meta webhook config. |

```bash
cd scripts/whatsapp
cp .env.example .env
# Edit .env with your values
```

### 2. Register your phone (sandbox only)

In Meta Developer Console:

**WhatsApp → API Setup → To → Manage phone number list**

1. Add your mobile number (e.g. `919876543210` — country code, no `+`)
2. Meta sends a code on WhatsApp — enter it
3. Set the same number in `.env` as `WHATSAPP_TEST_RECIPIENT`

> Sandbox only allows **5 test numbers**. Production WABA can message any opted-in user.

### 3. Verify connection

```bash
python3 whatsapp_test.py check
```

Expected output: phone number, WABA name, API reachable.

### 4. Register all Utility templates with Meta

```bash
# Preview payloads without calling API
python3 whatsapp_test.py templates register --dry-run

# Submit all 44 templates (Meta reviews 24–72 hours)
python3 whatsapp_test.py templates register

# Submit one template only
python3 whatsapp_test.py templates register --only fee_due_reminder
```

Check status:

```bash
python3 whatsapp_test.py templates list
```

### 5. Send personalized demo messages (your test numbers)

Three numbers are pre-configured in [`test_recipients.json`](test_recipients.json):

| Phone | Children | Message type |
|-------|----------|--------------|
| `919963497700` (9963497700) | Priya Sharma | General routine |
| `919810861740` (9810861740) | **Manisha Singh** | Warnings / complaints (absent, fee overdue, low marks) |
| | **Vedant Singh** | Normal (fees, homework, diary) |
| | **Varun Singh** | Normal (fees, results, announcements) |
| `916202166502` (6202166502) | **Revanth Singh** | Mixed (fees, exams, bus delay, report card) |

**Register all 3 numbers** in Meta sandbox before sending.

Preview what will be sent:

```bash
python3 whatsapp_test.py demo list
```

Send to everyone (after templates APPROVED):

```bash
python3 whatsapp_test.py demo send --dry-run   # preview first
python3 whatsapp_test.py demo send
```

Send to one parent / one child only:

```bash
# Manisha only — warning messages
python3 whatsapp_test.py demo send --phone 9810861740 --child manisha

# Vedant and Varun — normal messages
python3 whatsapp_test.py demo send --phone 9810861740 --child vedant
python3 whatsapp_test.py demo send --phone 9810861740 --child varun

# Revanth Singh
python3 whatsapp_test.py demo send --phone 6202166502

# First number
python3 whatsapp_test.py demo send --phone 9963497700
```

### 6. Send a single template manually

After template status is **APPROVED**:

```bash
python3 whatsapp_test.py send --template fee_due_reminder --to 919810861740
```

---

## Webhook testing (delivery status + template approval events)

Terminal 1 — expose local port:

```bash
ngrok http 8765
```

Terminal 2 — start webhook receiver:

```bash
python3 whatsapp_test.py webhook
```

In Meta: **WhatsApp → Configuration → Webhook**

| Field | Value |
|-------|-------|
| Callback URL | `https://<your-ngrok-id>.ngrok.io/webhook` |
| Verify token | Same as `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in `.env` |
| Subscribe | `messages`, `message_template_status_update` |

Click **Verify and Save**. You should see `Webhook verified` in the terminal.

When you send a message, you'll see `sent` → `delivered` → `read` status webhooks with billing info.

---

## All commands

| Command | Description |
|---------|-------------|
| `python3 whatsapp_test.py setup` | Full setup guide (printed to terminal) |
| `python3 whatsapp_test.py check` | Validate credentials against Meta API |
| `python3 whatsapp_test.py templates list` | Show APPROVED / PENDING / REJECTED per template |
| `python3 whatsapp_test.py templates register` | Submit all templates to Meta |
| `python3 whatsapp_test.py templates register --only NAME` | Submit one template |
| `python3 whatsapp_test.py send --template NAME --to PHONE` | Send one message |
| `python3 whatsapp_test.py send-all --to PHONE` | Send all APPROVED templates |
| `python3 whatsapp_test.py webhook` | Local webhook server on port 8765 |

---

## Template list (44 Utility templates)

| Module | Templates |
|--------|-----------|
| Attendance | `student_absent`, `late_arrival`, `attendance_shortage`, `monthly_attendance_report` |
| Fees | `fee_due_reminder`, `fee_overdue`, `payment_received`, `online_payment_success`, `concession_applied`, `late_fee_applied` |
| Exams | `exam_schedule`, `result_published`, `report_card_ready`, `online_exam_reminder`, `assignment_graded` |
| Admissions | `application_received`, `interview_scheduled`, `application_approved`, `application_rejected`, `enrollment_confirmed` |
| Leave | `leave_approved_staff`, `leave_rejected_staff`, `leave_approved_student`, `leave_rejected_student` |
| Diary | `diary_posted`, `homework_reminder` |
| Announcements | `urgent_announcement`, `general_announcement`, `holiday_notice` |
| Emergency | `school_closure`, `emergency_alert`, `safety_notice` |
| Transport | `bus_delayed`, `route_change`, `vehicle_breakdown` |
| Hostel | `room_allotted`, `hostel_fee_due`, `student_checkin` |
| Payroll | `salary_slip_ready`, `payroll_processed` |
| Library | `book_overdue`, `book_return_reminder` |
| Visitor | `visitor_arrived`, `expected_visitor_checkin` |

Definitions live in [`templates.json`](templates.json).

---

## Common errors

| Error | Fix |
|-------|-----|
| `(#131030) Recipient phone number not in allowed list` | Add recipient in Meta API Setup → Manage phone number list (sandbox) |
| `(#132000) Number of parameters does not match` | Template body placeholders changed — re-register template |
| `Template name does not exist` | Template not APPROVED yet — run `templates list` |
| `Invalid OAuth access token` | Token expired (24h temp token) — generate System User permanent token |
| `HTTP 403` on send | WABA not verified or app missing permissions |

---

## Cost note (India, Utility)

Meta charges **per delivered message** (~₹0.115/msg at list rate). Sandbox test messages to registered numbers are **free**.

---

## Relationship to Vitana backend

The WhatsApp Communication Hub module is **not implemented yet** in the API. This toolkit lets you:

1. Validate Meta integration before building the backend
2. Get all templates approved on your WABA early
3. Test send + webhook flow without the frontend

Once the backend is built, the same credentials go in `appsettings` under a `WhatsApp` section.
