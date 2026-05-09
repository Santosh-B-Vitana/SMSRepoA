import { Card } from "@/components/ui/card";
import { QrCode } from "lucide-react";
import { useSchool } from "@/contexts/SchoolContext";
import { Staff } from "@/services/api/staffApi";

interface StaffIdCardTemplateProps {
  staff: Staff;
  academicYear?: string;
}

export function StaffIdCardTemplate({ staff, academicYear }: StaffIdCardTemplateProps) {
  const { schoolInfo } = useSchool();

  const schoolName = schoolInfo?.name ?? 'School';
  const schoolAddress = schoolInfo?.address ?? '';
  const schoolPhone = schoolInfo?.phone ?? '';
  const schoolEmail = schoolInfo?.email ?? '';
  const schoolWebsite = schoolInfo?.websiteUrl ?? '';
  const boardAffiliation = schoolInfo?.boardAffiliation ?? '';
  const currentYear = academicYear ?? new Date().getFullYear().toString();

  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  return (
    <div className="id-card-container" style={{ pageBreakAfter: 'always' }}>
      {/* Front of Staff ID Card */}
      <Card className="w-80 h-96 mx-auto bg-white border-2 border-gray-800 relative overflow-hidden print:shadow-none">
        <div className="bg-green-800 text-white p-2 text-center relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10"
               style={{ clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%)' }}></div>
          {schoolInfo?.logoUrl && (
            <img src={schoolInfo.logoUrl} alt="logo"
                 className="absolute left-2 top-1 h-8 w-8 object-contain rounded-full" />
          )}
          <h2 className="font-bold text-sm uppercase leading-tight">{schoolName}</h2>
          {boardAffiliation && <p className="text-xs opacity-90">{boardAffiliation}</p>}
          {schoolPhone && <p className="text-xs opacity-80">Tel.: {schoolPhone}</p>}
          <p className="text-xs font-bold mt-1">ACADEMIC YEAR {currentYear}</p>
        </div>

        <div className="flex p-3 bg-white">
          <div className="flex-1 space-y-1">
            <div className="space-y-1 text-xs">
              <div className="flex">
                <span className="w-14 font-medium">NAME :</span>
                <span className="font-bold uppercase">{staff.firstName} {staff.lastName}</span>
              </div>
              <div className="flex">
                <span className="w-14 font-medium">DESIG. :</span>
                <span className="font-bold">{staff.designation}</span>
              </div>
              <div className="flex">
                <span className="w-14 font-medium">DEPT. :</span>
                <span className="font-bold">{staff.department}</span>
              </div>
              <div className="flex">
                <span className="w-14 font-medium">EMP.ID :</span>
                <span className="font-bold">{staff.employeeId}</span>
              </div>
              {staff.address && (
                <div className="flex">
                  <span className="w-14 font-medium">ADD. :</span>
                  <div className="font-bold text-xs leading-tight flex-1">{staff.address}</div>
                </div>
              )}
              <div className="flex mt-1">
                <span className="w-14 font-medium">PHONE :</span>
                <span className="font-bold">{staff.phone}</span>
              </div>
            </div>

            <div className="mt-3 text-xs text-red-600 leading-tight">
              <p>This card is not transferable. Loss of card to be reported</p>
              <p>to issuing authority. Duplicate card will be charged extra.</p>
            </div>

            <div className="flex justify-between mt-2 text-xs">
              <span className="font-bold">Principal</span>
              <span className="font-bold">HR / Admin</span>
            </div>
          </div>

          <div className="ml-3 flex-shrink-0">
            <div className="w-20 h-24 bg-gray-100 border-2 border-gray-800 overflow-hidden">
              {staff.profilePhoto ? (
                <img src={staff.profilePhoto} alt={staff.name}
                     className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center px-1">PHOTO</div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Back of Card */}
      <Card className="w-80 h-96 mx-auto mt-4 bg-white border-2 border-gray-300 relative overflow-hidden print:shadow-none">
        <div className="h-full flex flex-col">
          <div className="bg-green-800 text-white p-3 text-center">
            <h4 className="font-bold text-sm">INSTRUCTIONS & EMERGENCY CONTACT</h4>
          </div>

          <div className="p-4 flex-1">
            <div className="space-y-3">
              <div>
                <h5 className="font-bold text-xs text-green-700 mb-2">INSTRUCTIONS:</h5>
                <ul className="text-xs space-y-1 text-gray-700">
                  <li>â€¢ This card must be carried at all times on school premises</li>
                  <li>â€¢ Loss of card should be reported immediately</li>
                  <li>â€¢ Card is not transferable</li>
                  <li>â€¢ Present this card when requested by school authorities</li>
                  <li>â€¢ Maintain professional conduct while representing the school</li>
                </ul>
              </div>

              <div className="border-t pt-3">
                <h5 className="font-bold text-xs text-green-700 mb-2">EMERGENCY CONTACT:</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{staff.phone}</span>
                  </div>
                  {staff.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium text-xs">{staff.email}</span>
                    </div>
                  )}
                  {staff.emergencyContactName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Emergency:</span>
                      <span className="font-medium">{staff.emergencyContactName} ({staff.emergencyContactPhone})</span>
                    </div>
                  )}
                  {staff.address && (
                    <div className="mt-1">
                      <span className="text-gray-600">Address:</span>
                      <p className="text-xs mt-0.5 font-medium">{staff.address}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-xs text-gray-600">
                  Valid till: {validUntil.toLocaleDateString('en-IN')}
                </span>
                <div className="w-8 h-8 bg-white border border-gray-300 rounded flex items-center justify-center">
                  <QrCode className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-2 border-t">
            <p className="text-xs text-center text-gray-600 font-medium">
              If found, please return to {schoolName}
            </p>
            {schoolAddress && <p className="text-xs text-center text-gray-500 mt-0.5">{schoolAddress}</p>}
            {(schoolPhone || schoolEmail) && (
              <p className="text-xs text-center text-gray-500 mt-0.5">
                {[schoolPhone && `Tel: ${schoolPhone}`, schoolEmail].filter(Boolean).join(' | ')}
              </p>
            )}
            {schoolWebsite && <p className="text-xs text-center text-gray-400 mt-0.5">{schoolWebsite}</p>}
          </div>
        </div>
      </Card>
    </div>
  );
}

