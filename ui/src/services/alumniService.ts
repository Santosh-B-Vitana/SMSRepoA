import { rateLimiter } from './rateLimiter';

export interface Alumni {
  id: string;
  schoolId: string;
  name: string;
  graduationYear: string;
  class: string;
  currentOccupation: string;
  company: string;
  location: string;
  email: string;
  phone: string;
  achievements: string;
  photoUrl?: string;
  isStarAlumni: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlumniMeet {
  id: string;
  schoolId: string;
  title: string;
  date: string;
  venue: string;
  description: string;
  attendees: string[];
  status: 'planned' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface AlumniFilters {
  graduationYear?: string;
  isStarAlumni?: boolean;
  search?: string;
  occupation?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const mockAlumniStore = new Map<string, Alumni[]>();
const mockMeetsStore = new Map<string, AlumniMeet[]>();
const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

class AlumniService {
  private getSchoolAlumni(schoolId: string): Alumni[] {
    if (!mockAlumniStore.has(schoolId)) {
      mockAlumniStore.set(schoolId, this.generateMockAlumni(schoolId, 100));
    }
    return mockAlumniStore.get(schoolId)!;
  }

  private getSchoolMeets(schoolId: string): AlumniMeet[] {
    if (!mockMeetsStore.has(schoolId)) {
      mockMeetsStore.set(schoolId, this.generateMockMeets(schoolId, 20));
    }
    return mockMeetsStore.get(schoolId)!;
  }

  private async checkCache<T>(key: string): Promise<T | null> {
    const cached = dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    dataCache.set(key, { data, timestamp: Date.now() });
  }

  async getAlumni(
    schoolId: string,
    filters: AlumniFilters = {},
    pagination: PaginationParams = { page: 1, pageSize: 20 }
  ): Promise<PaginatedResponse<Alumni>> {
    await rateLimiter.checkLimit(`alumni_${schoolId}`);

    const cacheKey = `alumni_${schoolId}_${JSON.stringify(filters)}_${pagination.page}_${pagination.pageSize}`;
    const cached = await this.checkCache<PaginatedResponse<Alumni>>(cacheKey);
    if (cached) return cached;

    await new Promise(resolve => setTimeout(resolve, 50));

    let alumni = this.getSchoolAlumni(schoolId);

    if (filters.graduationYear) {
      alumni = alumni.filter(a => a.graduationYear === filters.graduationYear);
    }
    if (filters.isStarAlumni !== undefined) {
      alumni = alumni.filter(a => a.isStarAlumni === filters.isStarAlumni);
    }
    if (filters.occupation) {
      alumni = alumni.filter(a => a.currentOccupation.toLowerCase().includes(filters.occupation!.toLowerCase()));
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      alumni = alumni.filter(a => 
        a.name.toLowerCase().includes(search) ||
        a.company.toLowerCase().includes(search) ||
        a.currentOccupation.toLowerCase().includes(search)
      );
    }

    const total = alumni.length;
    const start = (pagination.page - 1) * pagination.pageSize;
    const paginatedAlumni = alumni.slice(start, start + pagination.pageSize);

    const response = {
      data: paginatedAlumni,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize)
    };

    this.setCache(cacheKey, response);
    return response;
  }

  async addAlumni(
    schoolId: string,
    data: Omit<Alumni, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
  ): Promise<Alumni> {
    await rateLimiter.checkLimit(`alumni_${schoolId}`);

    await new Promise(resolve => setTimeout(resolve, 50));

    const alumni = this.getSchoolAlumni(schoolId);
    const newAlumni: Alumni = {
      ...data,
      id: `ALU${String(alumni.length + 1).padStart(6, '0')}`,
      schoolId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    alumni.unshift(newAlumni);
    return newAlumni;
  }

  async updateAlumni(
    schoolId: string,
    alumniId: string,
    updates: Partial<Omit<Alumni, 'id' | 'schoolId' | 'createdAt'>>
  ): Promise<Alumni> {
    await rateLimiter.checkLimit(`alumni_${schoolId}`);

    await new Promise(resolve => setTimeout(resolve, 30));

    const alumni = this.getSchoolAlumni(schoolId);
    const alumnus = alumni.find(a => a.id === alumniId);

    if (!alumnus) {
      throw new Error('Alumni not found');
    }

    Object.assign(alumnus, updates, { updatedAt: new Date().toISOString() });
    return alumnus;
  }

  async deleteAlumni(schoolId: string, alumniId: string): Promise<void> {
    await rateLimiter.checkLimit(`alumni_${schoolId}`);

    await new Promise(resolve => setTimeout(resolve, 30));

    const alumni = this.getSchoolAlumni(schoolId);
    const index = alumni.findIndex(a => a.id === alumniId);

    if (index === -1) {
      throw new Error('Alumni not found');
    }

    alumni.splice(index, 1);
  }

  async getAlumniMeets(
    schoolId: string,
    pagination: PaginationParams = { page: 1, pageSize: 20 }
  ): Promise<PaginatedResponse<AlumniMeet>> {
    await rateLimiter.checkLimit(`alumni_${schoolId}`);

    await new Promise(resolve => setTimeout(resolve, 50));

    const meets = this.getSchoolMeets(schoolId);
    const total = meets.length;
    const start = (pagination.page - 1) * pagination.pageSize;
    const paginatedMeets = meets.slice(start, start + pagination.pageSize);

    return {
      data: paginatedMeets,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize)
    };
  }

  async createMeet(
    schoolId: string,
    data: Omit<AlumniMeet, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
  ): Promise<AlumniMeet> {
    await rateLimiter.checkLimit(`alumni_${schoolId}`);

    await new Promise(resolve => setTimeout(resolve, 50));

    const meets = this.getSchoolMeets(schoolId);
    const newMeet: AlumniMeet = {
      ...data,
      id: `MEET${String(meets.length + 1).padStart(6, '0')}`,
      schoolId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    meets.unshift(newMeet);
    return newMeet;
  }

  async getAlumniStats(schoolId: string): Promise<any> {
    await rateLimiter.checkLimit(`alumni_${schoolId}`);

    const cacheKey = `alumni_stats_${schoolId}`;
    const cached = await this.checkCache(cacheKey);
    if (cached) return cached;

    await new Promise(resolve => setTimeout(resolve, 50));

    const alumni = this.getSchoolAlumni(schoolId);
    const currentYear = new Date().getFullYear().toString();

    const stats = {
      total: alumni.length,
      starAlumni: alumni.filter(a => a.isStarAlumni).length,
      thisYear: alumni.filter(a => a.graduationYear === currentYear).length,
      byYear: this.getAlumniByYear(alumni),
      topCompanies: this.getTopCompanies(alumni),
      recentAlumni: alumni.slice(0, 5)
    };

    this.setCache(cacheKey, stats);
    return stats;
  }

  private getAlumniByYear(alumni: Alumni[]): Record<string, number> {
    const byYear: Record<string, number> = {};
    alumni.forEach(alum => {
      byYear[alum.graduationYear] = (byYear[alum.graduationYear] || 0) + 1;
    });
    return byYear;
  }

  private getTopCompanies(alumni: Alumni[]): Array<{ company: string; count: number }> {
    const companies: Record<string, number> = {};
    alumni.forEach(alum => {
      companies[alum.company] = (companies[alum.company] || 0) + 1;
    });
    return Object.entries(companies)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private generateMockAlumni(schoolId: string, count: number): Alumni[] {
    const alumni: Alumni[] = [];
    const occupations = ['Software Engineer', 'Doctor', 'Teacher', 'Engineer', 'Entrepreneur', 'Researcher'];
    const companies = ['Tech Corp', 'Medical Center', 'School District', 'Engineering Firm', 'Startup Inc'];
    const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Hyderabad'];

    for (let i = 0; i < count; i++) {
      const year = 2024 - Math.floor(Math.random() * 10);
      alumni.push({
        id: `ALU${String(i + 1).padStart(6, '0')}`,
        schoolId,
        name: `Alumni ${i + 1}`,
        graduationYear: year.toString(),
        class: `12-${String.fromCharCode(65 + (i % 4))}`,
        currentOccupation: occupations[i % occupations.length],
        company: companies[i % companies.length],
        location: `${locations[i % locations.length]}, India`,
        email: `alumni${i + 1}@email.com`,
        phone: `+91-${Math.floor(Math.random() * 10000000000)}`,
        achievements: `Notable achievement ${i + 1}`,
        isStarAlumni: Math.random() > 0.7,
        createdAt: new Date(year, 5, 1).toISOString(),
        updatedAt: new Date(year, 5, 1).toISOString()
      });
    }

    return alumni.sort((a, b) => parseInt(b.graduationYear) - parseInt(a.graduationYear));
  }

  private generateMockMeets(schoolId: string, count: number): AlumniMeet[] {
    const meets: AlumniMeet[] = [];
    const statuses: ('planned' | 'completed' | 'cancelled')[] = ['planned', 'completed', 'completed'];

    for (let i = 0; i < count; i++) {
      const date = new Date(Date.now() + (Math.random() * 365 - 180) * 24 * 60 * 60 * 1000);
      meets.push({
        id: `MEET${String(i + 1).padStart(6, '0')}`,
        schoolId,
        title: `Alumni Meet ${i + 1}`,
        date: date.toISOString(),
        venue: `Venue ${i + 1}`,
        description: `Description for alumni meet ${i + 1}`,
        attendees: Array.from({ length: Math.floor(Math.random() * 50) + 10 }, (_, j) => `ALU${j + 1}`),
        status: statuses[i % statuses.length],
        createdAt: new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    return meets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}

export const alumniService = new AlumniService();
