// src/services/permissionModules.ts
// Defines grouped modules and their relevant permissions for role configuration UI

export const PERMISSION_MODULES = [
  {
    group: 'Academic Management',
    modules: [
      'Dashboard',
      'Academics',
      'Class Management',
      'Timetable',
      'Assignments',
      'Grades',
      'Examinations',
      'Attendance',
      'Reports',
      'Analytics',
    ]
  },
  {
    group: 'Student & Staff Management',
    modules: [
      'Students',
      'Staff',
      'Admissions',
      'Alumni',
      'Leave Management',
    ]
  },
  {
    group: 'Resource Management',
    modules: [
      'Library',
      'Transport',
      'Store',
      'Hostel',
      'Health',
    ]
  },
  {
    group: 'Financial Management',
    modules: [
      'Fees',
      'Wallet',
      'Payroll',
    ]
  },
  {
    group: 'Communication & Engagement',
    modules: [
      'Communication',
      'Announcements',
      'School Connect',
      'Notifications',
      'Visitor Management',
    ]
  },
  {
    group: 'Documents & Records',
    modules: [
      'Documents',
      'ID Cards',
      'Certificates',
    ]
  },
  {
    group: 'System & Configuration',
    modules: [
      'Settings',
      'User Management',
      'Role Management',
    ]
  }
];
