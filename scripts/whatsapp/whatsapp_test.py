#!/usr/bin/env python3
"""
Vitana SMS — WhatsApp Cloud API test toolkit (Utility templates only).

Bypasses the frontend/backend module and talks directly to Meta Graph API.
Use this while the WhatsApp Hub module is under development.

Usage:
  python whatsapp_test.py setup              # Print Meta sandbox setup steps
  python whatsapp_test.py check              # Verify credentials + API access
  python whatsapp_test.py templates list     # List templates on your WABA
  python whatsapp_test.py templates register [--only NAME] [--dry-run]
  python whatsapp_test.py send --template fee_due_reminder --to 919876543210
  python whatsapp_test.py send-all --to 919876543210 [--dry-run]
  python whatsapp_test.py demo list          # Preview test messages per phone/child
  python whatsapp_test.py demo send          # Send configured demo messages
  python whatsapp_test.py demo send --phone 9810861740 --child manisha
  python whatsapp_test.py webhook            # Local webhook receiver (port 8765)
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
TEMPLATES_FILE = SCRIPT_DIR / "templates.json"
RECIPIENTS_FILE = SCRIPT_DIR / "test_recipients.json"
ENV_FILE = SCRIPT_DIR / ".env"

# Defaults — override via .env or environment variables
DEFAULT_API_VERSION = "v21.0"
DEFAULT_API_BASE = "https://graph.facebook.com"

# Meta-provided templates — APPROVED on every sandbox WABA, usable immediately
META_BUILTIN_TEMPLATES = {
    "hello_world": {"language": "en_US", "category": "UTILITY"},
}

# Seconds between outbound messages — slow down to avoid spam/quality flags
DEFAULT_SEND_DELAY = 10
_print_lock = threading.Lock()


def group_jobs_by_phone(jobs: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for job in jobs:
        grouped.setdefault(job["phone"], []).append(job)
    return grouped


def _safe_print(fn) -> None:
    with _print_lock:
        fn()


class Colors:
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def default_send_delay() -> int:
    load_dotenv(ENV_FILE)
    return int(os.environ.get("WHATSAPP_SEND_DELAY", str(DEFAULT_SEND_DELAY)))


def cfg() -> dict[str, str]:
    load_dotenv(ENV_FILE)
    return {
        "access_token": os.environ.get("WHATSAPP_ACCESS_TOKEN", ""),
        "phone_number_id": os.environ.get("WHATSAPP_PHONE_NUMBER_ID", ""),
        "waba_id": os.environ.get("WHATSAPP_WABA_ID", ""),
        "app_secret": os.environ.get("WHATSAPP_APP_SECRET", ""),
        "webhook_verify_token": os.environ.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "vitana_whatsapp_verify"),
        "api_version": os.environ.get("WHATSAPP_API_VERSION", DEFAULT_API_VERSION),
        "api_base": os.environ.get("WHATSAPP_API_BASE", DEFAULT_API_BASE),
        "test_recipient": os.environ.get("WHATSAPP_TEST_RECIPIENT", ""),
    }


def ok(msg: str) -> None:
    print(f"{Colors.GREEN}✓{Colors.RESET} {msg}")


def warn(msg: str) -> None:
    print(f"{Colors.YELLOW}!{Colors.RESET} {msg}")


def fail(msg: str) -> None:
    print(f"{Colors.RED}✗{Colors.RESET} {msg}")


def info(msg: str) -> None:
    print(f"{Colors.CYAN}→{Colors.RESET} {msg}")


def api_request(
    method: str,
    path: str,
    token: str,
    api_base: str,
    body: dict | None = None,
    params: dict | None = None,
) -> dict[str, Any]:
    url = f"{api_base.rstrip('/')}/{path.lstrip('/')}"
    if params:
        url += "?" + urllib.parse.urlencode(params)

    data = None
    headers = {"Authorization": f"Bearer {token}"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(err_body)
        except json.JSONDecodeError:
            parsed = {"error": {"message": err_body}}
        raise RuntimeError(
            f"HTTP {e.code} {method} {path}\n{json.dumps(parsed, indent=2)}"
        ) from e


def load_templates() -> dict[str, Any]:
    with TEMPLATES_FILE.open(encoding="utf-8") as f:
        return json.load(f)


def load_test_recipients() -> dict[str, Any]:
    with RECIPIENTS_FILE.open(encoding="utf-8") as f:
        return json.load(f)


def normalize_phone(phone: str) -> str:
    return phone.lstrip("+").replace(" ", "").replace("-", "")


def iter_demo_messages(
    phone_filter: str | None = None,
    child_filter: str | None = None,
    scenario_filter: str | None = None,
) -> list[dict[str, Any]]:
    """Flatten test_recipients.json into a list of sendable message jobs."""
    data = load_test_recipients()
    jobs: list[dict[str, Any]] = []
    phone_norm = normalize_phone(phone_filter) if phone_filter else None
    child_norm = child_filter.lower().strip() if child_filter else None
    scenario_norm = scenario_filter.lower().strip() if scenario_filter else None

    for recipient in data.get("recipients", []):
        phone = normalize_phone(recipient["phone"])
        if phone_norm and not phone.endswith(phone_norm) and phone != phone_norm:
            if phone_norm not in phone:
                continue

        for child in recipient.get("children", []):
            child_name = child.get("name", "")
            scenario = child.get("scenario", "")
            if child_norm and child_norm not in child_name.lower():
                continue
            if scenario_norm and scenario_norm != scenario.lower():
                continue

            for i, msg in enumerate(child.get("messages", [])):
                jobs.append({
                    "phone": phone,
                    "phone_display": recipient.get("label", phone),
                    "child": child_name,
                    "class": child.get("class", ""),
                    "section": child.get("section", ""),
                    "scenario": scenario,
                    "template": msg["template"],
                    "params": msg["params"],
                    "index": i + 1,
                })
    return jobs


def get_all_recipient_phones() -> list[dict[str, str]]:
    """Unique phones from test_recipients.json with display labels."""
    seen: set[str] = set()
    phones: list[dict[str, str]] = []
    for r in load_test_recipients().get("recipients", []):
        phone = normalize_phone(r["phone"])
        if phone not in seen:
            seen.add(phone)
            phones.append({"phone": phone, "label": r.get("label", phone)})
    return phones


def send_hello_world(c: dict[str, str], to: str) -> dict[str, Any]:
    body = {
        "messaging_product": "whatsapp",
        "to": normalize_phone(to),
        "type": "template",
        "template": {"name": "hello_world", "language": {"code": "en_US"}},
    }
    return api_request(
        "POST",
        f"{c['api_version']}/{c['phone_number_id']}/messages",
        c["access_token"],
        c["api_base"],
        body=body,
    )


def template_by_name(name: str) -> dict[str, Any] | None:
    data = load_templates()
    for t in data["templates"]:
        if t["name"] == name:
            return t
    return None


def build_meta_template_payload(tpl: dict[str, Any], meta: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": tpl["name"],
        "language": meta["language"],
        "category": meta["category"],
        "components": [
            {
                "type": "BODY",
                "text": tpl["body"],
                "example": {"body_text": [tpl["sample"]]},
            },
            {"type": "FOOTER", "text": meta["footer"]},
        ],
    }


def cmd_setup(_: argparse.Namespace) -> int:
    print(f"\n{Colors.BOLD}Meta WhatsApp Sandbox — Setup Guide{Colors.RESET}\n")
    steps = [
        (
            "Create Meta Developer App",
            "Go to https://developers.facebook.com → My Apps → Create App → Business type.\n"
            "  Name it e.g. 'Vitana SMS Dev' and add the WhatsApp product.",
        ),
        (
            "Copy API credentials (WhatsApp → API Setup)",
            "  WHATSAPP_PHONE_NUMBER_ID  — under 'Phone number ID'\n"
            "  WHATSAPP_WABA_ID          — under 'WhatsApp Business Account ID'\n"
            "  WHATSAPP_ACCESS_TOKEN     — temporary token (24h) on API Setup page\n"
            "  For production: create a System User in Business Manager with\n"
            "  whatsapp_business_messaging + whatsapp_business_management permissions.",
        ),
        (
            "Copy App Secret (for webhook signature verification)",
            "  App Dashboard → App settings → Basic → App secret → Show\n"
            "  Set as WHATSAPP_APP_SECRET in scripts/whatsapp/.env",
        ),
        (
            "Register YOUR phone as a test recipient (required in sandbox)",
            "  WhatsApp → API Setup → scroll to 'To' → Manage phone number list\n"
            "  Add your number in international format (no +), e.g. 919876543210\n"
            "  Meta sends a verification code on WhatsApp — enter it to confirm.\n"
            "  Sandbox allows up to 5 test numbers. Production skips this step.",
        ),
        (
            "Create local .env file",
            f"  cp {SCRIPT_DIR}/.env.example {SCRIPT_DIR}/.env\n"
            "  Fill in all values, then run: python whatsapp_test.py check",
        ),
        (
            "Register Utility templates",
            "  python whatsapp_test.py templates register\n"
            "  Meta reviews in 24–72 hours. Check status:\n"
            "  python whatsapp_test.py templates list",
        ),
        (
            "Send a test message (after template APPROVED)",
            "  python whatsapp_test.py send --template fee_due_reminder --to 919876543210",
        ),
        (
            "Webhook testing (optional, for delivery status)",
            "  Terminal 1: ngrok http 8765\n"
            "  Terminal 2: python whatsapp_test.py webhook\n"
            "  In Meta: WhatsApp → Configuration → Webhook\n"
            "    Callback URL: https://<ngrok-id>.ngrok.io/webhook\n"
            "    Verify token: same as WHATSAPP_WEBHOOK_VERIFY_TOKEN in .env\n"
            "    Subscribe: messages, message_template_status_update",
        ),
    ]
    for i, (title, body) in enumerate(steps, 1):
        print(f"{Colors.BOLD}{i}. {title}{Colors.RESET}")
        print(f"   {body}\n")
    print(f"Config file: {ENV_FILE}")
    print(f"Templates:   {TEMPLATES_FILE} ({len(load_templates()['templates'])} utility templates)\n")
    return 0


def cmd_check(_: argparse.Namespace) -> int:
    c = cfg()
    print(f"\n{Colors.BOLD}Checking WhatsApp API configuration{Colors.RESET}\n")

    missing = [k for k, v in {
        "WHATSAPP_ACCESS_TOKEN": c["access_token"],
        "WHATSAPP_PHONE_NUMBER_ID": c["phone_number_id"],
        "WHATSAPP_WABA_ID": c["waba_id"],
    }.items() if not v]

    if missing:
        for m in missing:
            fail(f"Missing {m} — copy .env.example to .env and fill values")
        info("Run: python whatsapp_test.py setup")
        return 1

    ok("Environment variables present")
    if not c["app_secret"]:
        warn("WHATSAPP_APP_SECRET not set — webhook signature verification will be skipped")
    if c["test_recipient"]:
        ok(f"Default test recipient: {c['test_recipient']}")
    else:
        warn("WHATSAPP_TEST_RECIPIENT not set — pass --to on send commands")

    version = c["api_version"]
    base = c["api_base"]
    token = c["access_token"]

    # Check phone number
    try:
        phone = api_request(
            "GET",
            f"{version}/{c['phone_number_id']}",
            token,
            base,
            params={"fields": "display_phone_number,verified_name,quality_rating"},
        )
        ok(f"Phone number: {phone.get('display_phone_number', '?')} ({phone.get('verified_name', 'n/a')})")
    except RuntimeError as e:
        fail(str(e))
        return 1

    # Check WABA
    try:
        waba = api_request(
            "GET",
            f"{version}/{c['waba_id']}",
            token,
            base,
            params={"fields": "name,account_review_status"},
        )
        ok(f"WABA: {waba.get('name', '?')} — review status: {waba.get('account_review_status', '?')}")
    except RuntimeError as e:
        fail(str(e))
        return 1

    # List template count
    try:
        templates = api_request(
            "GET",
            f"{version}/{c['waba_id']}/message_templates",
            token,
            base,
            params={"limit": "5"},
        )
        count = len(templates.get("data", []))
        ok(f"API reachable — fetched {count}+ message templates")
    except RuntimeError as e:
        fail(str(e))
        return 1

    print(f"\n{Colors.GREEN}All checks passed.{Colors.RESET} Ready to register/send.\n")
    return 0


def cmd_templates_list(_: argparse.Namespace) -> int:
    c = cfg()
    if not c["access_token"] or not c["waba_id"]:
        fail("Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_WABA_ID in .env")
        return 1

    local = {t["name"] for t in load_templates()["templates"]}
    approved: list[str] = []
    pending: list[str] = []
    rejected: list[str] = []
    other: list[str] = []

    url_path = f"{c['api_version']}/{c['waba_id']}/message_templates"
    params: dict[str, str] = {"limit": "100"}
    while url_path:
        resp = api_request("GET", url_path, c["access_token"], c["api_base"], params=params)
        for t in resp.get("data", []):
            name = t.get("name", "")
            status = t.get("status", "UNKNOWN")
            if name not in local:
                continue
            line = f"  {name:35} {status:12} [{t.get('category', '?')}]"
            if status == "APPROVED":
                approved.append(line)
            elif status in ("PENDING", "IN_APPEAL"):
                pending.append(line)
            elif status == "REJECTED":
                rejected.append(line)
            else:
                other.append(line)
        next_url = resp.get("paging", {}).get("next")
        if next_url:
            # Meta returns full URL — extract path after graph.facebook.com
            parsed = urllib.parse.urlparse(next_url)
            url_path = parsed.path.lstrip("/") + ("?" + parsed.query if parsed.query else "")
            params = {}
        else:
            url_path = ""

    marketing_flagged: list[str] = []
    resp_all = api_request(
        "GET",
        f"{c['api_version']}/{c['waba_id']}/message_templates",
        c["access_token"],
        c["api_base"],
        params={"limit": "250"},
    )
    for t in resp_all.get("data", []):
        if t.get("name") in local and t.get("category") == "MARKETING":
            marketing_flagged.append(
                f"  {t['name']:35} {t.get('status'):12} [MARKETING] — use utility replacement"
            )

    print(f"\n{Colors.BOLD}Meta built-in templates (use now — no registration needed){Colors.RESET}\n")
    for name, meta in META_BUILTIN_TEMPLATES.items():
        print(f"  {Colors.GREEN}{name:35} APPROVED     [{meta['category']}] lang={meta['language']}{Colors.RESET}")
    info("Send now: python3 whatsapp_test.py send-now")

    print(f"\n{Colors.BOLD}Vitana custom templates on Meta WABA{Colors.RESET}\n")
    if approved:
        print(f"{Colors.GREEN}APPROVED ({len(approved)}){Colors.RESET}")
        print("\n".join(approved))
    if pending:
        print(f"\n{Colors.YELLOW}PENDING ({len(pending)}){Colors.RESET}")
        print("\n".join(pending))
    if rejected:
        print(f"\n{Colors.RED}REJECTED ({len(rejected)}){Colors.RESET}")
        print("\n".join(rejected))
    if other:
        print(f"\nOTHER ({len(other)})")
        print("\n".join(other))
    if marketing_flagged:
        print(f"\n{Colors.RED}MARKETING (needs utility replacement — delete & re-register){Colors.RESET}")
        print("\n".join(marketing_flagged))

    registered_names: set[str] = set()
    resp = api_request(
        "GET",
        f"{c['api_version']}/{c['waba_id']}/message_templates",
        c["access_token"],
        c["api_base"],
        params={"limit": "250"},
    )
    for t in resp.get("data", []):
        if t.get("name") in local:
            registered_names.add(t["name"])

    missing = sorted(local - registered_names)
    if missing:
        print(f"\n{Colors.CYAN}NOT REGISTERED on Meta ({len(missing)}){Colors.RESET}")
        for name in missing:
            print(f"  {name}")
        info("Run: python whatsapp_test.py templates register")

    print()
    return 0


def cmd_templates_register(args: argparse.Namespace) -> int:
    c = cfg()
    if not args.dry_run and (not c["access_token"] or not c["waba_id"]):
        fail("Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_WABA_ID in .env")
        return 1

    meta = load_templates()
    targets = meta["templates"]
    if args.only:
        targets = [t for t in targets if t["name"] == args.only]
        if not targets:
            fail(f"Template '{args.only}' not found in templates.json")
            return 1

    print(f"\n{Colors.BOLD}Registering {len(targets)} utility template(s) with Meta{Colors.RESET}\n")
    success = 0
    skipped = 0
    errors = 0

    for tpl in targets:
        if tpl.get("deprecated"):
            warn(f"{tpl['name']} — skipped (deprecated, use replacement template)")
            skipped += 1
            continue
        if tpl.get("alias_of") and not args.only:
            warn(f"{tpl['name']} — skipped (alias of {tpl['alias_of']}, register parent name instead)")
            skipped += 1
            continue
        payload = build_meta_template_payload(tpl, meta)
        if args.dry_run:
            info(f"[dry-run] Would register: {tpl['name']}")
            print(json.dumps(payload, indent=2))
            skipped += 1
            continue

        try:
            result = api_request(
                "POST",
                f"{c['api_version']}/{c['waba_id']}/message_templates",
                c["access_token"],
                c["api_base"],
                body=payload,
            )
            ok(f"{tpl['name']} — submitted (id: {result.get('id', 'n/a')}, status: {result.get('status', 'PENDING')})")
            success += 1
            time.sleep(1)  # gentle rate limit
        except RuntimeError as e:
            err = str(e)
            if "already exists" in err.lower() or "duplicate" in err.lower():
                warn(f"{tpl['name']} — already exists on WABA, skipping")
                skipped += 1
            else:
                fail(f"{tpl['name']} — {err}")
                errors += 1

    print(f"\nDone: {success} submitted, {skipped} skipped, {errors} errors")
    if success:
        info("Meta review takes 24–72 hours. Check: python whatsapp_test.py templates list")
    return 0 if errors == 0 else 1


def get_meta_template_status(c: dict[str, str], template_name: str) -> dict[str, Any] | None:
    """Look up a template on the WABA by name. Returns None if not found."""
    resp = api_request(
        "GET",
        f"{c['api_version']}/{c['waba_id']}/message_templates",
        c["access_token"],
        c["api_base"],
        params={"name": template_name, "limit": "10"},
    )
    for t in resp.get("data", []):
        if t.get("name") == template_name:
            return t
    return None


def send_template_message(
    c: dict[str, str],
    template_name: str,
    to: str,
    sample: list[str],
    language: str = "en",
) -> dict[str, Any]:
    to_clean = to.lstrip("+").replace(" ", "").replace("-", "")
    body = {
        "messaging_product": "whatsapp",
        "to": to_clean,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language},
            "components": [
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": v} for v in sample],
                }
            ],
        },
    }
    return api_request(
        "POST",
        f"{c['api_version']}/{c['phone_number_id']}/messages",
        c["access_token"],
        c["api_base"],
        body=body,
    )


def cmd_send(args: argparse.Namespace) -> int:
    c = cfg()
    if not c["access_token"] or not c["phone_number_id"]:
        fail("Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env")
        return 1

    to = args.to or c["test_recipient"]
    if not to:
        fail("Pass --to 919876543210 or set WHATSAPP_TEST_RECIPIENT in .env")
        return 1

    tpl = template_by_name(args.template)
    if not tpl:
        fail(f"Template '{args.template}' not in templates.json")
        return 1

    meta = load_templates()
    if args.dry_run:
        info(f"[dry-run] Would send '{args.template}' to {to}")
        print(json.dumps({"sample": tpl["sample"]}, indent=2))
        return 0

    # Pre-check Meta status — avoids cryptic 132001 errors
    try:
        meta_tpl = get_meta_template_status(c, args.template)
    except RuntimeError as e:
        warn(f"Could not check template status: {e}")
        meta_tpl = None

    if meta_tpl:
        status = meta_tpl.get("status", "UNKNOWN")
        lang = meta_tpl.get("language", meta["language"])
        if status != "APPROVED":
            fail(f"Template '{args.template}' is {status} on Meta — only APPROVED templates can be sent")
            info("Meta review usually takes 24–72 hours. Check: python3 whatsapp_test.py templates list")
            info("Meanwhile test your connection: python3 whatsapp_test.py ping --to " + normalize_phone(to))
            return 1
    elif meta_tpl is None:
        warn(f"Template '{args.template}' not found on WABA — register it first")

    print(f"Sending '{args.template}' to {to}...")
    try:
        lang = meta_tpl.get("language", meta["language"]) if meta_tpl else meta["language"]
        result = send_template_message(c, args.template, to, tpl["sample"], lang)
        msg_id = result.get("messages", [{}])[0].get("id", "n/a")
        ok(f"Message accepted by Meta — wamid: {msg_id}")
        info("Check your WhatsApp app. Delivery status comes via webhook if configured.")
        print(json.dumps(result, indent=2))
    except RuntimeError as e:
        fail(str(e))
        if "132001" in str(e) or "template" in str(e).lower():
            warn("Template not APPROVED yet or wrong language code. Run: python3 whatsapp_test.py templates list")
            warn("Smoke test: python3 whatsapp_test.py ping --to " + normalize_phone(to))
        return 1
    return 0


def cmd_ping(args: argparse.Namespace) -> int:
    """Send Meta's built-in hello_world template to verify API + recipient."""
    c = cfg()
    if not c["access_token"] or not c["phone_number_id"]:
        fail("Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env")
        return 1

    targets: list[dict[str, str]] = []
    if getattr(args, "all_phones", False):
        targets = get_all_recipient_phones()
    elif args.to:
        targets = [{"phone": normalize_phone(args.to), "label": args.to}]
    elif c["test_recipient"]:
        targets = [{"phone": normalize_phone(c["test_recipient"]), "label": c["test_recipient"]}]
    else:
        fail("Pass --to 919810861740 or --all-phones")
        return 1

    sent = failed = 0
    for t in targets:
        print(f"Sending hello_world to {t['label']} ({t['phone']})...")
        try:
            result = send_hello_world(c, t["phone"])
            msg_id = result.get("messages", [{}])[0].get("id", "n/a")
            ok(f"hello_world sent — wamid: {msg_id}")
            sent += 1
            time.sleep(default_send_delay())
        except RuntimeError as e:
            fail(str(e))
            warn("Register this number in Meta: API Setup → Manage phone number list")
            failed += 1

    if sent and not getattr(args, "all_phones", False):
        info("API + recipient OK. Custom templates need APPROVED status before demo send.")
    print(f"\nDone: {sent} sent, {failed} failed")
    return 0 if failed == 0 else 1


def cmd_send_now(args: argparse.Namespace) -> int:
    """Send Meta built-in hello_world to test numbers — only template usable without approval wait."""
    c = cfg()
    if not c["access_token"] or not c["phone_number_id"]:
        fail("Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env")
        return 1

    builtin = args.template or "hello_world"
    if builtin not in META_BUILTIN_TEMPLATES:
        fail(f"'{builtin}' is not a Meta built-in template. Available: {', '.join(META_BUILTIN_TEMPLATES)}")
        return 1

    meta = META_BUILTIN_TEMPLATES[builtin]
    targets = get_all_recipient_phones() if not args.to else [
        {"phone": normalize_phone(args.to), "label": args.to}
    ]

    print(f"\n{Colors.BOLD}Sending Meta built-in '{builtin}' ({meta['category']}){Colors.RESET}")
    warn("hello_world has fixed text — custom Vitana messages need APPROVED utility templates")

    sent = failed = 0
    for t in targets:
        body = {
            "messaging_product": "whatsapp",
            "to": t["phone"],
            "type": "template",
            "template": {"name": builtin, "language": {"code": meta["language"]}},
        }
        try:
            result = api_request(
                "POST",
                f"{c['api_version']}/{c['phone_number_id']}/messages",
                c["access_token"],
                c["api_base"],
                body=body,
            )
            msg_id = result.get("messages", [{}])[0].get("id", "n/a")
            ok(f"{t['label']} ({t['phone']}) — {msg_id}")
            sent += 1
            time.sleep(args.delay)
        except RuntimeError as e:
            fail(f"{t['label']} — {e}")
            failed += 1

    print(f"\nDone: {sent} sent, {failed} failed")
    return 0 if failed == 0 else 1


def cmd_vitana_test(args: argparse.Namespace) -> int:
    """Send vitana_sms_test template: 'This is a test message for Vitana SMS' to test numbers."""
    c = cfg()
    if not c["access_token"] or not c["phone_number_id"]:
        fail("Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env")
        return 1

    tpl_name = "vitana_sms_test"
    tpl = template_by_name(tpl_name)
    if not tpl:
        fail(f"Template {tpl_name} not in templates.json")
        return 1

    meta_tpl = None
    try:
        meta_tpl = get_meta_template_status(c, tpl_name)
    except RuntimeError:
        pass

    if not meta_tpl and not args.skip_register:
        info(f"Registering {tpl_name} with Meta...")
        reg_args = argparse.Namespace(only=tpl_name, dry_run=False)
        if cmd_templates_register(reg_args) != 0:
            return 1
        meta_tpl = get_meta_template_status(c, tpl_name)

    if meta_tpl and meta_tpl.get("status") != "APPROVED":
        fail(f"Template '{tpl_name}' is {meta_tpl.get('status', 'UNKNOWN')} — cannot send yet")
        info("Meta review takes 24–72 hours. Meanwhile:")
        info("  python3 whatsapp_test.py ping --all-phones")
        return 1

    school = load_test_recipients().get("school_name", "Vitana Demo School")
    targets: list[dict[str, str]] = []
    if args.to:
        child = args.child or "Student"
        targets = [{"phone": normalize_phone(args.to), "label": args.to, "child": child}]
    else:
        for r in load_test_recipients().get("recipients", []):
            phone = normalize_phone(r["phone"])
            child = r["children"][0]["name"] if r.get("children") else "Student"
            targets.append({"phone": phone, "label": r.get("label", phone), "child": child})

    meta = load_templates()
    lang = meta_tpl.get("language", meta["language"]) if meta_tpl else meta["language"]
    sent = failed = 0

    print(f"\n{Colors.BOLD}Sending Vitana SMS test message{Colors.RESET}\n")
    for t in targets:
        params = ["Parent", t["child"], school]
        label = f"{t['label']} — {t['child']}"
        if args.dry_run:
            info(f"[dry-run] {label}: {params}")
            sent += 1
            continue
        try:
            result = send_template_message(c, tpl_name, t["phone"], params, lang)
            msg_id = result.get("messages", [{}])[0].get("id", "n/a")
            ok(f"{label} — {msg_id}")
            sent += 1
            time.sleep(args.delay)
        except RuntimeError as e:
            fail(f"{label} — {e}")
            failed += 1

    print(f"\nDone: {sent} sent, {failed} failed")
    return 0 if failed == 0 else 1


def cmd_send_samples(args: argparse.Namespace) -> int:
    """
    Send samples to each configured test number.
    hello_world first, then all APPROVED custom templates from test_recipients.json.
    """
    c = cfg()
    if not c["access_token"] or not c["phone_number_id"]:
        fail("Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env")
        return 1

    approved: set[str] = set()
    try:
        resp = api_request(
            "GET",
            f"{c['api_version']}/{c['waba_id']}/message_templates",
            c["access_token"],
            c["api_base"],
            params={"limit": "250"},
        )
        for t in resp.get("data", []):
            if t.get("status") == "APPROVED" and t.get("name") != "hello_world":
                approved.add(t["name"])
    except RuntimeError as e:
        warn(f"Could not fetch template list: {e}")

    meta = load_templates()
    jobs = iter_demo_messages(args.phone, args.child)
    sent = failed = skipped = 0

    # Group jobs by phone
    by_phone: dict[str, list[dict[str, Any]]] = {}
    for job in jobs:
        by_phone.setdefault(job["phone"], []).append(job)

    delay = args.delay if args.delay is not None else default_send_delay()
    mode = "PARALLEL" if getattr(args, "parallel", False) else "SEQUENTIAL"
    print(f"\n{Colors.BOLD}Sending samples to {len(by_phone)} number(s){Colors.RESET}")
    info(f"Mode: {mode} | Delay within each number: {delay}s")
    if approved:
        info(f"{len(approved)} custom template(s) APPROVED")
    else:
        warn("No custom templates APPROVED yet — hello_world only until Meta approves")

    def send_samples_for_phone(phone: str, phone_jobs: list[dict[str, Any]]) -> tuple[int, int, int]:
        local_sent = local_failed = local_skipped = 0
        label = phone_jobs[0]["phone_display"]
        _safe_print(lambda: print(f"\n{Colors.BOLD}📱 {label} ({phone}){Colors.RESET}"))
        if not args.dry_run:
            try:
                result = send_hello_world(c, phone)
                msg_id = result.get("messages", [{}])[0].get("id", "n/a")
                _safe_print(lambda: ok(f"hello_world — {msg_id}"))
                local_sent += 1
                time.sleep(delay)
            except RuntimeError as e:
                _safe_print(lambda: fail(f"hello_world — {e}"))
                local_failed += 1
        else:
            _safe_print(lambda: info("[dry-run] hello_world"))

        for job in phone_jobs:
            tpl_name = job["template"]
            job_label = f"{job['child']} → {tpl_name}"
            if tpl_name not in approved:
                local_skipped += 1
                continue
            if args.dry_run:
                _safe_print(lambda jl=job_label: info(f"[dry-run] {jl}"))
                local_sent += 1
                continue
            try:
                lang = meta["language"]
                meta_tpl = get_meta_template_status(c, tpl_name)
                if meta_tpl:
                    lang = meta_tpl.get("language", lang)
                result = send_template_message(c, tpl_name, phone, job["params"], lang)
                msg_id = result.get("messages", [{}])[0].get("id", "n/a")
                _safe_print(lambda jl=job_label, mid=msg_id: ok(f"{jl} — {mid}"))
                local_sent += 1
                time.sleep(delay)
            except RuntimeError as e:
                _safe_print(lambda jl=job_label, err=e: fail(f"{jl} — {err}"))
                local_failed += 1
        return local_sent, local_failed, local_skipped

    if getattr(args, "parallel", False):
        with ThreadPoolExecutor(max_workers=min(len(by_phone), getattr(args, "workers", 4))) as pool:
            futs = [pool.submit(send_samples_for_phone, p, pj) for p, pj in by_phone.items()]
            for fut in as_completed(futs):
                s, f, sk = fut.result()
                sent += s
                failed += f
                skipped += sk
    else:
        for phone, phone_jobs in by_phone.items():
            s, f, sk = send_samples_for_phone(phone, phone_jobs)
            sent += s
            failed += f
            skipped += sk

    print(f"\nDone: {sent} sent, {skipped} skipped (PENDING templates), {failed} failed")
    if not approved:
        info("When templates are APPROVED, run: python3 whatsapp_test.py send-samples")
    return 0 if failed == 0 else 1


def cmd_send_all(args: argparse.Namespace) -> int:
    c = cfg()
    to = args.to or c["test_recipient"]
    if not to:
        fail("Pass --to or set WHATSAPP_TEST_RECIPIENT")
        return 1

    # Only send APPROVED templates
    approved: set[str] = set()
    if not args.force:
        try:
            resp = api_request(
                "GET",
                f"{c['api_version']}/{c['waba_id']}/message_templates",
                c["access_token"],
                c["api_base"],
                params={"limit": "250"},
            )
            for t in resp.get("data", []):
                if t.get("status") == "APPROVED":
                    approved.add(t["name"])
        except RuntimeError as e:
            warn(f"Could not fetch approved list: {e}")
            if not args.dry_run:
                fail("Use --force to send without approval check")
                return 1

    meta = load_templates()
    sent = 0
    failed = 0

    for tpl in meta["templates"]:
        if not args.force and tpl["name"] not in approved:
            warn(f"Skipping {tpl['name']} (not APPROVED)")
            continue
        if args.dry_run:
            info(f"[dry-run] Would send {tpl['name']} → {to}")
            sent += 1
            continue
        try:
            result = send_template_message(c, tpl["name"], to, tpl["sample"], meta["language"])
            msg_id = result.get("messages", [{}])[0].get("id", "n/a")
            ok(f"{tpl['name']} — {msg_id}")
            sent += 1
            time.sleep(2)  # avoid rate limits in sandbox
        except RuntimeError as e:
            fail(f"{tpl['name']} — {e}")
            failed += 1

    print(f"\nDone: {sent} sent, {failed} failed")
    return 0 if failed == 0 else 1


def cmd_list_demo(args: argparse.Namespace) -> int:
    jobs = iter_demo_messages(args.phone, args.child, args.scenario)
    if not jobs:
        fail("No messages match filters — check test_recipients.json")
        return 1

    print(f"\n{Colors.BOLD}Demo messages ({len(jobs)} total){Colors.RESET}\n")
    current_phone = ""
    current_child = ""
    for job in jobs:
        if job["phone"] != current_phone:
            current_phone = job["phone"]
            print(f"\n{Colors.BOLD}📱 {job['phone_display']} ({job['phone']}){Colors.RESET}")
            current_child = ""
        if job["child"] != current_child:
            current_child = job["child"]
            tag = job["scenario"]
            if tag == "complaint_warnings":
                tag_str = f"{Colors.YELLOW}[warnings/complaints]{Colors.RESET}"
            elif tag == "normal":
                tag_str = f"{Colors.GREEN}[normal]{Colors.RESET}"
            else:
                tag_str = f"[{tag}]"
            print(f"  👤 {job['child']} (Class {job['class']}-{job['section']}) {tag_str}")

        preview = " | ".join(job["params"][:3])
        if len(job["params"]) > 3:
            preview += " | ..."
        print(f"     {job['index']}. {job['template']}: {preview}")

    print(f"\n{Colors.CYAN}Send all:{Colors.RESET} python3 whatsapp_test.py demo send")
    if args.phone or args.child:
        parts = ["python3 whatsapp_test.py demo send"]
        if args.phone:
            parts.append(f"--phone {args.phone}")
        if args.child:
            parts.append(f"--child {args.child}")
        print(f"{Colors.CYAN}Send filtered:{Colors.RESET} {' '.join(parts)}")
    print()
    return 0


def send_jobs_for_phone(
    c: dict[str, str],
    phone_jobs: list[dict[str, Any]],
    approved: set[str],
    meta_lang: str,
    delay: int,
    *,
    dry_run: bool,
    force: bool,
    stop_on_error: bool,
) -> tuple[int, int, int]:
    """Send all jobs for one phone sequentially. Returns (sent, failed, skipped)."""
    sent = failed = skipped = 0
    phone_label = phone_jobs[0]["phone_display"] if phone_jobs else "?"

    def log_ok(msg: str) -> None:
        _safe_print(lambda: ok(msg))

    def log_fail(msg: str) -> None:
        _safe_print(lambda: fail(msg))

    def log_warn(msg: str) -> None:
        _safe_print(lambda: warn(msg))

    def log_info(msg: str) -> None:
        _safe_print(lambda: info(msg))

    _safe_print(lambda: print(f"\n{Colors.BOLD}📱 {phone_label}{Colors.RESET}"))

    for job in phone_jobs:
        label = f"{job['phone_display']} → {job['child']} → {job['template']}"
        if not force and approved and job["template"] not in approved:
            log_warn(f"SKIP (not APPROVED): {label}")
            skipped += 1
            continue

        if dry_run:
            log_info(f"[dry-run] {label}")
            sent += 1
            continue

        try:
            lang = meta_lang
            meta_tpl = get_meta_template_status(c, job["template"])
            if meta_tpl:
                lang = meta_tpl.get("language", lang)
            result = send_template_message(
                c, job["template"], job["phone"], job["params"], lang
            )
            msg_id = result.get("messages", [{}])[0].get("id", "n/a")
            log_ok(f"{label} — {msg_id}")
            sent += 1
            time.sleep(delay)
        except RuntimeError as e:
            log_fail(f"{label} — {e}")
            failed += 1
            if stop_on_error:
                break

    return sent, failed, skipped


def cmd_send_demo(args: argparse.Namespace) -> int:
    c = cfg()
    if not args.dry_run and (not c["access_token"] or not c["phone_number_id"]):
        fail("Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env")
        return 1

    jobs = iter_demo_messages(args.phone, args.child, args.scenario)
    if not jobs:
        fail("No messages match filters — check test_recipients.json")
        return 1

    meta = load_templates()
    approved: set[str] = set()
    if not args.dry_run and not args.force:
        try:
            resp = api_request(
                "GET",
                f"{c['api_version']}/{c['waba_id']}/message_templates",
                c["access_token"],
                c["api_base"],
                params={"limit": "250"},
            )
            for t in resp.get("data", []):
                if t.get("status") == "APPROVED":
                    approved.add(t["name"])
        except RuntimeError as e:
            warn(f"Could not fetch approved templates: {e}")

    delay = args.delay if args.delay else default_send_delay()
    by_phone = group_jobs_by_phone(jobs)
    mode = "PARALLEL (one thread per number)" if args.parallel else "SEQUENTIAL (one number at a time)"
    print(f"\n{Colors.BOLD}Sending {len(jobs)} demo message(s) across {len(by_phone)} number(s){Colors.RESET}")
    info(f"Mode: {mode}")
    info(f"Delay within each number: {delay}s between messages\n")

    sent = failed = skipped = 0

    if args.parallel:
        workers = min(len(by_phone), args.workers)
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(
                    send_jobs_for_phone,
                    c, phone_jobs, approved, meta["language"], delay,
                    dry_run=args.dry_run, force=args.force, stop_on_error=args.stop_on_error,
                ): phone
                for phone, phone_jobs in by_phone.items()
            }
            for fut in as_completed(futures):
                s, f, sk = fut.result()
                sent += s
                failed += f
                skipped += sk
    else:
        for i, (phone, phone_jobs) in enumerate(by_phone.items()):
            if i > 0:
                info(f"Pausing {delay * 2}s before next recipient...")
                if not args.dry_run:
                    time.sleep(delay * 2)
            s, f, sk = send_jobs_for_phone(
                c, phone_jobs, approved, meta["language"], delay,
                dry_run=args.dry_run, force=args.force, stop_on_error=args.stop_on_error,
            )
            sent += s
            failed += f
            skipped += sk
            if args.stop_on_error and f > 0:
                break

    print(f"\nDone: {sent} sent, {skipped} skipped, {failed} failed")
    if failed:
        warn("Register all numbers in Meta sandbox: API Setup → Manage phone number list")
    return 0 if failed == 0 else 1


def verify_webhook_signature(payload: bytes, signature_header: str, app_secret: str) -> bool:
    if not signature_header or not app_secret:
        return False
    expected_prefix = "sha256="
    if not signature_header.startswith(expected_prefix):
        return False
    received = signature_header[len(expected_prefix):]
    computed = hmac.new(
        app_secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(received, computed)


def cmd_webhook(args: argparse.Namespace) -> int:
    c = cfg()
    port = args.port
    verify_token = c["webhook_verify_token"]
    app_secret = c["app_secret"]

    class WebhookHandler(BaseHTTPRequestHandler):
        def log_message(self, fmt: str, *args: Any) -> None:
            print(f"[webhook] {self.address_string()} — {fmt % args}")

        def do_GET(self) -> None:
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path not in ("/", "/webhook"):
                self.send_response(404)
                self.end_headers()
                return

            qs = urllib.parse.parse_qs(parsed.query)
            mode = qs.get("hub.mode", [""])[0]
            token = qs.get("hub.verify_token", [""])[0]
            challenge = qs.get("hub.challenge", [""])[0]

            if mode == "subscribe" and token == verify_token:
                ok(f"Webhook verified — returning challenge")
                self.send_response(200)
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
                self.wfile.write(challenge.encode("utf-8"))
            else:
                fail(f"Verification failed — mode={mode}, token mismatch")
                self.send_response(403)
                self.end_headers()

        def do_POST(self) -> None:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            sig = self.headers.get("X-Hub-Signature-256", "")

            if app_secret:
                if verify_webhook_signature(body, sig, app_secret):
                    ok("Signature valid (X-Hub-Signature-256)")
                else:
                    fail("Invalid webhook signature — check WHATSAPP_APP_SECRET")
            else:
                warn("WHATSAPP_APP_SECRET not set — skipping signature check")

            try:
                payload = json.loads(body.decode("utf-8"))
            except json.JSONDecodeError:
                payload = {"raw": body.decode("utf-8", errors="replace")}

            print(f"\n{Colors.BOLD}Webhook payload:{Colors.RESET}")
            print(json.dumps(payload, indent=2))

            # Parse useful events
            for entry in payload.get("entry", []):
                for change in entry.get("changes", []):
                    field = change.get("field")
                    value = change.get("value", {})
                    if field == "messages":
                        for status in value.get("statuses", []):
                            info(
                                f"Message {status.get('id')}: {status.get('status')} "
                                f"→ {status.get('recipient_id')}"
                            )
                            pricing = status.get("pricing", {})
                            if pricing:
                                info(f"  billing: {json.dumps(pricing)}")
                    elif field == "message_template_status_update":
                        ev = value.get("event")
                        info(
                            f"Template {value.get('message_template_name')}: {ev} "
                            f"— {value.get('reason', '')}"
                        )

            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"OK")

    print(f"\n{Colors.BOLD}Webhook server on http://localhost:{port}/webhook{Colors.RESET}")
    info(f"Verify token: {verify_token}")
    info("Expose with: ngrok http " + str(port))
    info("Meta callback URL: https://<your-ngrok>.ngrok.io/webhook\n")
    HTTPServer(("0.0.0.0", port), WebhookHandler).serve_forever()
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Vitana SMS WhatsApp Cloud API test toolkit",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("setup", help="Print Meta sandbox setup instructions").set_defaults(
        func=cmd_setup
    )
    sub.add_parser("check", help="Verify API credentials").set_defaults(func=cmd_check)

    tpl = sub.add_parser("templates", help="Template operations")
    tpl_sub = tpl.add_subparsers(dest="tpl_command", required=True)
    tpl_sub.add_parser("list", help="List template status on Meta").set_defaults(
        func=cmd_templates_list, tpl_command="list"
    )
    reg = tpl_sub.add_parser("register", help="Submit templates to Meta for approval")
    reg.add_argument("--only", help="Register a single template by name")
    reg.add_argument("--dry-run", action="store_true", help="Print payloads without calling API")
    reg.set_defaults(func=cmd_templates_register, tpl_command="register")

    send_now = sub.add_parser(
        "send-now",
        help="Send Meta built-in hello_world to all test numbers (works immediately)",
    )
    send_now.add_argument("--to", help="Single recipient")
    send_now.add_argument("--template", default="hello_world", help="Built-in template name")
    send_now.add_argument("--delay", type=int, default=DEFAULT_SEND_DELAY)
    send_now.set_defaults(func=cmd_send_now)

    ping = sub.add_parser("ping", help="Send hello_world to verify API + recipient (works immediately)")
    ping.add_argument("--to", help="Recipient e.g. 919810861740")
    ping.add_argument("--all-phones", action="store_true", help="Ping every number in test_recipients.json")
    ping.set_defaults(func=cmd_ping)

    vitana_test = sub.add_parser(
        "vitana-test",
        help="Send 'This is a test message for Vitana SMS' (vitana_sms_test template)",
    )
    vitana_test.add_argument("--to", help="Single recipient e.g. 9810861740")
    vitana_test.add_argument("--child", help="Student name for {{2}} e.g. 'Vedant Singh'")
    vitana_test.add_argument("--dry-run", action="store_true")
    vitana_test.add_argument("--delay", type=int, default=DEFAULT_SEND_DELAY)
    vitana_test.add_argument("--skip-register", action="store_true")
    vitana_test.set_defaults(func=cmd_vitana_test)

    samples = sub.add_parser("send-samples", help="One sample message to each test number")
    samples.add_argument("--phone", help="Limit to one phone e.g. 7984177071")
    samples.add_argument("--child", help="Limit to one child")
    samples.add_argument("--dry-run", action="store_true")
    samples.add_argument("--delay", type=int, default=DEFAULT_SEND_DELAY)
    samples.add_argument("--parallel", action="store_true", help="Send to all numbers at the same time")
    samples.add_argument("--workers", type=int, default=4, help="Parallel threads (default 4)")
    samples.set_defaults(func=cmd_send_samples)

    send = sub.add_parser("send", help="Send one approved template")
    send.add_argument("--template", required=True, help="Template name e.g. fee_due_reminder")
    send.add_argument("--to", help="Recipient E.164 without + e.g. 919876543210")
    send.add_argument("--dry-run", action="store_true")
    send.set_defaults(func=cmd_send)

    send_all = sub.add_parser("send-all", help="Send all APPROVED templates (test suite)")
    send_all.add_argument("--to", help="Recipient phone")
    send_all.add_argument("--dry-run", action="store_true")
    send_all.add_argument("--force", action="store_true", help="Send even if not APPROVED")
    send_all.set_defaults(func=cmd_send_all)

    def add_demo_filters(p: argparse.ArgumentParser) -> None:
        p.add_argument("--phone", help="Filter by phone e.g. 9810861740 or 919810861740")
        p.add_argument("--child", help="Filter by child e.g. manisha, vedant, revanth")
        p.add_argument("--scenario", help="Filter: normal, complaint_warnings, mixed, general")

    demo = sub.add_parser("demo", help="Personalized test messages (test_recipients.json)")
    demo_sub = demo.add_subparsers(dest="demo_command", required=True)
    demo_list = demo_sub.add_parser("list", help="Preview messages per phone/child")
    add_demo_filters(demo_list)
    demo_list.set_defaults(func=cmd_list_demo)
    demo_send = demo_sub.add_parser("send", help="Send configured demo messages")
    add_demo_filters(demo_send)
    demo_send.add_argument("--dry-run", action="store_true")
    demo_send.add_argument("--force", action="store_true", help="Send even if template not APPROVED")
    demo_send.add_argument("--delay", type=int, default=DEFAULT_SEND_DELAY, help=f"Seconds between messages (default {DEFAULT_SEND_DELAY})")
    demo_send.add_argument("--parallel", action="store_true", help="All numbers in parallel (each number still sequential)")
    demo_send.add_argument("--workers", type=int, default=4, help="Max parallel numbers (default 4)")
    demo_send.add_argument("--stop-on-error", action="store_true")
    demo_send.set_defaults(func=cmd_send_demo)

    # Aliases
    list_demo = sub.add_parser("list-demo", help=argparse.SUPPRESS)
    add_demo_filters(list_demo)
    list_demo.set_defaults(func=cmd_list_demo)
    send_demo = sub.add_parser("send-demo", help=argparse.SUPPRESS)
    add_demo_filters(send_demo)
    send_demo.add_argument("--dry-run", action="store_true")
    send_demo.add_argument("--force", action="store_true")
    send_demo.add_argument("--delay", type=int, default=DEFAULT_SEND_DELAY)
    send_demo.add_argument("--parallel", action="store_true")
    send_demo.add_argument("--workers", type=int, default=4)
    send_demo.add_argument("--stop-on-error", action="store_true")
    send_demo.set_defaults(func=cmd_send_demo)

    webhook = sub.add_parser("webhook", help="Local webhook receiver for Meta callbacks")
    webhook.add_argument("--port", type=int, default=8765)
    webhook.set_defaults(func=cmd_webhook)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
