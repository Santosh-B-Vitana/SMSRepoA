import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7001/api';

export interface RolePermission {
  moduleName: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface RoleData {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  permissions: RolePermission[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  permissions: RolePermission[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: RolePermission[];
  active?: boolean;
}

export interface AssignRoleData {
  userId: string;
  roleId: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

export const roleManagementApi = {
  // Get all roles for current school
  async getRoles(): Promise<RoleData[]> {
    const response = await axios.get(`${API_BASE_URL}/RoleManagement`, getAuthHeaders());
    return response.data;
  },

  // Get specific role by ID
  async getRole(roleId: string): Promise<RoleData> {
    const response = await axios.get(`${API_BASE_URL}/RoleManagement/${roleId}`, getAuthHeaders());
    return response.data;
  },

  // Create new role
  async createRole(data: CreateRoleData): Promise<RoleData> {
    const response = await axios.post(`${API_BASE_URL}/RoleManagement`, data, getAuthHeaders());
    return response.data;
  },

  // Update existing role
  async updateRole(roleId: string, data: UpdateRoleData): Promise<RoleData> {
    const response = await axios.put(`${API_BASE_URL}/RoleManagement/${roleId}`, data, getAuthHeaders());
    return response.data;
  },

  // Delete role (soft delete)
  async deleteRole(roleId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/RoleManagement/${roleId}`, getAuthHeaders());
  },

  // Assign role to user
  async assignRole(data: AssignRoleData): Promise<void> {
    await axios.post(`${API_BASE_URL}/RoleManagement/assign`, data, getAuthHeaders());
  },

  // Get roles assigned to a user
  async getUserRoles(userId: string): Promise<string[]> {
    const response = await axios.get(`${API_BASE_URL}/RoleManagement/user/${userId}`, getAuthHeaders());
    return response.data;
  },

  // Check if user has specific permission
  async checkPermission(userId: string, moduleName: string, permissionType: 'view' | 'add' | 'edit' | 'delete'): Promise<boolean> {
    const response = await axios.get(`${API_BASE_URL}/RoleManagement/check-permission`, {
      ...getAuthHeaders(),
      params: { userId, moduleName, permissionType }
    });
    return response.data.hasPermission;
  }
};
