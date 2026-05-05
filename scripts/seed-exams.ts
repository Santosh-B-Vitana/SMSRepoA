/**
 * Exam Module Seeding Script
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Seeds realistic exam and result data for testing.
 *
 * Usage: npx ts-node scripts/seed-exams.ts
 * Prerequisites: Backend must be running on localhost:5092, auth token available
 *
 * Seed Plan:
 *  - Create 15+ exams across multiple subjects (Math, English, Science, Social)
 *  - Vary dates throughout academic year 2026-2027
 *  - Create realistic student results with grade distribution
 *  - Include edge cases: absent students, perfect scores, fail cases
 */

import fetch, { RequestInfo, RequestInit } from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Configuration ──────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:5092/api';
const AUTH_FILE = path.join(__dirname, '../ui/e2e/.auth/admin.json');
const LOG_FILE = path.join(__dirname, '../logs/seed-exams.log');

// ── Helpers ────────────────────────────────────────────────────────────────

function getToken(): string | null {
  try {
    if (!fs.existsSync(AUTH_FILE)) {
      console.error('❌ Auth file not found:', AUTH_FILE);
      return null;
    }
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    const entry = data.origins?.[0]?.localStorage?.find((e: { name: string }) => e.name === 'authToken');
    return entry?.value ?? null;
  } catch (err) {
    console.error('❌ Failed to read auth token:', err);
    return null;
  }
}

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${message}`;
  console.log(logMsg);
  try {
    if (!fs.existsSync(path.dirname(LOG_FILE))) {
      fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    }
    fs.appendFileSync(LOG_FILE, logMsg + '\n');
  } catch {
    // Ignore log write errors
  }
}

async function apiCall<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: unknown,
  token?: string,
): Promise<T | null> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);

    if (!response.ok) {
      log(`⚠️  API ${method} ${endpoint} failed: ${response.status} ${response.statusText}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (err) {
    log(`❌ API call error: ${err}`);
    return null;
  }
}

// ── Data Discovery ────────────────────────────────────────────────────────

interface AcademicYear {
  id: string;
  name: string;
  isCurrent?: boolean;
}

interface ClassInfo {
  id: string;
  standard: string;
}

interface SectionInfo {
  id: string;
  name: string;
}

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  rollNo: string;
}

async function getAcademicYears(token: string): Promise<AcademicYear[]> {
  const response = await apiCall<{ academicYears?: AcademicYear[] }>(
    'GET',
    '/academics/academic-years?pageSize=100',
    undefined,
    token,
  );
  return response?.academicYears ?? [];
}

async function getClasses(token: string): Promise<ClassInfo[]> {
  const response = await apiCall<{ classes?: ClassInfo[] }>(
    'GET',
    '/academics/classes?pageSize=100',
    undefined,
    token,
  );
  return response?.classes ?? [];
}

async function getSections(classId: string, token: string): Promise<SectionInfo[]> {
  const response = await apiCall<{ sections?: SectionInfo[] }>(
    'GET',
    `/academics/sections?classId=${classId}&pageSize=50`,
    undefined,
    token,
  );
  return response?.sections ?? [];
}

async function getStudents(classId: string, sectionId: string, token: string): Promise<StudentInfo[]> {
  const response = await apiCall<{ students?: StudentInfo[] }>(
    'GET',
    `/students?classId=${classId}&sectionId=${sectionId}&pageSize=200`,
    undefined,
    token,
  );
  return response?.students ?? [];
}

// ── Exam Seeding ───────────────────────────────────────────────────────────

interface ExamSeedData {
  name: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  totalMarks: number;
  passingMarks: number;
  venue: string;
}

const EXAM_TEMPLATES: ExamSeedData[] = [
  // Mathematics
  {
    name: 'Unit Test 1 - Mathematics',
    subject: 'Mathematics',
    date: '2026-05-15',
    startTime: '09:00',
    endTime: '10:30',
    totalMarks: 100,
    passingMarks: 40,
    venue: 'Hall A',
  },
  {
    name: 'Unit Test 2 - Mathematics',
    subject: 'Mathematics',
    date: '2026-06-20',
    startTime: '09:00',
    endTime: '11:00',
    totalMarks: 100,
    passingMarks: 40,
    venue: 'Hall A',
  },
  {
    name: 'Mid-Term - Mathematics',
    subject: 'Mathematics',
    date: '2026-07-15',
    startTime: '09:00',
    endTime: '12:00',
    totalMarks: 100,
    passingMarks: 40,
    venue: 'Hall A',
  },

  // English
  {
    name: 'Unit Test 1 - English',
    subject: 'English',
    date: '2026-05-16',
    startTime: '14:00',
    endTime: '15:30',
    totalMarks: 100,
    passingMarks: 40,
    venue: 'Hall B',
  },
  {
    name: 'Unit Test 2 - English',
    subject: 'English',
    date: '2026-06-21',
    startTime: '14:00',
    endTime: '16:00',
    totalMarks: 100,
    passingMarks: 40,
    venue: 'Hall B',
  },
  {
    name: 'Mid-Term - English',
    subject: 'English',
    date: '2026-07-16',
    startTime: '14:00',
    endTime: '17:00',
    totalMarks: 100,
    passingMarks: 40,
    venue: 'Hall B',
  },

  // Science
  {
    name: 'Unit Test 1 - Science',
    subject: 'Science',
    date: '2026-05-17',
    startTime: '09:00',
    endTime: '10:30',
    totalMarks: 100,
    passingMarks: 40,
    venue: 'Lab Hall',
  },
  {
    name: 'Unit Test 2 - Science',
    subject: 'Science',
    date: '2026-06-22',
    startTime: '09:00',
    endTime: '11:00',
    totalMarks: 100,
    passingMarks: 40,
    venue: 'Lab Hall',
  },
  {
    name: 'Mid-Term - Science',
    subject: 'Science',
    date: '2026-07-17',
    startTime: '09:00',
    endTime: '12:00',
    totalMarks: 100,
    passingMarks: 40,
    venue: 'Lab Hall',
  },

  // Social Studies
  {
    name: 'Unit Test 1 - Social Studies',
    subject: 'Social Studies',
    date: '2026-05-18',
    startTime: '14:00',
    endTime: '15:30',
    totalMarks: 100,
    passingMarks: 40,
    venue: 'Hall C',
  },
  {
    name: 'Unit Test 2 - Social Studies',
    subject: 'Social Studies',
    date: '2026-06-23',
    startTime: '14:00',
    endTime: '16:00',
    totalMarks: 100,
    passingMarks: 40,
    venue: 'Hall C',
  },
  {
    name: 'Mid-Term - Social Studies',
    subject: 'Social Studies',
    date: '2026-07-18',
    startTime: '14:00',
    endTime: '17:00',
    totalMarks: 100,
    passingMarks: 40,
    venue: 'Hall C',
  },

  // Additional exams for variety
  {
    name: 'Computer Science - Unit Test 1',
    subject: 'Computer Science',
    date: '2026-05-19',
    startTime: '10:00',
    endTime: '11:30',
    totalMarks: 100,
    passingMarks: 40,
    venue: 'Lab 1',
  },
  {
    name: 'Hindi - Unit Test 1',
    subject: 'Hindi',
    date: '2026-05-20',
    startTime: '11:00',
    endTime: '12:30',
    totalMarks: 100,
    passingMarks: 40,
    venue: 'Hall D',
  },
];

async function createExam(
  examData: ExamSeedData,
  classId: string,
  sectionId: string,
  academicYear: string,
  token: string,
): Promise<string | null> {
  const payload = {
    name: examData.name,
    subject: examData.subject,
    class: `Class 10`, // Adjust based on your data
    classId,
    section: 'A', // Adjust based on your data
    sectionId,
    examDate: examData.date,
    startTime: examData.startTime,
    endTime: examData.endTime,
    duration: Math.round((parseInt(examData.endTime.split(':')[0]) * 60 + parseInt(examData.endTime.split(':')[1]) - (parseInt(examData.startTime.split(':')[0]) * 60 + parseInt(examData.startTime.split(':')[1]))) / 60),
    totalMarks: examData.totalMarks,
    passingMarks: examData.passingMarks,
    venue: examData.venue,
    academicYear,
    status: 'scheduled',
  };

  const response = await apiCall<{ id?: string; data?: { id: string } }>(
    'POST',
    '/examinations/exams',
    payload,
    token,
  );

  const examId = response?.id ?? response?.data?.id;
  if (examId) {
    log(`✅ Created exam: ${examData.name} (${examId})`);
  } else {
    log(`⚠️  Failed to create exam: ${examData.name}`);
  }

  return examId ?? null;
}

// ── Result Seeding ─────────────────────────────────────────────────────────

interface ResultSeedData {
  studentId: string;
  marksObtained: number | null;
  isAbsent?: boolean;
}

function generateResultsForStudents(students: StudentInfo[], totalMarks: number): ResultSeedData[] {
  return students.map((student, idx) => {
    // Distribution: 20% absent, 10% perfect, 10% fail, 60% pass
    const rand = Math.random();

    if (rand < 0.2) {
      // Absent
      return { studentId: student.id, marksObtained: null, isAbsent: true };
    } else if (rand < 0.3) {
      // Perfect score
      return { studentId: student.id, marksObtained: totalMarks };
    } else if (rand < 0.4) {
      // Fail (30-39% of total)
      return { studentId: student.id, marksObtained: Math.floor(totalMarks * 0.35) };
    } else {
      // Pass (40-95%)
      const passPercentage = 40 + Math.random() * 55;
      return { studentId: student.id, marksObtained: Math.floor(totalMarks * (passPercentage / 100)) };
    }
  });
}

async function createResults(
  examId: string,
  results: ResultSeedData[],
  totalMarks: number,
  token: string,
): Promise<void> {
  for (const result of results) {
    const payload = {
      examId,
      studentId: result.studentId,
      marksObtained: result.marksObtained,
      totalMarks,
      isAbsent: result.isAbsent ?? false,
    };

    const response = await apiCall<{ id?: string }>(
      'POST',
      '/examinations/results',
      payload,
      token,
    );

    if (!response?.id) {
      log(`⚠️  Failed to create result for student ${result.studentId} in exam ${examId}`);
    }
  }

  log(`✅ Created ${results.length} results for exam ${examId}`);
}

// ── Main Seeding Orchestration ──────────────────────────────────────────

async function seedExams(): Promise<void> {
  log('═══════════════════════════════════════════════════════════════════');
  log('Starting Exam Module Seeding...');
  log('═══════════════════════════════════════════════════════════════════');

  const token = getToken();
  if (!token) {
    log('❌ Failed to get authentication token. Exiting.');
    process.exit(1);
  }

  log('✅ Authentication token retrieved');

  // Discover data
  log('\n📚 Discovering prerequisite data...');
  const years = await getAcademicYears(token);
  // Use current year first, then fall back to 2025-2026, then 2026-2027, then first available
  const targetYear = years.find((y) => y.isCurrent)
    ?? years.find((y) => y.name === '2025-2026')
    ?? years.find((y) => y.name === '2026-2027')
    ?? years[0];

  if (!targetYear) {
    log('❌ No academic year found. Ensure at least one academic year exists.');
    process.exit(1);
  }
  log(`✅ Using academic year: ${targetYear.name} (${targetYear.id})`);

  const classes = await getClasses(token);
  if (classes.length === 0) {
    log('❌ No classes found. Create classes first.');
    process.exit(1);
  }
  log(`✅ Found ${classes.length} classes`);

  // Process each class
  for (const classInfo of classes) {
    log(`\n📖 Processing class: ${classInfo.standard}`);

    const sections = await getSections(classInfo.id, token);
    if (sections.length === 0) {
      log(`⚠️  No sections found for ${classInfo.standard}. Skipping.`);
      continue;
    }

    // Process first section (A)
    const section = sections[0];
    log(`  📌 Using section: ${section.name}`);

    const students = await getStudents(classInfo.id, section.id, token);
    if (students.length === 0) {
      log(`  ⚠️  No students in section. Skipping exam creation.`);
      continue;
    }
    log(`  👥 Found ${students.length} students`);

    // Create exams
    log(`  📝 Creating ${EXAM_TEMPLATES.length} exams...`);
    let createdExams = 0;

    for (const template of EXAM_TEMPLATES) {
      const examId = await createExam(
        template,
        classInfo.id,
        section.id,
        targetYear.name,
        token,
      );

      if (examId) {
        createdExams++;

        // Create results
        const results = generateResultsForStudents(students, template.totalMarks);
        await createResults(examId, results, template.totalMarks, token);

        // Small delay to avoid overwhelming API
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    log(`  ✅ Created ${createdExams}/${EXAM_TEMPLATES.length} exams with results`);
  }

  log('\n═══════════════════════════════════════════════════════════════════');
  log('✅ Seeding completed successfully!');
  log('═══════════════════════════════════════════════════════════════════');
}

// ── Entry Point ────────────────────────────────────────────────────────────

seedExams().catch((err) => {
  log(`❌ Fatal error: ${err}`);
  process.exit(1);
});
