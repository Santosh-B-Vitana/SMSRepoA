
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Student, Staff } from "../../services/mockApi";
import { QrCode } from "lucide-react";

interface IdCardTemplateProps {
  person: Student | Staff;
  type: 'student' | 'staff';
}

export function IdCardTemplate({ person, type }: IdCardTemplateProps) {
  const isStudent = type === 'student';
  const student = isStudent ? person as Student : null;
  const staff = !isStudent ? person as Staff : null;

  return (
    <div className="id-card-container" style={{ pageBreakAfter: 'always' }}>
      {isStudent ? (
        // Student ID Card based on reference image
        <Card className="w-80 h-96 mx-auto bg-white border-2 border-gray-800 relative overflow-hidden print:shadow-none">
          {/* Header with diagonal pattern */}
          <div className="bg-blue-900 text-white p-2 text-center relative">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10" 
                 style={{ clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%)' }}></div>
            <h3 className="font-bold text-xs">INDIAN EDUCATION SOCIETY</h3>
            <h2 className="font-bold text-sm">CHANDRAKANT PATKAR VIDYALAYA</h2>
            <p className="text-xs">ENGLISH MEDIUM, DOMBIVLI (E), Tel.: 025-6464468</p>
            <p className="text-xs font-bold mt-1">JUNE 2015-2016</p>
          </div>

          {/* Content Section */}
          <div className="flex p-3 bg-white">
            {/* Left side - Information */}
            <div className="flex-1 space-y-1">
              <div className="space-y-1 text-xs">
                <div className="flex">
                  <span className="w-12 font-medium">NAME :</span>
                  <span className="font-bold uppercase">{student?.name}</span>
                </div>
                <div className="flex">
                  <span className="w-12 font-medium">STD. :</span>
                  <span className="font-bold">{student?.class}</span>
                </div>
                <div className="flex">
                  <span className="w-12 font-medium">GR.NO. :</span>
                  <span className="font-bold">{student?.rollNo}</span>
                </div>
                <div className="flex">
                  <span className="w-12 font-medium">ADD. :</span>
                  <div className="font-bold text-xs leading-tight">
                    {student?.address || "16&17, GANESH PRASAD BLDG.,\nOPP.OM BUNGLOW, AYARE RD.,\nDOMBIVLI(E)"}
                  </div>
                </div>
                <div className="flex mt-2">
                  <span className="w-12 font-medium">PHONE :</span>
                  <span className="font-bold">{student?.guardianPhone || "2883033 / 9821463433"}</span>
                </div>
              </div>
              
              {/* Footer note */}
              <div className="mt-4 text-xs text-red-600">
                <p>This card is not transferrable. Loss of card to be reported</p>
                <p>to issuing authority. Duplicate card will be charged extra.</p>
                <p>Misuse in any form invite disciplinary action.</p>
              </div>
              
              {/* Signatures */}
              <div className="flex justify-between mt-3 text-xs">
                <div className="text-center">
                  <div className="font-bold">Principal</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">Hon.Secretary & IT CEO</div>
                </div>
              </div>
            </div>

            {/* Right side - Photo */}
            <div className="ml-3">
              <div className="w-20 h-24 bg-white border-2 border-gray-800 overflow-hidden">
                <img
                  src={`https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=96&fit=crop&crop=center`}
                  alt={person.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </Card>
      ) : (
        // Staff ID Card (existing design)
        <Card className="w-80 h-96 mx-auto bg-white border-2 border-gray-300 relative overflow-hidden print:shadow-none">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 text-center relative">
            <div className="absolute top-2 left-2 w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-blue-600 rounded-full"></div>
            </div>
            <h3 className="font-bold text-sm">ST. MARY'S SENIOR SECONDARY SCHOOL</h3>
            <p className="text-xs opacity-90">Affiliated to CBSE, New Delhi</p>
            <p className="text-xs opacity-80">School Code: 12345</p>
          </div>

          {/* Photo Section */}
          <div className="flex justify-center p-4 bg-gray-50">
            <div className="w-24 h-28 bg-gray-200 rounded border-2 border-gray-400 shadow-md overflow-hidden">
              <img
                src={`https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=120&fit=crop&crop=center`}
                alt={person.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Information Section */}
          <div className="px-4 space-y-2 bg-white">
            <div className="text-center border-b pb-2">
              <h4 className="font-bold text-base text-gray-800 uppercase">{person.name}</h4>
              <Badge variant="secondary" className="text-xs font-semibold">
                STAFF MEMBER
              </Badge>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span className="text-gray-600 font-medium">Designation:</span>
                <span className="font-bold text-xs">{staff?.designation}</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span className="text-gray-600 font-medium">Department:</span>
                <span className="font-bold">{staff?.department}</span>
              </div>
              <div className="flex justify-between border-b border-dotted border-gray-300 pb-1">
                <span className="text-gray-600 font-medium">Employee ID:</span>
                <span className="font-bold">{staff?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Joining Date:</span>
                <span className="font-bold text-xs">{new Date(2020, 3, 1).toLocaleDateString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white p-2">
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold">Valid till: {new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                <QrCode className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* School Logo Background */}
          <div className="absolute top-16 right-4 w-12 h-12 bg-blue-100 rounded-full opacity-20"></div>
        </Card>
      )}

      {/* Back of the card */}
      <Card className="w-80 h-96 mx-auto mt-4 bg-white border-2 border-gray-300 relative overflow-hidden print:shadow-none">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-blue-600 text-white p-3 text-center">
            <h4 className="font-bold text-sm">INSTRUCTIONS & EMERGENCY CONTACT</h4>
          </div>

          <div className="p-4 flex-1">
            <div className="space-y-3">
              <div>
                <h5 className="font-bold text-xs text-blue-600 mb-2">INSTRUCTIONS:</h5>
                <ul className="text-xs space-y-1 text-gray-700">
                  <li>• This card must be carried at all times on school premises</li>
                  <li>• Loss of card should be reported immediately</li>
                  <li>• Card is not transferable</li>
                  <li>• Present this card when requested by school authorities</li>
                </ul>
              </div>

              <div className="border-t pt-3">
                <h5 className="font-bold text-xs text-blue-600 mb-2">EMERGENCY CONTACT:</h5>
                <div className="space-y-1 text-xs">
                  {isStudent && student && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Guardian:</span>
                        <span className="font-medium">{student.guardianName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{student.guardianPhone}</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-gray-600">Address:</span>
                        <p className="text-xs mt-1 font-medium">{student.address}</p>
                      </div>
                    </>
                  )}
                  
                  {!isStudent && staff && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{staff.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium text-xs">{staff.email}</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-gray-600">Address:</span>
                        <p className="text-xs mt-1 font-medium">{staff.address}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-100 p-3 border-t">
            <p className="text-xs text-center text-gray-600 font-medium">
              If found, please return to St. Mary's Senior Secondary School
            </p>
            <p className="text-xs text-center text-gray-600 mt-1">
              123 Education Street, New Delhi - 110001 | Phone: +91-11-12345678
            </p>
            <p className="text-xs text-center text-gray-500 mt-1">
              Email: info@stmarysschool.edu.in | www.stmarysschool.edu.in
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
