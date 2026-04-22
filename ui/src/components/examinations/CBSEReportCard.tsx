import { GraduationCap, Award, Calendar } from "lucide-react";

interface SubjectGrade {
  subject: string;
  fa1: number;
  fa2: number;
  sa1: number;
  fa3: number;
  fa4: number;
  sa2: number;
  term1Total: number;
  term2Total: number;
  annualTotal: number;
  grade: string;
  gradePoint: number;
}

interface CoScholasticGrade {
  area: string;
  term1: string;
  term2: string;
}

interface CBSEReportCardProps {
  studentName: string;
  rollNo: string;
  class: string;
  section: string;
  fatherName: string;
  motherName: string;
  dob: string;
  admissionNo: string;
  academicYear: string;
  subjects: SubjectGrade[];
  coScholastic: CoScholasticGrade[];
  attendance: { term1: number; term2: number };
  cgpa: number;
  remarks: string;
  height: string;
  weight: string;
}

export function CBSEReportCard({
  studentName,
  rollNo,
  class: className,
  section,
  fatherName,
  motherName,
  dob,
  admissionNo,
  academicYear,
  subjects,
  coScholastic,
  attendance,
  cgpa,
  remarks,
  height,
  weight
}: CBSEReportCardProps) {
  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto font-sans" style={{ fontSize: '12px' }}>
      {/* Header */}
      <div className="border-4 border-primary p-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <GraduationCap className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-primary">VITANA PUBLIC SCHOOL</h1>
              <p className="text-xs text-gray-600">Affiliated to CBSE, New Delhi | Affiliation No: 1234567</p>
            </div>
          </div>
          <div className="text-xs text-gray-600">
            <p>123 Education Street, Knowledge City, State - 12345</p>
            <p>Phone: +91-1234567890 | Email: info@vitanaschool.edu.in</p>
          </div>
        </div>
      </div>

      {/* Report Card Title */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 bg-primary/10 px-6 py-2 rounded border-2 border-primary">
          <Award className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold text-primary">
            PROGRESS REPORT CARD
          </h2>
        </div>
        <p className="text-sm mt-1 font-semibold">Academic Session: {academicYear}</p>
      </div>

      {/* Student Details */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
        <div className="border border-gray-300 p-2 space-y-1">
          <div className="flex justify-between border-b pb-1">
            <span className="font-semibold">Student Name:</span>
            <span>{studentName}</span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span className="font-semibold">Admission No:</span>
            <span>{admissionNo}</span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span className="font-semibold">Roll No:</span>
            <span>{rollNo}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Class-Section:</span>
            <span>{className}-{section}</span>
          </div>
        </div>
        
        <div className="border border-gray-300 p-2 space-y-1">
          <div className="flex justify-between border-b pb-1">
            <span className="font-semibold">Father's Name:</span>
            <span>{fatherName}</span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span className="font-semibold">Mother's Name:</span>
            <span>{motherName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Date of Birth:</span>
            <span>{dob}</span>
          </div>
        </div>
      </div>

      {/* Scholastic Areas */}
      <div className="mb-4">
        <h3 className="font-bold bg-primary text-white px-2 py-1 mb-2 text-sm">
          PART I: SCHOLASTIC AREAS
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th rowSpan={2} className="border border-gray-300 p-2">Subject</th>
                <th colSpan={3} className="border border-gray-300 p-1">TERM-I (100 Marks)</th>
                <th colSpan={3} className="border border-gray-300 p-1">TERM-II (100 Marks)</th>
                <th rowSpan={2} className="border border-gray-300 p-2">Overall<br/>Grade</th>
                <th rowSpan={2} className="border border-gray-300 p-2">Grade<br/>Point</th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-1">FA1<br/>(10)</th>
                <th className="border border-gray-300 p-1">FA2<br/>(10)</th>
                <th className="border border-gray-300 p-1">SA1<br/>(80)</th>
                <th className="border border-gray-300 p-1">FA3<br/>(10)</th>
                <th className="border border-gray-300 p-1">FA4<br/>(10)</th>
                <th className="border border-gray-300 p-1">SA2<br/>(80)</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="border border-gray-300 p-2 font-medium">{subject.subject}</td>
                  <td className="border border-gray-300 p-1 text-center">{subject.fa1}</td>
                  <td className="border border-gray-300 p-1 text-center">{subject.fa2}</td>
                  <td className="border border-gray-300 p-1 text-center">{subject.sa1}</td>
                  <td className="border border-gray-300 p-1 text-center">{subject.fa3}</td>
                  <td className="border border-gray-300 p-1 text-center">{subject.fa4}</td>
                  <td className="border border-gray-300 p-1 text-center">{subject.sa2}</td>
                  <td className="border border-gray-300 p-2 text-center font-bold text-primary">
                    {subject.grade}
                  </td>
                  <td className="border border-gray-300 p-2 text-center font-bold">
                    {subject.gradePoint}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-2 bg-primary/10 p-3 rounded border border-primary">
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm">Cumulative Grade Point Average (CGPA):</span>
            <span className="text-2xl font-bold text-primary">{cgpa.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Co-Scholastic Areas */}
      <div className="mb-4">
        <h3 className="font-bold bg-secondary text-white px-2 py-1 mb-2 text-sm">
          PART II: CO-SCHOLASTIC AREAS (Grading on 5-Point Scale: A-E)
        </h3>
        <table className="w-full border-collapse border border-gray-300 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">Areas</th>
              <th className="border border-gray-300 p-2 text-center">Term I</th>
              <th className="border border-gray-300 p-2 text-center">Term II</th>
            </tr>
          </thead>
          <tbody>
            {coScholastic.map((area, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="border border-gray-300 p-2">{area.area}</td>
                <td className="border border-gray-300 p-2 text-center font-semibold">{area.term1}</td>
                <td className="border border-gray-300 p-2 text-center font-semibold">{area.term2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Attendance & Health */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <h3 className="font-bold bg-accent text-white px-2 py-1 mb-2 text-sm">
            PART III: ATTENDANCE & HEALTH
          </h3>
          <table className="w-full border-collapse border border-gray-300 text-xs">
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 bg-gray-100 font-semibold">Attendance (Term I)</td>
                <td className="border border-gray-300 p-2 text-center">{attendance.term1}%</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 bg-gray-100 font-semibold">Attendance (Term II)</td>
                <td className="border border-gray-300 p-2 text-center">{attendance.term2}%</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 bg-gray-100 font-semibold">Height (cm)</td>
                <td className="border border-gray-300 p-2 text-center">{height}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 bg-gray-100 font-semibold">Weight (kg)</td>
                <td className="border border-gray-300 p-2 text-center">{weight}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="font-bold bg-warning text-white px-2 py-1 mb-2 text-sm">
            GRADING SCALE
          </h3>
          <table className="w-full border-collapse border border-gray-300 text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-1">Grade</th>
                <th className="border border-gray-300 p-1">Marks Range</th>
                <th className="border border-gray-300 p-1">Grade Point</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['A1', '91-100', '10.0'],
                ['A2', '81-90', '9.0'],
                ['B1', '71-80', '8.0'],
                ['B2', '61-70', '7.0'],
                ['C1', '51-60', '6.0'],
                ['C2', '41-50', '5.0'],
                ['D', '33-40', '4.0'],
                ['E1', '21-32', 'Failed'],
                ['E2', '00-20', 'Failed']
              ].map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="border border-gray-300 p-1 text-center font-semibold">{row[0]}</td>
                  <td className="border border-gray-300 p-1 text-center">{row[1]}</td>
                  <td className="border border-gray-300 p-1 text-center">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remarks */}
      <div className="mb-4">
        <h3 className="font-bold bg-gray-200 px-2 py-1 mb-2 text-sm">CLASS TEACHER'S REMARKS</h3>
        <div className="border border-gray-300 p-3 min-h-[60px] bg-gray-50 rounded">
          <p className="italic">{remarks}</p>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-4 text-xs text-center">
        <div>
          <div className="h-12"></div>
          <div className="border-t-2 border-gray-800 pt-1">
            <p className="font-semibold">Class Teacher</p>
          </div>
        </div>
        <div>
          <div className="h-12"></div>
          <div className="border-t-2 border-gray-800 pt-1">
            <p className="font-semibold">Parent's Signature</p>
          </div>
        </div>
        <div>
          <div className="h-12"></div>
          <div className="border-t-2 border-gray-800 pt-1">
            <p className="font-semibold">Principal</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-2 border-t border-gray-300 text-center text-xs text-gray-500">
        <p>This is a computer-generated document. For queries, contact the school office.</p>
      </div>
    </div>
  );
}
