
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode, School } from "lucide-react";

interface Person {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface Student extends Person {
  rollNo: string;
  class: string;
  section: string;
  guardianName: string;
  guardianPhone: string;
}

interface Staff extends Person {
  designation: string;
  department: string;
}

interface PrintableIdCardProps {
  person: Student | Staff;
  type: 'student' | 'staff';
}

export function PrintableIdCard({ person, type }: PrintableIdCardProps) {
  const isStudent = type === 'student';
  const student = isStudent ? person as Student : null;
  const staff = !isStudent ? person as Staff : null;

  return (
    <div className="print-page" style={{ pageBreakAfter: 'always' }}>
      <style>
        {`
          @media print {
            .print-page {
              margin: 0;
              padding: 20px;
              page-break-after: always;
            }
            .id-card-front, .id-card-back {
              width: 85.6mm;
              height: 53.98mm;
              margin: 10mm auto;
              box-shadow: none !important;
              border: 1px solid #000;
            }
          }
        `}
      </style>
      
      {/* Front Side */}
      <div className="id-card-front mb-8">
        <Card className="w-80 h-52 mx-auto bg-white border-2 border-gray-300 relative overflow-hidden print:shadow-none">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-3 text-center relative">
            <div className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <School className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-bold text-xs leading-tight">VITANA SCHOOLS</h3>
            <p className="text-xs opacity-90 leading-tight">Est. 1985 | CBSE Affiliated</p>
          </div>

          {/* Photo Section */}
          <div className="flex justify-center p-3 bg-gray-50">
            <div className="w-20 h-24 bg-gray-200 rounded border border-gray-400 shadow-sm overflow-hidden">
              <img
                src={`https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=96&fit=crop&crop=center`}
                alt={person.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Information Section */}
          <div className="px-3 pb-2 bg-white">
            <div className="text-center border-b border-gray-200 pb-1 mb-2">
              <h4 className="font-bold text-sm text-gray-800 uppercase leading-tight">
                {person.name}
              </h4>
              <Badge variant={isStudent ? "default" : "secondary"} className="text-xs mt-1">
                {isStudent ? "STUDENT" : "STAFF"}
              </Badge>
            </div>

            <div className="space-y-1 text-xs">
              {isStudent && student && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Class:</span>
                    <span className="font-semibold">{student.class}-{student.section}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Roll:</span>
                    <span className="font-semibold">{student.rollNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID:</span>
                    <span className="font-semibold text-xs">{student.id}</span>
                  </div>
                </>
              )}

              {!isStudent && staff && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dept:</span>
                    <span className="font-semibold text-xs">{staff.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID:</span>
                    <span className="font-semibold">{staff.id}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white px-2 py-1">
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-medium leading-tight">
                  Valid: {new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).getFullYear()}
                </p>
              </div>
              <QrCode className="h-4 w-4" />
            </div>
          </div>
        </Card>
      </div>

      {/* Back Side */}
      <div className="id-card-back">
        <Card className="w-80 h-52 mx-auto bg-white border-2 border-gray-300 relative overflow-hidden print:shadow-none">
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-blue-600 text-white p-2 text-center">
              <h4 className="font-bold text-xs">EMERGENCY CONTACT & GUIDELINES</h4>
            </div>

            <div className="p-3 flex-1 text-xs">
              <div className="space-y-2">
                <div>
                  <h5 className="font-bold text-blue-600 mb-1">CONTACT INFO:</h5>
                  {isStudent && student && (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Guardian:</span>
                        <span className="font-medium">{student.guardianName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Phone:</span>
                        <span className="font-medium">{student.guardianPhone}</span>
                      </div>
                    </div>
                  )}
                  
                  {!isStudent && staff && (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Phone:</span>
                        <span className="font-medium">{staff.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Email:</span>
                        <span className="font-medium text-xs">{staff.email}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t pt-2">
                  <h5 className="font-bold text-blue-600 mb-1">GUIDELINES:</h5>
                  <ul className="text-xs space-y-0.5 text-gray-700">
                    <li>• Always carry this ID on campus</li>
                    <li>• Report loss immediately</li>
                    <li>• Non-transferable</li>
                    <li>• Show when requested</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-100 p-2 border-t text-center">
              <p className="text-xs text-gray-600 font-medium leading-tight">
                If found, return to Vitana Schools
              </p>
              <p className="text-xs text-gray-600 leading-tight">
                123 Education St. | +1-555-123-4567
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
