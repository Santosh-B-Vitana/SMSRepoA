# Leave Management System - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Verify Components are in Place
All components should be located at:
```
✅ ui/src/components/leave/AdminLeaveManagementEnhanced.tsx
✅ ui/src/components/leave/StaffLeaveManagerEnhanced.tsx
✅ ui/src/components/leave/ParentStudentLeaveRequest.tsx
```

### 2. Verify Pages are Updated
```
✅ ui/src/pages/LeaveManagement.tsx → Uses StaffLeaveManagerEnhanced
✅ ui/src/pages/AdminLeaveManagement.tsx → Uses AdminLeaveManagementEnhanced
✅ ui/src/pages/StudentLeaveRequest.tsx → Uses ParentStudentLeaveRequest
```

### 3. Verify Routes are Configured
Ensure your React Router has these routes:
```typescript
// In your router configuration
<Route path="/leave-management" element={<LeaveManagementPage />} />
<Route path="/admin-leave-management" element={<AdminLeaveManagementPage />} />
<Route path="/student-leave-request" element={<StudentLeaveRequestPage />} />
```

### 4. Verify API Endpoints
Backend must provide (or these will be mocked):
```
✅ GET  /api/attendance/leave-requests
✅ POST /api/attendance/leave-requests
✅ PUT  /api/attendance/leave-requests/{id}/approve
✅ PUT  /api/attendance/leave-requests/{id}/reject
✅ GET  /api/attendance/leave-types
```

### 5. Demo Credentials (if using mock data)
```
Admin Login:
  Email:    admin@vitanaschools.edu
  Password: admin-dev-change-me
  Role:     Admin

Staff Login:
  Email:    staff@vitanaschools.edu
  Password: staff-password
  Role:     Staff

Parent Login:
  Email:    parent@vitanaschools.edu
  Password: parent-password
  Role:     Parent
```

## 🎯 Testing the System

### Test Scenario 1: Staff Leave Request
```
1. Start dev server: npm run dev (port 8081)
2. Navigate to http://localhost:8081
3. Login as staff member
4. Go to /leave-management
5. View leave balance cards
6. Click "Apply for Leave"
7. Fill form and submit
8. Logout
9. Login as admin
10. Go to /admin-leave-management
11. Find the pending request
12. Click approve with remarks
13. Login as staff again
14. Verify status changed to "Approved"
15. Verify balance updated
```

### Test Scenario 2: Direct Marking
```
1. Login as admin
2. Go to /admin-leave-management
3. Click "Mark Leave Directly" (+) button
4. Select a staff member
5. Select leave type
6. Choose date range
7. Add admin remark
8. Click "Mark Leave"
9. Verify leave appears with "Approved" status
10. Staff's balance should update
```

### Test Scenario 3: Student Leave Request
```
1. Login as parent
2. Go to /student-leave-request
3. View children's leave balances
4. Click "Request Leave" on child's card
5. Fill leave request form
6. Upload document (if needed)
7. Submit
8. Logout
9. Login as admin
10. Go to /admin-leave-management
11. Filter: Request Type = "Student"
12. Find parent's request
13. Review and approve
14. Parent receives notification
```

## 📊 Key Features to Test

| Feature | Path | Action | Expected Result |
|---------|------|--------|-----------------|
| View Balance | /leave-management | Load page | Shows balance cards with used/pending/remaining |
| Submit Request | /leave-management | Fill form & submit | Request created with "Pending" status |
| Admin Dashboard | /admin-leave-management | Load page | Shows stats & pending requests |
| Approve Request | /admin-leave-management | Click approve | Status updates to "Approved" |
| Direct Marking | /admin-leave-management | Use (+) button | Creates & auto-approves leave |
| Parent Request | /student-leave-request | Submit form | Creates request for child |
| Filter Requests | /admin-leave-management | Use filters | Shows only matching requests |
| View History | /leave-management | Expand request | Shows full details & remarks |

## 🛠️ Development Tasks

### Task 1: Hook Up Real API
Update `leaveManagementApi.ts` if using mock data:
```typescript
// Replace mock data with real API calls
export const getLeaveRequests = async (page: number, limit: number) => {
  const response = await fetch(`${API_BASE}/attendance/leave-requests?page=${page}&limit=${limit}`);
  return response.json();
};
```

### Task 2: Add Email Notifications
Create notification service:
```typescript
// services/notificationService.ts
export const notifyLeaveApproved = (staffEmail: string, leaveDetails: any) => {
  // Send email via backend endpoint
};
```

### Task 3: Create E2E Tests
Using Playwright (tests already exist for staff module):
```typescript
// ui/e2e/leave-management.spec.ts
test('Staff can request and admin can approve leave', async ({ page }) => {
  // Staff request leave
  // Admin approve
  // Verify balance updated
});
```

### Task 4: Add Calendar View
Create new component for visual leave calendar:
```typescript
// ui/src/components/leave/LeaveCalendar.tsx
export function LeaveCalendar() {
  // Month view with marked days
  // Drag to select range
  // Color code: approved, pending, rejected
}
```

### Task 5: Integrate with Attendance
Update attendance logic:
```typescript
// When leave is approved, mark attendance as "On Leave"
// Exclude leave days from attendance calculations
// Update payroll if unpaid leave
```

## 📝 Code Structure Overview

### Component Hierarchy
```
AdminLeaveManagementEnhanced
├── Stats Grid (4 cards)
├── Filter Row (5 integrated filters)
├── Leave Request Table
│   └── Approval Dialog
│   └── Direct Marking Dialog
└── Toast Notifications

StaffLeaveManagerEnhanced
├── Header with "Apply for Leave" button
├── Leave Balance Cards (per type)
│   └── Progress bars (used/pending/remaining)
├── Leave Request Form
│   ├── Leave type pills
│   ├── Date picker
│   ├── Duration preview
│   └── Reason textarea
├── Stats Grid
└── Leave History
    └── Expandable Details

ParentStudentLeaveRequest
├── Student Balance Cards
│   └── Quick "Request Leave" button
├── Leave Request Dialog
│   ├── Child selector
│   ├── Leave type picker
│   ├── Date range
│   ├── Document upload
│   └── Balance check
├── Notifications Center
└── Leave History Table
```

### State Management Pattern
```typescript
// All components follow this pattern:
const [data, setData] = useState([]);        // Fetched data
const [loading, setLoading] = useState(true); // Loading state
const [submitting, setSubmitting] = useState(false); // Form submit
const [formData, setFormData] = useState({});  // Form state

// Fetch on mount
useEffect(() => {
  fetchData();
}, []);

// Handle submit
const handleSubmit = async () => {
  setSubmitting(true);
  try {
    await api.submit(formData);
    // Update list
    setData(prev => [newItem, ...prev]);
  } finally {
    setSubmitting(false);
  }
};
```

## 🎨 Styling & Theme

All components use:
- **Shadcn UI** components for consistency
- **Tailwind CSS** for responsive design
- **Lucide Icons** for visual indicators
- **Dark mode** support via CSS variables

Key color scheme:
- **Pending**: Amber (#f59e0b)
- **Approved**: Green (#10b981)
- **Rejected**: Red (#ef4444)
- **Primary**: Blue (customizable)

## 📱 Responsive Behavior

| Screen Size | Behavior |
|-------------|----------|
| Mobile <768px | Single column, collapsible form, large buttons |
| Tablet 768-1024px | 2 columns for cards, stacked layout |
| Desktop >1024px | Full features, side-by-side layouts, modals |

## 🔍 Debugging Tips

### Issue: Leave balance not updating
**Solution**: Check if API response includes updated balance object

### Issue: Form validation errors not showing
**Solution**: Verify error Alert component is imported from shadcn/ui

### Issue: Filters not working
**Solution**: Check filter state is being applied to list before render

### Issue: Pagination not working
**Solution**: Verify pageSize parameter is passed to API correctly

## 📚 Documentation Files

```
✅ LEAVE_MANAGEMENT_DOCUMENTATION.md        - Full feature docs
✅ LEAVE_MANAGEMENT_IMPLEMENTATION_SUMMARY.md - What was built
✅ LEAVE_MANAGEMENT_QUICK_START.md          - This file
```

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All API endpoints are connected (not using mock data)
- [ ] Email notifications are configured
- [ ] Database migrations are applied
- [ ] Roles & permissions are set up correctly
- [ ] SSL/TLS is enabled
- [ ] Rate limiting is configured
- [ ] Error logging is active
- [ ] Backup strategy is in place
- [ ] Performance testing completed
- [ ] Security audit passed
- [ ] User training materials are ready
- [ ] Support documentation is complete

## 📞 Support Resources

- **Codebase**: `/ui/src/components/leave/`
- **API Docs**: Check backend service documentation
- **UI Library**: Shadcn UI - shadcn-ui.com
- **Icons**: Lucide React - lucide.dev
- **CSS Framework**: Tailwind CSS - tailwindcss.com

## 🎓 Training Topics

For administrators:
- How to approve/reject leave requests
- Direct marking for digital illiterate staff
- Using filters and search
- Viewing analytics and reports
- Configuring leave types
- Setting approval policies

For staff:
- How to request leave
- Understanding balance and pending days
- Uploading required documents
- Tracking request status
- Understanding approval timeline

For parents:
- How to request leave for children
- Checking available balance
- Uploading medical certificates
- Receiving approval notifications
- Leave history and tracking

---

**Next Step**: Run `npm run dev` and navigate to `/leave-management` to see the system in action!
