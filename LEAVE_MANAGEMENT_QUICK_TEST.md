# 🎯 QUICK REFERENCE - Test Now!

## 🚀 THREE LIVE PORTALS - Test Immediately!

### 1️⃣ **ADMIN DASHBOARD**
**URL**: `http://localhost:8081/admin-leave-management`

**Test Credentials**:
- Email: `admin@vitanaschools.edu`
- Password: `admin-dev-change-me`

**What You'll See**:
✅ Statistics dashboard (Pending, Approved, Rejected, Approval Rate)
✅ Advanced filters (Type, Status, Leave Type, Date Range, Search)
✅ Leave requests table with approve/reject buttons
✅ Direct marking form (+ button)
✅ Real-time updates

**What You Can Do**:
- 📊 View all pending leave requests
- 🔍 Filter by multiple criteria
- ✅ Approve requests with remarks
- ❌ Reject requests with reason
- ➕ Mark leave directly for staff
- 📈 See approval statistics

---

### 2️⃣ **STAFF PORTAL**
**URL**: `http://localhost:8081/leave-management`

**Test Credentials** (Switch to "Staff Portal" tab first):
- Email: `suresh.n@demo.edu`
- Password: `StaffDemo2026!`

**What You'll See**:
✅ Leave balance cards (per leave type)
✅ Apply for leave form (inline)
✅ Leave request history
✅ Real-time balance updates
✅ Approval status tracking

**What You Can Do**:
- 💼 View balance for each leave type
- 📝 Apply for leave in 2 minutes
- 🔍 Track request status
- 📋 See all historical requests
- ✓ Get approval confirmations

---

### 3️⃣ **PARENT PORTAL** (NEW!)
**URL**: `http://localhost:8081/student-leave-request`

**Test Credentials**:
- Email: `parent@demo.edu`
- Password: `ParentDemo2026!`

**What You'll See**:
✅ Children's leave balance cards
✅ Leave request form
✅ Document upload area
✅ Notification center
✅ Leave history table

**What You Can Do**:
- 👨‍👩‍👧 View all children's leave balance
- 📝 Request leave for each child
- 📄 Upload medical certificates
- 🔔 Get approval notifications
- 📋 Track request history

---

## 🎯 Test Workflows (5 minutes each)

### Test 1: Admin Dashboard (3 min)
```
1. Login as admin
2. Go to /admin-leave-management
3. View dashboard (should show 1-5 pending)
4. Try filters:
   ✓ Change "Request Type" 
   ✓ Change "Status"
   ✓ Try date range filter
5. Click on a request row
6. See the approve/reject dialog
```

### Test 2: Staff Request (3 min)
```
1. Login as staff (Suresh Nair)
2. Go to /leave-management
3. See balance cards
4. Click "Apply for Leave"
5. Fill form:
   - Leave Type: Select any
   - Start: Any future date
   - End: 2-3 days later
   - Reason: Type something
6. See balance check (green = OK)
7. Click "Submit Request"
8. See request in history as "Pending"
```

### Test 3: Admin Approves (1 min)
```
1. Go to /admin-leave-management
2. Find the pending request
3. Click approve button
4. Add remark: "Approved"
5. Confirm
6. Status should change to "APPROVED"
```

### Test 4: Staff Sees Update (30 sec)
```
1. Go back to /leave-management
2. Refresh page
3. See request now shows "APPROVED"
4. Balance should have updated
```

### Test 5: Direct Marking (2 min)
```
1. In /admin-leave-management
2. Click "Mark Leave Directly" (+) button
3. Select staff member from dropdown
4. Select leave type
5. Pick date range
6. Add remark
7. Click "Mark Leave"
8. Should auto-approve immediately
```

---

## ✅ Verify Everything Works

| Feature | Where to Test | Expected Result |
|---------|--------------|-----------------|
| Admin Dashboard | `/admin-leave-management` | See stats & table |
| Staff Portal | `/leave-management` | See balance cards |
| Parent Portal | `/student-leave-request` | See children cards |
| Apply Leave | Staff portal | Form submits, appears as Pending |
| Approve Request | Admin dashboard | Status changes to Approved |
| Direct Marking | Admin dashboard | Creates & auto-approves leave |
| Filters | Admin dashboard | Table updates with filters |
| Real-time Update | Staff portal after approval | Balance updates |

---

## 🆘 Troubleshooting

**Issue**: Page shows blank/loading forever
- **Solution**: Refresh page, check browser console for errors

**Issue**: Can't login with demo credentials
- **Solution**: Clear browser cache, try incognito mode

**Issue**: Leave request doesn't show up
- **Solution**: Refresh page, check if you're using correct email

**Issue**: Approval doesn't update staff balance
- **Solution**: Refresh page, check backend API logs

**Issue**: Can't see "Mark Leave Directly" button
- **Solution**: Make sure you're logged in as admin, button is (+) icon

---

## 📊 What the System Does (Behind the Scenes)

✅ **Real-time Balance Calculation**
   - Tracks: Allocated Days - Used Days - Pending Days = Remaining Days
   - Updates instantly on approval
   - Shows visual progress bars

✅ **Approval Workflow**
   - Staff/Parent submits request
   - Admin reviews in dashboard
   - Admin approves with remarks
   - Requestor sees instant notification
   - Attendance system updates automatically

✅ **Direct Marking for Accessibility**
   - For staff without digital skills
   - Admin marks leave on their behalf
   - Creates audit trail
   - Auto-approves immediately
   - Records admin signature & date

✅ **Multi-Role Support**
   - Staff see only their requests
   - Admins see all requests
   - Parents see only their children
   - Each role gets appropriate features

---

## 🎨 UI/UX Highlights

✨ **Modern Design**
   - Clean, professional interface
   - Color-coded status badges (Green=Approved, Amber=Pending, Red=Rejected)
   - Responsive across mobile/tablet/desktop
   - Dark mode support

⚡ **Fast Performance**
   - Memoized filtering (no lag)
   - Lazy loading components
   - Real-time updates
   - Optimistic UI updates

♿ **Accessible**
   - WCAG AA compliant
   - Keyboard navigation
   - Screen reader friendly
   - ARIA labels throughout

---

## 📈 Next Steps After Testing

1. **Works Great?** → Go Live!
   - Deploy to production
   - Monitor performance
   - Collect feedback

2. **Issues Found?** → Review Logs
   - Check browser console
   - Check backend API logs
   - Verify database queries

3. **API Not Working?** → Verify Backend
   - Check if API endpoints exist
   - Verify database schema
   - Test API directly with Postman

4. **Want More Features?** → Easy to Add
   - Email notifications
   - Calendar view
   - Analytics dashboard
   - Recurring leaves
   - Leave carry-forward

---

## 💡 Pro Tips

✅ **For Testing**:
- Use Firefox DevTools for better error messages
- Check "Console" tab for any JavaScript errors
- Use "Network" tab to see API calls

✅ **For Admin Users**:
- Use filters to quickly find requests
- Add detailed remarks for documentation
- Use direct marking for staff accessibility

✅ **For Staff**:
- Check balance before requesting
- Provide clear reason for leave
- Track status in history

✅ **For Parents**:
- Upload documents to speed up approval
- Check notifications regularly
- Use emergency contact for urgent cases

---

**Ready to Test?** → Open your browser and go to: **`http://localhost:8081/admin-leave-management`**

**Demo Credentials**: `admin@vitanaschools.edu` / `admin-dev-change-me`

🚀 **LET'S GO!**
