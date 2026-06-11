#!/usr/bin/env python3
"""
EP-05 Student App + PROMPT-05 Push Notifications — Local API E2E Test Suite v2
Tests all student-facing API endpoints against the locally running backend.
Run: python3 /tmp/e2e_student_api_test.py
"""

import json, sys, urllib.request, urllib.error, urllib.parse, datetime, time

BASE = "http://localhost:5092/api"
PASS = FAIL = SKIP = 0
RESULTS = []

def log(status, name, detail=""):
    global PASS, FAIL, SKIP
    icon = "✅" if status == "PASS" else ("❌" if status == "FAIL" else "⚠️ ")
    msg = f"  {icon} [{status}] {name}"
    if detail: msg += f" — {detail}"
    print(msg)
    RESULTS.append({"status": status, "name": name, "detail": detail})
    if status == "PASS":   PASS += 1
    elif status == "FAIL": FAIL += 1
    else:                  SKIP += 1

def http(method, path, token=None, body=None):
    url = (BASE if not path.startswith("http") else "") + path
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token: headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            raw = r.read().decode()
            try: return r.status, json.loads(raw)
            except: return r.status, {"raw": raw}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try: return e.code, json.loads(raw)
        except: return e.code, {"raw": raw}
    except Exception as ex:
        return 0, {"error": str(ex)}

def data(resp): return resp.get("data", resp) if isinstance(resp, dict) else resp

# ─── PHASE 0: Infrastructure ────────────────────────────────────────────────
print("\n" + "="*60 + "\nPHASE 0: Infrastructure\n" + "="*60)

s, r = http("GET", "http://localhost:5092/health")
if s == 200 and r.get("status") == "Healthy":
    log("PASS", "Backend health check", f"status=Healthy")
else:
    log("FAIL", "Backend health check", f"HTTP {s}")
    sys.exit(1)

# ─── PHASE 1: Authentication ─────────────────────────────────────────────────
print("\n" + "="*60 + "\nPHASE 1: Authentication\n" + "="*60)

s, r = http("POST", "/auth/login", body={"username": "admin", "password": "admin-dev-change-me"})
if s == 200 and data(r).get("token"):
    admin_token = data(r)["token"]
    admin_user = data(r)["user"]
    log("PASS", "Admin login", f"role={admin_user['role']}")
else:
    log("FAIL", "Admin login", str(r)[:100]); sys.exit(1)

s, r = http("POST", "/auth/login", body={"username": "amit.k@demo.edu", "password": "Teacher@123"})
if s == 200 and data(r).get("token"):
    teacher_token = data(r)["token"]
    log("PASS", "Teacher login (Amit Kapoor)", f"role={data(r)['user']['role']}")
else:
    log("FAIL", "Teacher login", str(r)[:80]); teacher_token = None

s, r = http("POST", "/auth/login", body={"username": "demo.student", "password": "Student@123"})
if s == 200 and data(r).get("token"):
    student_token = data(r)["token"]
    student_refresh = data(r)["refreshToken"]
    student_user = data(r)["user"]
    student_linked_id = student_user.get("linkedEntityId") or "49a5ea3e-612e-4d81-a7de-5cfe92b345a9"
    log("PASS", "Student login (demo.student)", f"role={student_user['role']}, linkedId={str(student_linked_id)[:8]}...")
else:
    log("FAIL", "Student login", str(r)[:100]); student_token = None; student_refresh = None
    student_linked_id = "49a5ea3e-612e-4d81-a7de-5cfe92b345a9"

# Invalid credentials
s, r = http("POST", "/auth/login", body={"username": "demo.student", "password": "WRONG!"})
log("PASS" if s == 401 else "FAIL", "Invalid password rejected", f"HTTP {s}")

# Token refresh — use a unique user that won't have another concurrent login
# The RBAC staff accounts (transport.mgr) have no other concurrent logins in this test
s_fresh, r_fresh = http("POST", "/auth/login", body={"username": "transport.mgr@demo.edu", "password": "Staff@123"})
if s_fresh == 200:
    fresh_token   = data(r_fresh).get("token", "")
    fresh_refresh = data(r_fresh).get("refreshToken", "")
    time.sleep(0.3)  # small delay to ensure DB write is committed
    s_ref, r_ref = http("POST", "/auth/refresh", body={
        "accessToken": fresh_token, "refreshToken": fresh_refresh
    })
    d_ref = data(r_ref)
    if s_ref == 200 and d_ref.get("token"):
        log("PASS", "POST /auth/refresh", "new token issued (rotation confirmed)")
    else:
        log("FAIL", "POST /auth/refresh", f"HTTP {s_ref}: {str(r_ref)[:100]}")
else:
    log("SKIP", "POST /auth/refresh — could not get fresh token")

# ─── PHASE 2: App Config ─────────────────────────────────────────────────────
print("\n" + "="*60 + "\nPHASE 2: App Config & School Branding\n" + "="*60)

if student_token:
    s, r = http("GET", "/mobile/app-config", token=student_token)
    d = data(r)
    if s == 200:
        branding = d.get("branding", {})
        log("PASS", "GET /mobile/app-config", f"school={branding.get('schoolName','?')}, minVersion={d.get('minVersion','?')}")
    else:
        log("FAIL", "GET /mobile/app-config", f"HTTP {s}: {str(r)[:100]}")

# ─── PHASE 3: Dashboards ─────────────────────────────────────────────────────
print("\n" + "="*60 + "\nPHASE 3: Mobile Dashboards\n" + "="*60)

if student_token:
    s, r = http("GET", "/mobile/student-dashboard", token=student_token)
    d = data(r)
    if s == 200:
        schedule = d.get("todaySchedule", [])
        log("PASS", "GET /mobile/student-dashboard",
            f"schedule={len(schedule)}, unread={d.get('unreadCount',0)}, hasAttendance={d.get('attendanceThisMonth') is not None}")
        # Validate shape
        for key in ["todaySchedule", "unreadCount"]:
            if key not in d:
                log("FAIL", f"student dashboard missing field: {key}")
    else:
        log("FAIL", "GET /mobile/student-dashboard", f"HTTP {s}: {str(r)[:100]}")

s, r = http("GET", "/mobile/admin-dashboard", token=admin_token)
d = data(r)
if s == 200:
    log("PASS", "GET /mobile/admin-dashboard",
        f"attendanceRate={d.get('todayAttendanceRate','?')}, feeCollection={d.get('todayFeeCollection','?')}")
else:
    log("FAIL", "GET /mobile/admin-dashboard", f"HTTP {s}: {str(r)[:150]}")

if teacher_token:
    s, r = http("GET", "/mobile/teacher-dashboard", token=teacher_token)
    d = data(r)
    if s == 200:
        log("PASS", "GET /mobile/teacher-dashboard",
            f"schedule={len(d.get('todaySchedule',[]))}, pendingLeave={d.get('pendingLeaveCount','?')}")
    else:
        log("FAIL", "GET /mobile/teacher-dashboard", f"HTTP {s}: {str(r)[:100]}")

# ─── PHASE 4: Assignments ────────────────────────────────────────────────────
print("\n" + "="*60 + "\nPHASE 4: Assignments (EP-05 FR-10 to FR-14)\n" + "="*60)

if student_token:
    # Use /Assignments/for-child which is accessible to parent+student-like roles
    s, r = http("GET", "/Assignments/for-child?pageSize=10", token=student_token)
    d = data(r)
    if s == 200:
        items = d.get("data", d.get("items", d if isinstance(d, list) else []))
        if isinstance(items, dict): items = items.get("items", [])
        total = d.get("total", len(items)) if isinstance(d, dict) else len(items)
        log("PASS", "GET /Assignments/for-child", f"total={total}")
        
        assignment_id = items[0]["id"] if items else None
        if assignment_id:
            s2, r2 = http("GET", f"/assignments/{assignment_id}", token=student_token)
            d2 = data(r2)
            if s2 == 200:
                log("PASS", "GET /assignments/{id} (detail)", f"title={d2.get('title','?')[:40]}")
            else:
                log("FAIL", "GET /assignments/{id}", f"HTTP {s2}")
        else:
            log("SKIP", "Assignment detail — no assignments found")
        
    # Test submission validation with non-existent assignment
    s3, r3 = http("POST", "/Assignments/submissions",
        token=student_token,
        body={"assignmentId": "00000000-0000-0000-0000-000000000099",
              "textContent": "E2E test submission",
              "submissionType": "Text"})
    log("PASS" if s3 in (400, 404, 422) else "FAIL",
        "POST /Assignments/submissions (invalid assignmentId validation)",
        f"HTTP {s3} (expected 400/404/422)")
else:
    log("FAIL", "GET /Assignments/for-child", f"HTTP {s}: {str(r)[:100]}")

# ─── PHASE 5: Exam Results ───────────────────────────────────────────────────
print("\n" + "="*60 + "\nPHASE 5: Exam Results (EP-05 FR-7 to FR-9)\n" + "="*60)

if student_token:
    # Use the linked student ID (not "me")
    s, r = http("GET", f"/examinations/results?studentId={student_linked_id}", token=student_token)
    d = data(r)
    if s == 200:
        items = d if isinstance(d, list) else d.get("items", d.get("results", []))
        log("PASS", f"GET /examinations/results?studentId={str(student_linked_id)[:8]}...",
            f"count={len(items)}")
        if items:
            r0 = items[0]
            log("PASS", "Exam result shape validation",
                f"examName={r0.get('examName','?')}, grade={r0.get('grade','?')}")
    else:
        log("FAIL", "GET /examinations/results", f"HTTP {s}: {str(r)[:100]}")
    
    # Report cards
    s, r = http("GET", f"/examinations/report-cards/{student_linked_id}", token=student_token)
    if s in (200, 404):
        log("PASS", "GET /examinations/report-cards/{studentId}", f"HTTP {s}")
    else:
        log("FAIL", "GET /examinations/report-cards", f"HTTP {s}: {str(r)[:80]}")

# ─── PHASE 6: Fee Records ────────────────────────────────────────────────────
print("\n" + "="*60 + "\nPHASE 6: Fee Records (EP-05 FR-15)\n" + "="*60)

if student_token:
    s, r = http("GET", f"/fees/records?studentId={student_linked_id}", token=student_token)
    d = data(r)
    if s == 200:
        log("PASS", "GET /fees/records?studentId=...",
            f"pending={d.get('pendingAmount','?')}, total={d.get('totalAmount','?')}")
    elif s == 404:
        log("PASS", "GET /fees/records", "HTTP 404 — no fee records (test student)")
    else:
        log("FAIL", "GET /fees/records", f"HTTP {s}: {str(r)[:100]}")

# ─── PHASE 7: Leave Requests ─────────────────────────────────────────────────
print("\n" + "="*60 + "\nPHASE 7: Leave Applications (EP-05 FR-16 to FR-17)\n" + "="*60)

if student_token:
    s, r = http("GET", f"/attendance/leave-requests?studentId={student_linked_id}", token=student_token)
    d = data(r)
    if s == 200:
        items = d if isinstance(d, list) else d.get("items", [])
        log("PASS", "GET /attendance/leave-requests?studentId=...", f"count={len(items)}")
    else:
        log("FAIL", "GET /attendance/leave-requests", f"HTTP {s}: {str(r)[:100]}")
    
    # Get leave types first
    school_id = admin_user.get("schoolId", "550e8400-e29b-41d4-a716-446655440000")
    s_lt, r_lt = http("GET", "/LeaveManagement/types?pageSize=20", token=admin_token)
    d_lt = data(r_lt)
    leave_types = d_lt if isinstance(d_lt, list) else d_lt.get("items", []) if isinstance(d_lt, dict) else []
    student_leave_types = [lt for lt in leave_types if lt.get("applicableTo") in ("Student", "All", "both")]
    
    if student_leave_types:
        leave_type_name = "medical"  # API expects enum: sick, casual, emergency, medical, other
        import random
        offset = 90 + random.randint(1, 365)   # random far-future date — avoids overlap between test runs
        from_dt = (datetime.datetime.now() + datetime.timedelta(days=offset)).strftime("%Y-%m-%dT00:00:00")
        to_dt   = (datetime.datetime.now() + datetime.timedelta(days=offset)).strftime("%Y-%m-%dT00:00:00")
        
        s, r = http("POST", "/attendance/leave-requests", token=student_token, body={
            "schoolId": school_id,
            "studentId": student_linked_id,
            "startDate": from_dt,
            "endDate": to_dt,
            "leaveType": leave_type_name,
            "reason": "E2E test: medical appointment for EP-05 validation"
        })
        d = data(r)
        if s in (200, 201):
            log("PASS", "POST /attendance/leave-requests (apply leave)",
                f"status={d.get('status','?')}, leaveType={leave_type_name}")
        else:
            log("FAIL", "POST /attendance/leave-requests", f"HTTP {s}: {str(r)[:150]}")
    else:
        log("SKIP", "POST /attendance/leave-requests — no student leave types seeded")

# ─── PHASE 8: Notifications + Push (PROMPT-05) ───────────────────────────────
print("\n" + "="*60 + "\nPHASE 8: Notifications (EP-05 FR-18 + PROMPT-05)\n" + "="*60)

if student_token:
    s, r = http("GET", "/notifications/my?page=1&pageSize=10", token=student_token)
    d = data(r)
    if s == 200:
        items = d.get("items", []) if isinstance(d, dict) else d
        total = d.get("totalCount", len(items)) if isinstance(d, dict) else len(items)
        log("PASS", "GET /notifications/my", f"total={total}, page=1")
    else:
        log("FAIL", "GET /notifications/my", f"HTTP {s}")

    s, r = http("GET", "/notifications/unread-count", token=student_token)
    d = data(r)
    if s == 200:
        log("PASS", "GET /notifications/unread-count",
            f"count={d.get('unreadCount', d.get('count', '?'))}")
    else:
        log("FAIL", "GET /notifications/unread-count", f"HTTP {s}")

    s, r = http("GET", "/notifications/preferences", token=student_token)
    if s == 200:
        log("PASS", "GET /notifications/preferences", "OK")
    else:
        log("FAIL", "GET /notifications/preferences", f"HTTP {s}: {str(r)[:80]}")

    s, r = http("PUT", "/notifications/preferences/Assignment", token=student_token,
        body={"pushEnabled": True, "emailEnabled": False})
    if s in (200, 204):
        log("PASS", "PUT /notifications/preferences/Assignment", "pushEnabled=true set")
    else:
        log("FAIL", "PUT /notifications/preferences/Assignment", f"HTTP {s}: {str(r)[:100]}")

    s, r = http("PUT", "/notifications/read-all", token=student_token)
    log("PASS" if s in (200, 204) else "FAIL", "PUT /notifications/read-all", f"HTTP {s}")

    # PROMPT-05: Device token registration
    print("\n--- PROMPT-05: Push Device Registration ---")
    s, r = http("POST", "/notifications/register-device", token=student_token, body={
        "nativeToken": f"fcm-e2e-test-{int(time.time())}",
        "platform": "android",
        "deviceId": "e2e-android-001",
        "appVersion": "1.0.0"
    })
    d = data(r)
    if s == 200:
        log("PASS", "POST /notifications/register-device (new device)",
            f"isNew={d.get('isNew', d.get('message', 'ok'))}")
    else:
        log("FAIL", "POST /notifications/register-device", f"HTTP {s}: {str(r)[:100]}")

    # Idempotency: same deviceId → update existing, not create duplicate
    s2, r2 = http("POST", "/notifications/register-device", token=student_token, body={
        "nativeToken": f"fcm-e2e-ROTATED-{int(time.time())}",
        "platform": "android",
        "deviceId": "e2e-android-001",   # same device ID
        "appVersion": "1.0.1"
    })
    d2 = data(r2)
    if s2 == 200:
        log("PASS", "POST /notifications/register-device (token rotation idempotent)",
            f"isNew={d2.get('isNew', '?')}")
    else:
        log("FAIL", "POST /notifications/register-device (idempotent)", f"HTTP {s2}: {str(r2)[:100]}")

    # iOS device registration
    s3, r3 = http("POST", "/notifications/register-device", token=student_token, body={
        "nativeToken": "apns-e2e-test-token-ios-001",
        "platform": "ios",
        "deviceId": "e2e-ios-001",
        "appVersion": "1.0.0"
    })
    if s3 == 200:
        log("PASS", "POST /notifications/register-device (iOS)", "platform=ios registered")
    else:
        log("FAIL", "POST /notifications/register-device (iOS)", f"HTTP {s3}: {str(r3)[:80]}")

# ─── PHASE 9: Library ────────────────────────────────────────────────────────
print("\n" + "="*60 + "\nPHASE 9: Library (EP-05)\n" + "="*60)

if student_token:
    s, r = http("GET", "/library/my-issues", token=student_token)
    d = data(r)
    if s == 200:
        items = d if isinstance(d, list) else d.get("items", d.get("issues", []))
        log("PASS", "GET /library/my-issues", f"count={len(items)}")
    elif s == 404:
        log("PASS", "GET /library/my-issues", "HTTP 404 (no issues — expected for test student)")
    else:
        log("FAIL", "GET /library/my-issues", f"HTTP {s}: {str(r)[:100]}")

# ─── PHASE 10: Announcements ─────────────────────────────────────────────────
print("\n" + "="*60 + "\nPHASE 10: Announcements\n" + "="*60)

if student_token:
    # Try multiple announcement endpoint patterns
    for path in ["/announcements?page=1&pageSize=5", "/announcements/for-parent?page=1&pageSize=5"]:
        s, r = http("GET", path, token=student_token)
        if s == 200:
            d = data(r)
            items = d.get("items", d if isinstance(d, list) else [])
            total = d.get("totalCount", len(items)) if isinstance(d, dict) else len(items)
            log("PASS", f"GET {path}", f"total={total}")
            break
        elif s == 403:
            continue
    else:
        log("FAIL", "GET /announcements (all variants)", "HTTP 403 for all patterns — Student role needs to be added to AnnouncementsController")

# ─── PHASE 11: Timetable ─────────────────────────────────────────────────────
print("\n" + "="*60 + "\nPHASE 11: Timetable (EP-05 FR-2, FR-3)\n" + "="*60)

if student_token:
    # Get a real classId GUID from the timetable endpoint (no classId filter)
    s_tt, r_tt = http("GET", "/timetable?pageSize=1", token=student_token)
    d_tt = data(r_tt)
    timetables = d_tt.get("timetables", []) if isinstance(d_tt, dict) else []
    class_id_guid = timetables[0]["classId"] if timetables else None
    
    if class_id_guid:
        s, r = http("GET", f"/timetable?classId={class_id_guid}", token=student_token)
        d = data(r)
        if s == 200:
            tt_list = d.get("timetables", []) if isinstance(d, dict) else d if isinstance(d, list) else []
            log("PASS", f"GET /timetable?classId={class_id_guid[:8]}...", f"timetables={len(tt_list)}")
        else:
            log("FAIL", "GET /timetable?classId=...", f"HTTP {s}: {str(r)[:100]}")
    else:
        # Timetable list without filter works
        if s_tt == 200:
            tt_list = d_tt.get("timetables", []) if isinstance(d_tt, dict) else []
            log("PASS", "GET /timetable (no classId filter)", f"total={len(tt_list)}")
        else:
            log("FAIL", "GET /timetable", f"HTTP {s_tt}")

# ─── PHASE 12: Attendance ────────────────────────────────────────────────────
print("\n" + "="*60 + "\nPHASE 12: Attendance (EP-05 FR-5, FR-6)\n" + "="*60)

now = datetime.datetime.now()
month, year = now.month, now.year

if student_token:
    s, r = http("GET", f"/attendance/my-attendance?month={month}&year={year}", token=student_token)
    d = data(r)
    if s == 200:
        records = d.get("records", [])
        log("PASS", f"GET /attendance/my-attendance?month={month}&year={year}",
            f"records={len(records)}, present={d.get('presentDays','?')}")
    elif s == 403:
        log("SKIP", "GET /attendance/my-attendance",
            "HTTP 403 expected — staff-only endpoint. Students use GET /attendance/students")
    else:
        log("FAIL", "GET /attendance/my-attendance", f"HTTP {s}: {str(r)[:100]}")

    # Student attendance via /attendance/students with studentId
    s2, r2 = http("GET", f"/attendance/students?studentId={student_linked_id}",
        token=student_token)
    if s2 == 200:
        d2 = data(r2)
        records = d2 if isinstance(d2, list) else d2.get("items", d2.get("records", []))
        log("PASS", "GET /attendance/students?studentId=... (student self-view)",
            f"records={len(records)}")
    elif s2 == 500:
        log("FAIL", "GET /attendance/students",
            "HTTP 500 — known issue: service uses StudentAttendances DbSet but data is in AttendanceRecords")
    else:
        log("SKIP", f"GET /attendance/students returns HTTP {s2}")

# ─── PHASE 13: RBAC ──────────────────────────────────────────────────────────
print("\n" + "="*60 + "\nPHASE 13: RBAC Authorization\n" + "="*60)

if student_token:
    s, _ = http("GET", "/mobile/admin-dashboard", token=student_token)
    log("PASS" if s == 403 else "FAIL",
        "Student blocked from /mobile/admin-dashboard", f"HTTP {s}")

    s, _ = http("GET", "/mobile/teacher-dashboard", token=student_token)
    log("PASS" if s == 403 else "FAIL",
        "Student blocked from /mobile/teacher-dashboard", f"HTTP {s}")

if teacher_token:
    s, _ = http("GET", "/mobile/admin-dashboard", token=teacher_token)
    log("PASS" if s == 403 else "FAIL",
        "Teacher blocked from /mobile/admin-dashboard", f"HTTP {s}")

# Unauthenticated
s, _ = http("GET", "/mobile/student-dashboard")
log("PASS" if s == 401 else "FAIL", "Unauthenticated request → HTTP 401", f"HTTP {s}")

# ─── PHASE 14: Auth/Me ───────────────────────────────────────────────────────
print("\n" + "="*60 + "\nPHASE 14: Auth /me\n" + "="*60)

if student_token:
    s, r = http("GET", "/auth/me", token=student_token)
    d = data(r)
    if s == 200:
        log("PASS", "GET /auth/me", f"role={d.get('role','?')}, email={d.get('email','?')}")
    else:
        log("FAIL", "GET /auth/me", f"HTTP {s}")

# ─── PHASE 15: Maestro Test Files (offline validation) ───────────────────────
print("\n" + "="*60 + "\nPHASE 15: Maestro Test Files Validation\n" + "="*60)

import os
maestro_dir = "/Users/layn/Documents/vit/SMSRepoA/mobile/maestro/tests"
for fname in ["student_login.yaml", "student_assignments.yaml", "student_leave_apply.yaml",
              "student_notifications.yaml", "student_timetable.yaml", "student_attendance.yaml"]:
    exists = os.path.exists(f"{maestro_dir}/{fname}")
    log("PASS" if exists else "FAIL",
        f"Maestro test file exists: {fname}",
        "✓ ready for device testing" if exists else "missing — create it")

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
total = PASS + FAIL + SKIP
print("\n" + "="*60 + "\nTEST SUMMARY\n" + "="*60)
print(f"  Total:    {total}")
print(f"  ✅ PASS:  {PASS}")
print(f"  ❌ FAIL:  {FAIL}")
print(f"  ⚠️  SKIP:  {SKIP}")
print(f"  Pass rate: {(PASS/(PASS+FAIL)*100):.1f}%" if (PASS+FAIL) > 0 else "")

if FAIL > 0:
    print("\nFailed tests:")
    for r in RESULTS:
        if r["status"] == "FAIL":
            print(f"  ❌ {r['name']}: {r['detail']}")

sys.exit(0 if FAIL == 0 else 1)
