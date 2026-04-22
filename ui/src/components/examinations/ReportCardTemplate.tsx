
import { Award, Calendar, User, GraduationCap } from "lucide-react";

interface Subject {
  name: string;
  marksObtained: number;
  totalMarks: number;
  grade: string;
}

interface ReportCard {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  term: string;
  subjects: Subject[];
  totalMarks: number;
  totalObtained: number;
  percentage: number;
  grade: string;
  attendance: number;
  rank: number;
  remarks: string;
  generatedDate: string;
}

interface ReportCardTemplateProps {
  reportCard: ReportCard;
}

export function ReportCardTemplate({ reportCard }: ReportCardTemplateProps) {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': case 'A': return 'text-green-600';
      case 'B+': case 'B': return 'text-blue-600';
      case 'C+': case 'C': return 'text-yellow-600';
      case 'D': return 'text-orange-600';
      case 'F': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto" style={{ fontFamily: 'serif' }}>
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-blue-800 pb-6">
        <div className="flex items-center justify-center gap-4 mb-4">
          <GraduationCap className="h-12 w-12 text-blue-800" />
          <div>
            <h1 className="text-3xl font-bold text-blue-800">VITANA SCHOOLS</h1>
            <p className="text-gray-600">Academic Excellence Since 1985</p>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          <p>123 Education Street, Knowledge City, State - 12345</p>
          <p>Phone: +1 (555) 123-4567 | Email: info@vitanaSchools.edu</p>
        </div>
      </div>

      {/* Report Card Title */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-3 bg-blue-50 px-6 py-3 rounded-lg border-2 border-blue-200">
          <Award className="h-8 w-8 text-blue-800" />
          <h2 className="text-2xl font-bold text-blue-800 tracking-wide">
            ACADEMIC REPORT CARD
          </h2>
        </div>
      </div>

      {/* Student Information */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-700">Student Information</span>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-semibold">{reportCard.studentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Class:</span>
              <span className="font-semibold">{reportCard.class}-{reportCard.section}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Student ID:</span>
              <span className="font-semibold">{reportCard.studentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Attendance:</span>
              <span className="font-semibold">{reportCard.attendance}%</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-700">Academic Session</span>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Term:</span>
              <span className="font-semibold">{reportCard.term.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Session:</span>
              <span className="font-semibold">2024-25</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Report Date:</span>
              <span className="font-semibold">
                {new Date(reportCard.generatedDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Class Rank:</span>
              <span className="font-semibold">#{reportCard.rank}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Marks Table */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Subject-wise Performance</h3>
        <table className="w-full border-2 border-gray-300">
          <thead className="bg-blue-50">
            <tr>
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Subject</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Max Marks</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Marks Obtained</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Grade</th>
            </tr>
          </thead>
          <tbody>
            {reportCard.subjects.map((subject, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="border border-gray-300 px-4 py-3 font-medium">{subject.name}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{subject.totalMarks}</td>
                <td className="border border-gray-300 px-4 py-3 text-center font-semibold">
                  {subject.marksObtained}
                </td>
                <td className={`border border-gray-300 px-4 py-3 text-center font-bold ${getGradeColor(subject.grade)}`}>
                  {subject.grade}
                </td>
              </tr>
            ))}
            <tr className="bg-blue-100 font-bold">
              <td className="border border-gray-300 px-4 py-3">TOTAL</td>
              <td className="border border-gray-300 px-4 py-3 text-center">{reportCard.totalMarks}</td>
              <td className="border border-gray-300 px-4 py-3 text-center">{reportCard.totalObtained}</td>
              <td className={`border border-gray-300 px-4 py-3 text-center ${getGradeColor(reportCard.grade)}`}>
                {reportCard.grade}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <h4 className="font-semibold text-blue-800">Total Percentage</h4>
          <p className="text-2xl font-bold text-blue-900">{reportCard.percentage.toFixed(1)}%</p>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
          <h4 className="font-semibold text-green-800">Overall Grade</h4>
          <p className={`text-2xl font-bold ${getGradeColor(reportCard.grade)}`}>
            {reportCard.grade}
          </p>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
          <h4 className="font-semibold text-yellow-800">Class Position</h4>
          <p className="text-2xl font-bold text-yellow-900">#{reportCard.rank}</p>
        </div>
      </div>

      {/* Remarks */}
      <div className="mb-8">
        <h4 className="font-semibold mb-3 text-gray-800">Teacher's Remarks</h4>
        <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
          <p className="text-gray-700 italic">{reportCard.remarks}</p>
        </div>
      </div>

      {/* Signatures */}
      <div className="flex justify-between items-end pt-8">
        <div className="text-center">
          <div className="mb-16"></div>
          <div className="border-t-2 border-gray-800 pt-2">
            <p className="font-semibold">Class Teacher</p>
            <p className="text-sm text-gray-600">Signature & Date</p>
          </div>
        </div>
        
        <div className="text-center">
          <div className="w-24 h-24 rounded-full border-4 border-blue-800 flex items-center justify-center mb-4 mx-auto">
            <span className="text-blue-800 font-bold text-sm text-center">SCHOOL<br />SEAL</span>
          </div>
        </div>
        
        <div className="text-center">
          <div className="mb-16"></div>
          <div className="border-t-2 border-gray-800 pt-2">
            <p className="font-semibold">Principal</p>
            <p className="text-sm text-gray-600">Signature & Date</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300">
        <p className="text-center text-xs text-gray-500">
          This is a computer-generated report card. For any queries, please contact the school administration.
        </p>
      </div>
    </div>
  );
}
