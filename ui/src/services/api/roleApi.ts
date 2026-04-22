import apiClient from './apiClient';

const BASE = '/permissions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoleResponse {
  id: string;
  schoolId: string;
  name: string;
  displayName?: string;
  description?: string;
  roleType: 'System' | 'Custom';
  isSystemRole: boolean;
  isActive: boolean;
  userCount: number;
  permissionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleListResponse {
  roles: RoleResponse[];
  items: RoleResponse[];
  total: number;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PermissionResponse {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  module: string;
  action: string;
  resourcePattern?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PermissionGroupResponse {
  module: string;
  permissions: PermissionResponse[];
}

export interface UserWithRolesResponse {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  primaryRole: string;
  status: string;
  lastLogin?: string;
  createdAt: string;
  assignedRoles: Array<{
    id: string;
    name: string;
    displayName?: string;
    isActive: boolean;
  }>;
}

export interface UserListWithRolesResponse {
  users: UserWithRolesResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RoleStatsResponse {
  totalRoles: number;
  customRoles: number;
  systemRoles: number;
  totalUsersWithRoles: number;
  totalPermissions: number;
}

export interface CreateRoleDto {
  name: string;
  displayName?: string;
  description?: string;
}

export interface UpdateRoleDto {
  displayName?: string;
  description?: string;
  isActive?: boolean;
}

export interface UserRoleResponse {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  roleDisplayName?: string;
  validFrom?: string;
  validTo?: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Roles ────────────────────────────────────────────────────────────────────

const getRoles = async (params?: { page?: number; pageSize?: number }): Promise<RoleListResponse> => {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  const r = await apiClient.get<RoleListResponse>(`${BASE}/roles?${q}`);
  return r.data;
};

const getRoleById = async (id: string, schoolId: string): Promise<RoleResponse> => {
  const r = await apiClient.get<RoleResponse>(`${BASE}/roles/${id}/school/${schoolId}`);
  return r.data;
};

const createRole = async (dto: CreateRoleDto): Promise<RoleResponse> => {
  const r = await apiClient.post<RoleResponse>(`${BASE}/roles`, dto);
  return r.data;
};

const updateRole = async (id: string, dto: UpdateRoleDto): Promise<RoleResponse> => {
  const r = await apiClient.put<RoleResponse>(`${BASE}/roles/${id}`, dto);
  return r.data;
};

const deleteRole = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/roles/${id}`);
};

// ─── Permissions ──────────────────────────────────────────────────────────────

const getPermissionsGrouped = async (): Promise<PermissionGroupResponse[]> => {
  const r = await apiClient.get<PermissionGroupResponse[]>(`${BASE}/permissions/grouped`);
  return r.data;
};

const getRolePermissionIds = async (roleId: string): Promise<string[]> => {
  const r = await apiClient.get<string[]>(`${BASE}/roles/${roleId}/permissions/ids`);
  return r.data;
};

const setRolePermissions = async (roleId: string, permissionIds: string[]): Promise<void> => {
  await apiClient.put(`${BASE}/roles/${roleId}/permissions`, { permissionIds });
};

// ─── User-Role assignments ────────────────────────────────────────────────────

const getUsersWithRoles = async (params?: { page?: number; pageSize?: number }): Promise<UserListWithRolesResponse> => {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  const r = await apiClient.get<UserListWithRolesResponse>(`${BASE}/users-with-roles?${q}`);
  return r.data;
};

const getUserRoles = async (userId: string, schoolId: string): Promise<UserRoleResponse[]> => {
  const r = await apiClient.get<UserRoleResponse[]>(`${BASE}/user-roles/${userId}/school/${schoolId}`);
  return r.data;
};

const assignRoleToUser = async (userId: string, roleId: string): Promise<UserRoleResponse> => {
  const r = await apiClient.post<UserRoleResponse>(`${BASE}/user-roles`, { userId, roleId });
  return r.data;
};

const removeRoleFromUser = async (userId: string, roleId: string): Promise<void> => {
  await apiClient.delete(`${BASE}/user-roles/user/${userId}/role/${roleId}`);
};

// ─── Stats ────────────────────────────────────────────────────────────────────

const getStats = async (): Promise<RoleStatsResponse> => {
  const r = await apiClient.get<RoleStatsResponse>(`${BASE}/stats`);
  return r.data;
};

// ─── Seed ─────────────────────────────────────────────────────────────────────

const seedDefaults = async (): Promise<void> => {
  await apiClient.post(`${BASE}/seed`);
};

// ─── Export ───────────────────────────────────────────────────────────────────

const roleApi = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getPermissionsGrouped,
  getRolePermissionIds,
  setRolePermissions,
  getUsersWithRoles,
  getUserRoles,
  assignRoleToUser,
  removeRoleFromUser,
  getStats,
  seedDefaults,
};

export default roleApi;
