/**
 * Super Admin School Context
 *
 * When logged in as super admin, the user needs to "act as" a specific school
 * in order to view/edit that school's data (students, staff, fees, etc.).
 *
 * This context provides:
 *  - The selected school ID (persisted in sessionStorage)
 *  - A list of available active schools to switch between
 *  - A setter to change the active school
 *
 * The selected school ID is sent on every API request as the
 * `X-School-Override` header (read in apiClient.ts), which the backend
 * TenantContextAccessor picks up to scope queries to that school.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import * as superAdminApi from "@/services/api/superAdminApi";
import type { SchoolListItem } from "@/services/api/superAdminApi";

const SA_SCHOOL_KEY = "sa_school_override";

interface SuperAdminSchoolContextValue {
  selectedSchoolId: string;
  selectedSchool: SchoolListItem | null;
  schools: SchoolListItem[];
  setSelectedSchoolId: (id: string) => void;
  isLoaded: boolean;
}

const SuperAdminSchoolContext = createContext<SuperAdminSchoolContextValue>({
  selectedSchoolId: "",
  selectedSchool: null,
  schools: [],
  setSelectedSchoolId: () => {},
  isLoaded: false,
});

export function SuperAdminSchoolProvider({ children }: { children: React.ReactNode }) {
  const [schools, setSchools] = useState<SchoolListItem[]>([]);
  const [selectedSchoolId, setSelectedSchoolIdState] = useState<string>(
    () => sessionStorage.getItem(SA_SCHOOL_KEY) ?? ""
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    superAdminApi
      .getAllSchools()
      .then((data) => {
        const active = data.filter((s) => s.isActive);
        setSchools(active);
        // Auto-select first real school if none is selected
        if (!sessionStorage.getItem(SA_SCHOOL_KEY) && active.length > 0) {
          const first = active[0];
          sessionStorage.setItem(SA_SCHOOL_KEY, first.id);
          setSelectedSchoolIdState(first.id);
          window.dispatchEvent(new CustomEvent('sa-school-changed', { detail: { schoolId: first.id } }));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  const setSelectedSchoolId = (id: string) => {
    sessionStorage.setItem(SA_SCHOOL_KEY, id);
    setSelectedSchoolIdState(id);
    window.dispatchEvent(new CustomEvent('sa-school-changed', { detail: { schoolId: id } }));
  };

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId) ?? null;

  return (
    <SuperAdminSchoolContext.Provider
      value={{ selectedSchoolId, selectedSchool, schools, setSelectedSchoolId, isLoaded }}
    >
      {children}
    </SuperAdminSchoolContext.Provider>
  );
}

export function useSuperAdminSchool() {
  return useContext(SuperAdminSchoolContext);
}
