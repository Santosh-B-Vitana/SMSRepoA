/**
 * Shared constants used across all E2E tests and setup files.
 */

export const API_BASE_URL = process.env.VITE_API_BASE_URL ?? '';
export const APP_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8080';

export const ADMIN_CREDENTIALS = {
  email: 'admin@vitanaschools.edu',
  password: 'admin-dev-change-me',
};

export const STAFF_CREDENTIALS = {
  email: 'amit.k@demo.edu',
  password: 'Teacher@123',
};

// Pre-created class/section for test students
export const TEST_CLASS = '10';
export const TEST_SECTION = 'A';
export const TEST_ACADEMIC_YEAR = '2025-2026';

// Unique student that the enrollment E2E creates
export const TEST_STUDENT = {
  name: 'Arjun Sharma E2E',
  preferredName: 'Arjun',
  admissionNumber: 'E2E-2025-001',
  rollNumber: 'E2E-001',
  dateOfBirth: '2010-06-15',
  placeOfBirth: 'Delhi',
  gender: 'male',
  nationality: 'Indian',
  admissionDate: '2025-06-01',
  category: 'General',

  // Contact
  address: '42, Green Park Colony, New Delhi - 110016',
  primaryPhone: '9876543210',
  email: 'arjun.sharma.e2e@example.com',

  // Guardian
  guardianName: 'Ramesh Sharma',
  guardianPhone: '9876543211',
  guardianOccupation: 'Engineer',
  guardianEmail: 'ramesh.sharma@example.com',

  // Academic
  previousSchool: 'Delhi Public School, Rohini',
  previousClass: '9',
  transferReason: 'Family relocation',

  // Medical
  bloodGroup: 'O+',
  allergies: 'None',
  emergencyContact: 'Sunita Sharma',
  emergencyPhone: '9876543212',

  // Identification
  aadharNumber: '1234-5678-9012',
};

/** Unique suffix so parallel CI runs don't collide */
export const uniqueSuffix = () =>
  `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
