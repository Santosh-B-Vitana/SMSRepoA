import React, { useState, useEffect, useRef } from 'react';
import { Search, Users, UserCheck, BookOpen, FileText, Calendar, Award, Settings, CreditCard, Home, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { academicApi } from '@/services/api/academicApi';
import { getExams } from '@/services/api/examinationApi';
import { getAnnouncements } from '@/services/api/announcementApi';
import { studentApi } from '@/services/api/studentApi';
import { staffApi } from '@/services/api/staffApi';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'student' | 'staff' | 'class' | 'module' | 'document' | 'exam' | 'announcement';
  icon: React.ComponentType<any>;
  path: string;
  data?: any;
}

interface UniversalSearchProps {
  className?: string;
}

export function UniversalSearch({ className }: UniversalSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Available modules and pages
  const modules = [
    { title: 'Students', path: '/students', icon: Users, type: 'module' as const },
    { title: 'Staff', path: '/staff', icon: UserCheck, type: 'module' as const },
    { title: 'Academics', path: '/academics', icon: BookOpen, type: 'module' as const },
    { title: 'Examinations', path: '/examinations', icon: Award, type: 'module' as const },
    { title: 'Documents', path: '/documents', icon: FileText, type: 'module' as const },
    { title: 'ID Cards', path: '/id-cards', icon: CreditCard, type: 'module' as const },
    { title: 'Attendance', path: '/attendance', icon: Calendar, type: 'module' as const },
    { title: 'Announcements', path: '/announcements', icon: Bell, type: 'module' as const },
    { title: 'Settings', path: '/settings', icon: Settings, type: 'module' as const },
    { title: 'Dashboard', path: '/admin-dashboard', icon: Home, type: 'module' as const },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchData = async () => {
      if (!searchTerm.trim()) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      setIsOpen(true);

      try {
        const searchResults: SearchResult[] = [];
        const term = searchTerm.toLowerCase();

        // Search modules
        modules.forEach(module => {
          if (module.title.toLowerCase().includes(term)) {
            searchResults.push({
              id: `module-${module.path}`,
              title: module.title,
              subtitle: 'Module',
              type: module.type,
              icon: module.icon,
              path: module.path
            });
          }
        });

        // Search students
        try {
          const response = await studentApi.list({ pageSize: 1000 });
          response.students.forEach(student => {
            if (
              (student.name ?? '').toLowerCase().includes(term) ||
              (student.admissionNumber ?? '').toLowerCase().includes(term) ||
              (student.rollNumber ?? '').toLowerCase().includes(term) ||
              (student.class ?? '').toLowerCase().includes(term)
            ) {
              searchResults.push({
                id: `student-${student.id}`,
                title: student.name || 'Unknown',
                subtitle: `${student.class} ${student.section} • Roll: ${student.rollNumber}`,
                type: 'student',
                icon: Users,
                path: `/students/${student.id}`,
                data: student
              });
            }
          });
        } catch (error) {
          console.error('Error searching students:', error);
        }

        // Search staff
        try {
          const response = await staffApi.list({ pageSize: 1000 });
          response.staff.forEach(member => {
            if (
              (member.name ?? '').toLowerCase().includes(term) ||
              (member.email ?? '').toLowerCase().includes(term) ||
              (member.employeeId ?? '').toLowerCase().includes(term) ||
              (member.department ?? '').toLowerCase().includes(term) ||
              (member.designation ?? '').toLowerCase().includes(term)
            ) {
              searchResults.push({
                id: `staff-${member.id}`,
                title: member.name || 'Unknown',
                subtitle: `${member.designation} • ${member.department}`,
                type: 'staff',
                icon: UserCheck,
                path: `/staff/${member.id}`,
                data: member
              });
            }
          });
        } catch (error) {
          console.error('Error searching staff:', error);
        }

        // Search classes
        try {
          const response = await academicApi.listClasses(1, 200);
          response.classes.forEach(cls => {
            if (
              `${cls.standard} ${cls.section}`.toLowerCase().includes(term) ||
              cls.standard.toLowerCase().includes(term) ||
              cls.section.toLowerCase().includes(term)
            ) {
              searchResults.push({
                id: `class-${cls.id}`,
                title: `Class ${cls.standard} ${cls.section}`,
                subtitle: `${cls.totalStudents} students • ${cls.classTeacher ?? ''}`,
                type: 'class',
                icon: BookOpen,
                path: `/academics/classes/${cls.id}`,
                data: cls
              });
            }
          });
        } catch (error) {
          console.error('Error searching classes:', error);
        }

        // Search exams
        try {
          const response = await getExams(undefined, 1, 100);
          response.items.forEach(exam => {
            if (
              exam.name.toLowerCase().includes(term) ||
              exam.subject.toLowerCase().includes(term) ||
              exam.class.toLowerCase().includes(term)
            ) {
              searchResults.push({
                id: `exam-${exam.id}`,
                title: exam.name,
                subtitle: `${exam.subject} • ${exam.class} • ${exam.date}`,
                type: 'exam',
                icon: Award,
                path: `/examinations`,
                data: exam
              });
            }
          });
        } catch (error) {
          console.error('Error searching exams:', error);
        }

        // Search announcements
        try {
          const response = await getAnnouncements(undefined, 1, 100);
          response.items.forEach(announcement => {
            if (
              announcement.title.toLowerCase().includes(term) ||
              announcement.content.toLowerCase().includes(term)
            ) {
              searchResults.push({
                id: `announcement-${announcement.id}`,
                title: announcement.title,
                subtitle: `${announcement.priority} • ${announcement.createdAt}`,
                type: 'announcement',
                icon: Bell,
                path: `/announcements`,
                data: announcement
              });
            }
          });
        } catch (error) {
          console.error('Error searching announcements:', error);
        }

        // Sort results by relevance (exact matches first, then partial matches)
        searchResults.sort((a, b) => {
          const aExact = a.title.toLowerCase() === term ? 1 : 0;
          const bExact = b.title.toLowerCase() === term ? 1 : 0;
          if (aExact !== bExact) return bExact - aExact;
          
          const aStarts = a.title.toLowerCase().startsWith(term) ? 1 : 0;
          const bStarts = b.title.toLowerCase().startsWith(term) ? 1 : 0;
          if (aStarts !== bStarts) return bStarts - aStarts;
          
          return a.title.localeCompare(b.title);
        });

        setResults(searchResults.slice(0, 8)); // Limit to 8 results
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchData, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleResultClick = (result: SearchResult) => {
    setSearchTerm('');
    setIsOpen(false);
    navigate(result.path);
  };

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'student':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'staff':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'class':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'module':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'exam':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'announcement':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder="Search students, staff, classes, modules..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm && setIsOpen(true)}
          className="pl-10 pr-4"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="p-2">
              {results.map((result) => {
                const IconComponent = result.icon;
                return (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg text-left transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <IconComponent className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground truncate">{result.title}</span>
                        <Badge variant="secondary" className={`text-xs ${getTypeColor(result.type)}`}>
                          {result.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : searchTerm ? (
            <div className="p-4 text-center text-muted-foreground">
              No results found for "{searchTerm}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}