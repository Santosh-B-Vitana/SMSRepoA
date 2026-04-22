import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7125/api';

export interface SchoolListDto {
  id: string;
  name: string;
  schoolCode: string;
  isActive: boolean;
  enabledModulesCount: number;
  totalModulesCount: number;
}

export interface ModulePermissionDto {
  enabled: boolean;
  permissions: string[];
}

export interface SchoolPermissionsResponse {
  schoolId: string;
  schoolName: string;
  modules: Record<string, ModulePermissionDto>;
}

export interface UpdateSchoolFeaturePermissionRequest {
  schoolId: string;
  moduleName: string;
  isEnabled: boolean;
  permissionLevels: string[];
  packageName?: string;
  notes?: string;
}

class SchoolFeaturePermissionService {
  private getAuthHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Get all schools (Super Admin only)
   */
  async getAllSchools(): Promise<SchoolListDto[]> {
    const response = await axios.get(`${API_BASE_URL}/SchoolFeaturePermissions/schools`, {
      headers: this.getAuthHeader()
    });
    return response.data;
  }

  /**
   * Get feature permissions for a specific school
   */
  async getSchoolPermissions(schoolId: string): Promise<SchoolPermissionsResponse> {
    const response = await axios.get(`${API_BASE_URL}/SchoolFeaturePermissions/schools/${schoolId}`, {
      headers: this.getAuthHeader()
    });
    return response.data;
  }

  /**
   * Update a single module permission for a school (Super Admin only)
   */
  async updateModulePermission(
    schoolId: string,
    moduleName: string,
    data: UpdateSchoolFeaturePermissionRequest
  ): Promise<any> {
    const response = await axios.put(
      `${API_BASE_URL}/SchoolFeaturePermissions/schools/${schoolId}/modules/${moduleName}`,
      data,
      {
        headers: this.getAuthHeader()
      }
    );
    return response.data;
  }

  /**
   * Check if a specific module is enabled for a school
   */
  async checkModuleAccess(schoolId: string, moduleName: string): Promise<boolean> {
    const response = await axios.get(
      `${API_BASE_URL}/SchoolFeaturePermissions/schools/${schoolId}/modules/${moduleName}/check`,
      {
        headers: this.getAuthHeader()
      }
    );
    return response.data.hasAccess;
  }

  /**
   * Get list of enabled modules for a school
   */
  async getEnabledModules(schoolId: string): Promise<string[]> {
    const response = await axios.get(
      `${API_BASE_URL}/SchoolFeaturePermissions/schools/${schoolId}/enabled-modules`,
      {
        headers: this.getAuthHeader()
      }
    );
    return response.data;
  }

  /**
   * Initialize default permissions for a school (Super Admin only)
   */
  async initializeDefaultPermissions(schoolId: string): Promise<void> {
    await axios.post(
      `${API_BASE_URL}/SchoolFeaturePermissions/schools/${schoolId}/initialize`,
      {},
      {
        headers: this.getAuthHeader()
      }
    );
  }
}

export const schoolFeaturePermissionService = new SchoolFeaturePermissionService();
