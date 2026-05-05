// Pure JS seed script - run with: node scripts/seed-exams.js
const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:5092/api';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const proto = url.protocol === 'https:' ? https : http;
    const req = proto.request(opts, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(chunks);
          // unwrap envelope if present
          if (parsed && parsed.success !== undefined && parsed.data !== undefined) {
            resolve({ status: res.statusCode, data: parsed.data });
          } else {
            resolve({ status: res.statusCode, data: parsed });
          }
        } catch {
          resolve({ status: res.statusCode, data: chunks });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🚀 Starting exam seeding...\n');

  // 1. Login
  const loginRes = await request('POST', '/auth/login', {
    username: 'admin@vitanaschools.edu',
    password: 'admin-dev-change-me',
  });
  if (loginRes.status !== 200) {
    console.error('❌ Login failed:', JSON.stringify(loginRes.data));
    process.exit(1);
  }
  const token = loginRes.data.token;
  console.log('✅ Logged in');

  // 2. Get academic years - use current year
  const yearsRes = await request('GET', '/academics/academic-years?pageSize=50', null, token);
  const years = yearsRes.data.academicYears || [];
  const targetYear =
    years.find((y) => y.isCurrent) ||
    years.find((y) => y.name === '2025-2026') ||
    years.find((y) => y.name === '2026-2027') ||
    years[0];
  if (!targetYear) {
    console.error('❌ No academic year found');
    process.exit(1);
  }
  console.log(`✅ Using academic year: ${targetYear.name}`);

  // 3. Get classes
  const classesRes = await request('GET', '/academics/classes?pageSize=100', null, token);
  const classes = classesRes.data.classes || [];
  if (!classes.length) {
    console.error('❌ No classes found');
    process.exit(1);
  }
  console.log(`✅ Found ${classes.length} classes`);

  // 4. Exam templates
  const examTemplates = [
    { name: 'Unit Test 1', examType: 'unit-test', maxMarks: 25, passingMarks: 10, subjects: ['Mathematics', 'Science'] },
    { name: 'Unit Test 2', examType: 'unit-test', maxMarks: 25, passingMarks: 10, subjects: ['English', 'Social Studies'] },
    { name: 'Mid-Term Examination', examType: 'half-yearly', maxMarks: 100, passingMarks: 35, subjects: ['Mathematics', 'English', 'Science', 'Social Studies', 'Hindi'] },
  ];

  let totalCreated = 0;
  let totalFailed = 0;

  const today = new Date();
  const dateOffset = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  for (const cls of classes.slice(0, 8)) { // up to 8 classes
    const standard = cls.standard || cls.name || `Class ${cls.id.slice(0, 4)}`;
    console.log(`\n📖 Processing ${standard}...`);

    // Get sections
    const sectionsRes = await request('GET', `/academics/classes/${cls.id}/sections`, null, token);
    const sections = sectionsRes.data.sections || sectionsRes.data || [];
    const section = Array.isArray(sections) ? sections[0] : null;
    const sectionName = section?.name || section?.section || 'A';

    for (let ti = 0; ti < examTemplates.length; ti++) {
      const tmpl = examTemplates[ti];
      for (const subject of tmpl.subjects) {
        const examDate = dateOffset(-90 + ti * 30 + tmpl.subjects.indexOf(subject));
        const body = {
          name: tmpl.name,
          examType: tmpl.examType,
          class: standard,
          section: sectionName,
          subject,
          date: examDate,
          startTime: '09:00',
          endTime: '11:00',
          duration: 120,
          maxMarks: tmpl.maxMarks,
          passingMarks: tmpl.passingMarks,
          academicYear: targetYear.name,
          schoolId: '550e8400-e29b-41d4-a716-446655440000',
        };

        const res = await request('POST', '/examinations/exams', body, token);
        if (res.status === 200 || res.status === 201) {
          totalCreated++;
          process.stdout.write('.');
        } else {
          totalFailed++;
          if (totalFailed <= 3) {
            console.error(`\n  ⚠️  Failed: ${subject} - ${JSON.stringify(res.data).slice(0, 100)}`);
          }
        }
      }
    }
    console.log('');
  }

  console.log(`\n✅ Seeding complete: ${totalCreated} exams created, ${totalFailed} failed`);

  // 5. Verify
  const verifyRes = await request(
    'GET',
    `/examinations/exams?academicYear=${encodeURIComponent(targetYear.name)}&page=1&pageSize=5`,
    null,
    token
  );
  console.log(`✅ Verification: ${verifyRes.data.totalCount} exams now in DB for ${targetYear.name}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
