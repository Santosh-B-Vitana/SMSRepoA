import { GraduationCap, Award } from "lucide-react";

interface SubjectMarks {
  subject: string;
  theory: number;
  practical: number;
  internal: number;
  total: number;
  grade: string;
}

interface ICSEReportCardProps {
  studentName: string;
  rollNo: string;
  class: string;
  section: string;
  fatherName: string;
  motherName: string;
  dob: string;
  admissionNo: string;
  examName: string;
  examYear: string;
  subjects: SubjectMarks[];
  attendance: number;
  conduct: string;
  remarks: string;
  percentage: number;
  result: 'Pass' | 'Compartment' | 'Fail';
}

export function ICSEReportCard({
  studentName,
  rollNo,
  class: className,
  section,
  fatherName,
  motherName,
  dob,
  admissionNo,
  examName,
  examYear,
  subjects,
  attendance,
  conduct,
  remarks,
  percentage,
  result
}: ICSEReportCardProps) {
  const getGradeColor = (grade: string) => {
    if (grade >= '85') return 'text-success';
    if (grade >= '75') return 'text-primary';
    if (grade >= '60') return 'text-secondary';
    if (grade >= '50') return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto font-serif" style={{ fontSize: '12px' }}>
      {/* Header with ICSE Logo */}
      <div className="border-4 border-accent p-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <GraduationCap className="h-10 w-10 text-accent" />
            <div>
              <h1 className="text-2xl font-bold text-accent">VITANA ENGLISH SCHOOL</h1>
              <p className="text-xs text-gray-600">Affiliated to CISCE, New Delhi | School Code: IN123456</p>
            </div>
          </div>
          <div className="text-xs text-gray-600">
            <p>123 Education Lane, Knowledge City, State - 12345</p>
            <p>Phone: +91-1234567890 | Website: www.vitanaschool.edu.in</p>
          </div>
        </div>
      </div>

      {/* Report Title */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 bg-accent/10 px-6 py-2 rounded border-2 border-accent">
          <Award className="h-6 w-6 text-accent" />
          <h2 className="text-xl font-bold text-accent">
            EXAMINATION REPORT CARD
          </h2>
        </div>
        <p className="text-sm mt-2 font-semibold">{examName} - {examYear}</p>
      </div>

      {/* Student Information */}
      <div className="mb-4">
        <table className="w-full border-2 border-gray-400 text-xs">
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2 bg-gray-100 font-semibold w-1/4">Student Name</td>
              <td className="border border-gray-300 p-2 w-1/4">{studentName}</td>
              <td className="border border-gray-300 p-2 bg-gray-100 font-semibold w-1/4">Admission No.</td>
              <td className="border border-gray-300 p-2 w-1/4">{admissionNo}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 bg-gray-100 font-semibold">Father's Name</td>
              <td className="border border-gray-300 p-2">{fatherName}</td>
              <td className="border border-gray-300 p-2 bg-gray-100 font-semibold">Roll No.</td>
              <td className="border border-gray-300 p-2">{rollNo}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 bg-gray-100 font-semibold">Mother's Name</td>
              <td className="border border-gray-300 p-2">{motherName}</td>
              <td className="border border-gray-300 p-2 bg-gray-100 font-semibold">Class & Section</td>
              <td className="border border-gray-300 p-2">{className}-{section}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 bg-gray-100 font-semibold">Date of Birth</td>
              <td className="border border-gray-300 p-2">{dob}</td>
              <td className="border border-gray-300 p-2 bg-gray-100 font-semibold">Attendance</td>
              <td className="border border-gray-300 p-2 font-semibold">{attendance}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Marks Table */}
      <div className="mb-4">
        <h3 className="font-bold bg-accent text-white px-2 py-1 mb-2 text-sm">
          SUBJECT-WISE MARKS & GRADES
        </h3>
        <table className="w-full border-2 border-gray-400 text-xs">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 p-2 text-left">Subject</th>
              <th className="border border-gray-300 p-2 text-center">Theory<br/>(Max)</th>
              <th className="border border-gray-300 p-2 text-center">Practical<br/>(Max)</th>
              <th className="border border-gray-300 p-2 text-center">Internal<br/>Assessment</th>
              <th className="border border-gray-300 p-2 text-center">Total<br/>Marks</th>
              <th className="border border-gray-300 p-2 text-center">Grade</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="border border-gray-300 p-2 font-medium">{subject.subject}</td>
                <td className="border border-gray-300 p-2 text-center">{subject.theory}</td>
                <td className="border border-gray-300 p-2 text-center">
                  {subject.practical > 0 ? subject.practical : '-'}
                </td>
                <td className="border border-gray-300 p-2 text-center">{subject.internal}</td>
                <td className="border border-gray-300 p-2 text-center font-bold">{subject.total}</td>
                <td className={`border border-gray-300 p-2 text-center font-bold ${getGradeColor(subject.grade)}`}>
                  {subject.grade}
                </td>
              </tr>
            ))}
            <tr className="bg-accent/10 font-bold">
              <td colSpan={4} className="border border-gray-300 p-2 text-right">AGGREGATE</td>
              <td className="border border-gray-300 p-2 text-center">
                {subjects.reduce((sum, s) => sum + s.total, 0)}
              </td>
              <td className="border border-gray-300 p-2 text-center">{percentage.toFixed(2)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Grading System */}
      <div className="mb-4">
        <h3 className="font-bold bg-secondary text-white px-2 py-1 mb-2 text-sm">
          GRADING SYSTEM
        </h3>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {[
            ['85-100', '1'],
            ['75-84', '2'],
            ['60-74', '3'],
            ['50-59', '4'],
            ['40-49', '5'],
            ['35-39', '6'],
            ['< 35', '7']
          ].map(([range, grade], index) => (
            <div key={index} className="border border-gray-300 p-2 text-center bg-gray-50">
              <div className="font-bold">{range}</div>
              <div className="text-muted-foreground">Grade {grade}</div>
            </div>
          ))}
        </div>
        <p className="text-xs mt-2 text-muted-foreground italic">
          * Grade 1: Excellent | Grade 2: Very Good | Grade 3: Good | Grade 4: Fair | 
          Grade 5: Average | Grade 6: Below Average | Grade 7: Needs Improvement
        </p>
      </div>

      {/* Result & Conduct */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h3 className="font-bold bg-gray-200 px-2 py-1 mb-2 text-sm">RESULT</h3>
          <div className={`border-2 p-4 text-center text-lg font-bold rounded ${
            result === 'Pass' ? 'border-success text-success bg-success/10' :
            result === 'Compartment' ? 'border-warning text-warning bg-warning/10' :
            'border-destructive text-destructive bg-destructive/10'
          }`}>
            {result.toUpperCase()}
          </div>
        </div>
        <div>
          <h3 className="font-bold bg-gray-200 px-2 py-1 mb-2 text-sm">CONDUCT & DISCIPLINE</h3>
          <div className="border-2 border-gray-300 p-4 text-center text-lg font-bold rounded bg-gray-50">
            {conduct.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Teacher's Remarks */}
      <div className="mb-4">
        <h3 className="font-bold bg-gray-200 px-2 py-1 mb-2 text-sm">CLASS TEACHER'S REMARKS</h3>
        <div className="border-2 border-gray-300 p-3 min-h-[60px] rounded bg-gray-50">
          <p className="italic">{remarks}</p>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-4 gap-3 text-xs text-center mt-8">
        <div>
          <div className="h-16"></div>
          <div className="border-t-2 border-gray-800 pt-1">
            <p className="font-semibold">Class Teacher</p>
            <p className="text-muted-foreground">Signature & Date</p>
          </div>
        </div>
        <div>
          <div className="h-16"></div>
          <div className="border-t-2 border-gray-800 pt-1">
            <p className="font-semibold">Subject Teacher</p>
            <p className="text-muted-foreground">Signature & Date</p>
          </div>
        </div>
        <div>
          <div className="w-20 h-20 mx-auto border-2 border-accent rounded-full flex items-center justify-center mb-2">
            <span className="text-accent font-bold text-xs text-center">SCHOOL<br/>SEAL</span>
          </div>
          <p className="font-semibold">Official Seal</p>
        </div>
        <div>
          <div className="h-16"></div>
          <div className="border-t-2 border-gray-800 pt-1">
            <p className="font-semibold">Principal</p>
            <p className="text-muted-foreground">Signature & Date</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-3 border-t-2 border-gray-300 text-center text-xs text-gray-500">
        <p>This is an official document issued by the school. Any tampering will render it invalid.</p>
        <p className="mt-1 font-semibold">For any queries, please contact the school examination department.</p>
      </div>
    </div>
  );
}
