// Staff Service - Mock Implementation with Multi-Tenancy Support
// Replace with real API calls when integrating with backend

import { rateLimiter } from './rateLimiter';

export interface Staff {
  id: string;
  schoolId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  department: string;
  designation: string;
  qualification: string;
  experience: number; // years
  joiningDate: string;
  salary: number;
  address: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  status: 'active' | 'inactive' | 'on-leave';
  subjects?: string[];
  classes?: string[];
  profilePhoto?: string;
  documents?: {
    id: string;
    name: string;
    type: string;
    url: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffFilters {
  search?: string;
  department?: string;
  designation?: string;
  status?: 'active' | 'inactive' | 'on-leave';
  joiningDateFrom?: string;
  joiningDateTo?: string;
}

export interface PaginatedStaffResponse {
  data: Staff[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface CursorPaginatedStaffResponse {
  data: Staff[];
  pagination: {
    nextCursor?: string;
    hasMore: boolean;
    total: number;
  };
}

export interface StaffStats {
  totalStaff: number;
  activeStaff: number;
  onLeave: number;
  inactiveStaff: number;
  byDepartment: Record<string, number>;
  byDesignation: Record<string, number>;
  averageExperience: number;
}

// Mock data generator
const generateMockStaff = (schoolId: string, count: number = 50): Staff[] => {
  const departments = ['Academic', 'Administration', 'Support', 'Sports', 'Library'];
  const designations = ['Teacher', 'Head Teacher', 'Principal', 'Vice Principal', 'Librarian', 'Counselor', 'Lab Assistant'];
  const statuses: Array<'active' | 'inactive' | 'on-leave'> = ['active', 'active', 'active', 'active', 'on-leave', 'inactive'];

  return Array.from({ length: count }, (_, i) => ({
    id: `staff-${schoolId}-${i + 1}`,
    schoolId,
    employeeId: `EMP${String(i + 1).padStart(4, '0')}`,
    firstName: `First${i + 1}`,
    lastName: `Last${i + 1}`,
    email: `staff${i + 1}@school.com`,
    phone: `+1234567${String(i).padStart(4, '0')}`,
    dateOfBirth: new Date(1970 + (i % 30), i % 12, (i % 28) + 1).toISOString().split('T')[0],
    gender: i % 3 === 0 ? 'female' : i % 3 === 1 ? 'male' : 'other',
    department: departments[i % departments.length],
    designation: designations[i % designations.length],
    qualification: i % 2 === 0 ? 'M.Ed' : 'B.Ed',
    experience: (i % 20) + 1,
    joiningDate: new Date(2020 + (i % 5), i % 12, (i % 28) + 1).toISOString().split('T')[0],
    salary: 30000 + (i * 1000),
    address: `Address ${i + 1}, City, State`,
    emergencyContact: {
      name: `Emergency Contact ${i + 1}`,
      phone: `+9876543${String(i).padStart(4, '0')}`,
      relationship: i % 2 === 0 ? 'Spouse' : 'Parent'
    },
    status: statuses[i % statuses.length],
    subjects: i % 2 === 0 ? ['Mathematics', 'Physics'] : ['English', 'History'],
    classes: [`Class ${(i % 10) + 1}`],
    createdAt: new Date(2023, 0, 1).toISOString(),
    updatedAt: new Date().toISOString()
  }));
};

// In-memory store (replace with actual API calls)
const mockStaffStore = new Map<string, Staff[]>();

// Helper to get or create mock data for a school
const getSchoolStaff = (schoolId: string): Staff[] => {
  if (!mockStaffStore.has(schoolId)) {
    mockStaffStore.set(schoolId, generateMockStaff(schoolId, 150));
  }
  return mockStaffStore.get(schoolId)!;
};

// Apply filters to staff list
const applyFilters = (staff: Staff[], filters: StaffFilters): Staff[] => {
  let filtered = [...staff];

  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(s =>
      s.firstName.toLowerCase().includes(search) ||
      s.lastName.toLowerCase().includes(search) ||
      s.email.toLowerCase().includes(search) ||
      s.employeeId.toLowerCase().includes(search)
    );
  }

  if (filters.department) {
    filtered = filtered.filter(s => s.department === filters.department);
  }

  if (filters.designation) {
    filtered = filtered.filter(s => s.designation === filters.designation);
  }

  if (filters.status) {
    filtered = filtered.filter(s => s.status === filters.status);
  }

  if (filters.joiningDateFrom) {
    filtered = filtered.filter(s => s.joiningDate >= filters.joiningDateFrom!);
  }

  if (filters.joiningDateTo) {
    filtered = filtered.filter(s => s.joiningDate <= filters.joiningDateTo!);
  }

  return filtered;
};

// API Functions

// Get staff with offset pagination
export async function getStaff(
  schoolId: string,
  page: number = 1,
  limit: number = 20,
  filters: StaffFilters = {}
): Promise<PaginatedStaffResponse> {
  // Rate limiting
  if (!rateLimiter.checkLimit(`staff-${schoolId}`, 100)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const allStaff = getSchoolStaff(schoolId);
  const filtered = applyFilters(allStaff, filters);
  
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedData = filtered.slice(start, end);

  return {
    data: paginatedData,
    pagination: {
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
      hasMore: end < filtered.length
    }
  };
}

// Get staff with cursor pagination (more scalable)
export async function getStaffCursor(
  schoolId: string,
  limit: number = 20,
  cursor?: string,
  filters: StaffFilters = {}
): Promise<CursorPaginatedStaffResponse> {
  // Rate limiting
  if (!rateLimiter.checkLimit(`staff-${schoolId}`, 100)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const allStaff = getSchoolStaff(schoolId);
  const filtered = applyFilters(allStaff, filters);
  
  const startIndex = cursor ? filtered.findIndex(s => s.id === cursor) + 1 : 0;
  const paginatedData = filtered.slice(startIndex, startIndex + limit);
  
  const hasMore = startIndex + limit < filtered.length;
  const nextCursor = hasMore ? paginatedData[paginatedData.length - 1]?.id : undefined;

  return {
    data: paginatedData,
    pagination: {
      nextCursor,
      hasMore,
      total: filtered.length
    }
  };
}

// Get single staff member
export async function getStaffById(
  schoolId: string,
  staffId: string
): Promise<Staff | null> {
  // Rate limiting
  if (!rateLimiter.checkLimit(`staff-${schoolId}`, 100)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  await new Promise(resolve => setTimeout(resolve, 200));

  const allStaff = getSchoolStaff(schoolId);
  return allStaff.find(s => s.id === staffId && s.schoolId === schoolId) || null;
}

// Create staff member
export async function createStaff(
  schoolId: string,
  staffData: Omit<Staff, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
): Promise<Staff> {
  // Rate limiting
  if (!rateLimiter.checkLimit(`staff-${schoolId}`, 100)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  await new Promise(resolve => setTimeout(resolve, 400));

  const allStaff = getSchoolStaff(schoolId);
  
  const newStaff: Staff = {
    ...staffData,
    id: `staff-${schoolId}-${Date.now()}`,
    schoolId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  allStaff.push(newStaff);
  return newStaff;
}

// Update staff member
export async function updateStaff(
  schoolId: string,
  staffId: string,
  updates: Partial<Omit<Staff, 'id' | 'schoolId' | 'createdAt'>>
): Promise<Staff> {
  // Rate limiting
  if (!rateLimiter.checkLimit(`staff-${schoolId}`, 100)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  await new Promise(resolve => setTimeout(resolve, 400));

  const allStaff = getSchoolStaff(schoolId);
  const index = allStaff.findIndex(s => s.id === staffId && s.schoolId === schoolId);

  if (index === -1) {
    throw new Error('Staff member not found');
  }

  const updatedStaff = {
    ...allStaff[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  allStaff[index] = updatedStaff;
  return updatedStaff;
}

// Delete staff member
export async function deleteStaff(
  schoolId: string,
  staffId: string
): Promise<void> {
  // Rate limiting
  if (!rateLimiter.checkLimit(`staff-${schoolId}`, 100)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  await new Promise(resolve => setTimeout(resolve, 300));

  const allStaff = getSchoolStaff(schoolId);
  const index = allStaff.findIndex(s => s.id === staffId && s.schoolId === schoolId);

  if (index === -1) {
    throw new Error('Staff member not found');
  }

  allStaff.splice(index, 1);
}

// Bulk update staff (background job compatible)
export async function bulkUpdateStaff(
  schoolId: string,
  staffIds: string[],
  updates: Partial<Omit<Staff, 'id' | 'schoolId' | 'createdAt'>>
): Promise<{ updated: number; failed: number }> {
  // Rate limiting
  if (!rateLimiter.checkLimit(`staff-bulk-${schoolId}`, 20)) {
    throw new Error('Rate limit exceeded for bulk operations. Please try again later.');
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  const allStaff = getSchoolStaff(schoolId);
  let updated = 0;
  let failed = 0;

  for (const staffId of staffIds) {
    const index = allStaff.findIndex(s => s.id === staffId && s.schoolId === schoolId);
    if (index !== -1) {
      allStaff[index] = {
        ...allStaff[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      updated++;
    } else {
      failed++;
    }
  }

  return { updated, failed };
}

// Get staff statistics
export async function getStaffStats(schoolId: string): Promise<StaffStats> {
  // Rate limiting
  if (!rateLimiter.checkLimit(`staff-${schoolId}`, 100)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  await new Promise(resolve => setTimeout(resolve, 200));

  const allStaff = getSchoolStaff(schoolId);

  const byDepartment: Record<string, number> = {};
  const byDesignation: Record<string, number> = {};
  let totalExperience = 0;

  allStaff.forEach(staff => {
    byDepartment[staff.department] = (byDepartment[staff.department] || 0) + 1;
    byDesignation[staff.designation] = (byDesignation[staff.designation] || 0) + 1;
    totalExperience += staff.experience;
  });

  return {
    totalStaff: allStaff.length,
    activeStaff: allStaff.filter(s => s.status === 'active').length,
    onLeave: allStaff.filter(s => s.status === 'on-leave').length,
    inactiveStaff: allStaff.filter(s => s.status === 'inactive').length,
    byDepartment,
    byDesignation,
    averageExperience: allStaff.length > 0 ? totalExperience / allStaff.length : 0
  };
}
