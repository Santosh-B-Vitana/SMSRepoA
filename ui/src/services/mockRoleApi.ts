// src/services/mockRoleApi.ts
// Mock API for role-based permissions

export type Permission = {
  name: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type Role = {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  permissions: Permission[];
};

// Initial mock data
let roles: Role[] = [
  {
    id: '1',
    name: 'Administrator',
    description: 'for admins',
    active: true,
    permissions: [
      { name: 'Dashboard', canView: true, canAdd: false, canEdit: false, canDelete: false },
      { name: 'User Management', canView: true, canAdd: true, canEdit: true, canDelete: true },
      { name: 'Settings', canView: true, canAdd: false, canEdit: true, canDelete: false },
    ],
  },
  {
    id: '2',
    name: 'Student',
    description: 'for students',
    active: true,
    permissions: [
      { name: 'Dashboard', canView: true, canAdd: false, canEdit: false, canDelete: false },
      { name: 'User Management', canView: false, canAdd: false, canEdit: false, canDelete: false },
      { name: 'Settings', canView: true, canAdd: false, canEdit: false, canDelete: false },
    ],
  },
  // Add more roles as needed
];

export const mockRoleApi = {
  getRoles: async (): Promise<Role[]> => {
    return new Promise((resolve) => setTimeout(() => resolve([...roles]), 300));
  },
  getRole: async (id: string): Promise<Role | undefined> => {
    return new Promise((resolve) => setTimeout(() => resolve(roles.find(r => r.id === id)), 300));
  },
  updateRole: async (id: string, updated: Partial<Role>): Promise<Role | undefined> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        roles = roles.map(r => r.id === id ? { ...r, ...updated } : r);
        resolve(roles.find(r => r.id === id));
      }, 300);
    });
  },
  addRole: async (role: Role): Promise<Role> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        roles.push(role);
        resolve(role);
      }, 300);
    });
  },
  deleteRole: async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        roles = roles.filter(r => r.id !== id);
        resolve();
      }, 300);
    });
  },
};
