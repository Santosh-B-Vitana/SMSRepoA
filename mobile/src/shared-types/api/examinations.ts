export type Grade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';

export interface ExamResult {
  id: string;
  studentId: string;
  studentName: string;
  examId: string;
  examName: string;
  subjectId: string;
  subjectName: string;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  grade: Grade;
  rank?: number;
  remarks?: string;
  publishedAt: string;
}

export interface ReportCard {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  className: string;
  section: string;
  academicYear: string;
  examName: string;
  subjects: SubjectResult[];
  totalMarks: number;
  maxTotalMarks: number;
  overallPercentage: number;
  overallGrade: Grade;
  rank?: number;
  attendance?: number;
  remarks?: string;
  generatedAt: string;
}

export interface SubjectResult {
  subjectId: string;
  subjectName: string;
  theoryMarks: number;
  practicalMarks?: number;
  maxTheoryMarks: number;
  maxPracticalMarks?: number;
  totalMarks: number;
  maxTotalMarks: number;
  grade: Grade;
  percentage: number;
}

export interface ExamSchedule {
  id: string;
  examName: string;
  subjectName: string;
  date: string;
  startTime: string;
  endTime: string;
  venue?: string;
  classId: string;
  className: string;
}
