import { Card } from "@/components/ui/card";
import { QrCode } from "lucide-react";
import { useSchool } from "@/contexts/SchoolContext";
import { GuardianDto, Student } from "@/services/api/studentApi";

export interface ParentCardData {
  parentName: string;
  relation: string;         // father, mother, guardian
  phone: string;
  email?: string;
  address?: string;
  photoUrl?: string;
  occupation?: string;
  children: Array<{
    name: string;
    admissionNumber: string;
    class: string;
    section: string;
  }>;
  cardNumber?: string;
  issuedDate?: string;
}

interface ParentIdCardTemplateProps {
  data: ParentCardData;
  academicYear?: string;
}

export function ParentIdCardTemplate({ data, academicYear }: ParentIdCardTemplateProps) {
  const { schoolInfo } = useSchool();

  const schoolName   = schoolInfo?.name    ?? 'School';
  const schoolAddress = schoolInfo?.address ?? '';
  const schoolPhone  = schoolInfo?.phone   ?? '';
  const schoolEmail  = schoolInfo?.email   ?? '';
  const schoolWebsite = schoolInfo?.websiteUrl ?? '';
  const boardAffiliation = schoolInfo?.boardAffiliation ?? '';
  const currentYear  = academicYear ?? new Date().getFullYear().toString();

  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  const relationLabel =
    data.relation === 'father'   ? "FATHER" :
    data.relation === 'mother'   ? "MOTHER" :
    data.relation === 'guardian' ? "GUARDIAN" :
    data.relation.toUpperCase();

  return (
    <div className="id-card-container" style={{ pageBreakAfter: 'always' }}>
      {/* Front of Parent ID Card */}
      <Card className="w-80 h-96 mx-auto bg-white border-2 border-gray-800 relative overflow-hidden print:shadow-none">
        {/* Header */}
        <div className="bg-purple-900 text-white p-2 text-center relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10"
               style={{ clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%)' }}></div>
          {schoolInfo?.logoUrl && (
            <img src={schoolInfo.logoUrl} alt="logo"
                 className="absolute left-2 top-1 h-8 w-8 object-contain rounded-full" />
          )}
          <h2 className="font-bold text-sm uppercase leading-tight">{schoolName}</h2>
          {boardAffiliation && <p className="text-xs opacity-90">{boardAffiliation}</p>}
          {schoolPhone && <p className="text-xs opacity-80">Tel.: {schoolPhone}</p>}
          <p className="text-xs font-bold mt-1">{currentYear}</p>
        </div>

        {/* PARENT / GUARDIAN label strip */}
        <div className="bg-purple-100 text-purple-900 text-center py-0.5">
          <span className="text-xs font-bold tracking-widest">PARENT / GUARDIAN IDENTITY CARD</span>
        </div>

        {/* Content */}
        <div className="flex p-3 bg-white">
          <div className="flex-1 space-y-1">
            <div className="space-y-1 text-xs">
              <div className="flex">
                <span className="w-14 font-medium">NAME :</span>
                <span className="font-bold uppercase">{data.parentName}</span>
              </div>
              <div className="flex">
                <span className="w-14 font-medium">REL. :</span>
                <span className="font-bold">{relationLabel}</span>
              </div>
              {data.occupation && (
                <div className="flex">
                  <span className="w-14 font-medium">OCC. :</span>
                  <span className="font-bold">{data.occupation}</span>
                </div>
              )}
              <div className="flex">
                <span className="w-14 font-medium">PHONE :</span>
                <span className="font-bold">{data.phone}</span>
              </div>

              {/* Children */}
              <div className="mt-1 border-t pt-1">
                <span className="font-medium text-xs text-gray-600">WARD(S):</span>
                {data.children.map((child, i) => (
                  <div key={i} className="text-xs leading-tight ml-1">
                    <span className="font-bold">{child.name}</span>
                    <span className="text-gray-600"> – {child.class}-{child.section} ({child.admissionNumber})</span>
                  </div>
                ))}
              </div>

              {data.address && (
                <div className="flex mt-1">
                  <span className="w-14 font-medium shrink-0">ADD. :</span>
                  <div className="font-bold text-xs leading-tight flex-1">{data.address}</div>
                </div>
              )}
            </div>

            <div className="mt-2 text-xs text-red-600 leading-tight">
              <p>This card is not transferable. Report loss immediately.</p>
            </div>

            <div className="flex justify-between mt-2 text-xs">
              <span className="font-bold">Principal</span>
              <span className="font-bold">Admin</span>
            </div>
          </div>

          {/* Photo */}
          <div className="ml-3 flex-shrink-0">
            <div className="w-20 h-24 bg-gray-100 border-2 border-gray-800 overflow-hidden">
              {data.photoUrl ? (
                <img src={data.photoUrl} alt={data.parentName}
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
          <div className="bg-purple-900 text-white p-3 text-center">
            <h4 className="font-bold text-sm">INSTRUCTIONS & AUTHORISATION</h4>
          </div>

          <div className="p-4 flex-1">
            <div className="space-y-3">
              <div>
                <h5 className="font-bold text-xs text-purple-700 mb-2">INSTRUCTIONS:</h5>
                <ul className="text-xs space-y-1 text-gray-700">
                  <li>• This card must be presented when collecting your ward</li>
                  <li>• Card is not transferable to any other person</li>
                  <li>• Loss of card should be reported immediately to school</li>
                  <li>• Authorised person details are maintained on school records</li>
                  <li>• School reserves the right to verify identity at any time</li>
                  <li>• Any misuse may result in denial of school entry</li>
                </ul>
              </div>

              {data.cardNumber && (
                <div className="border-t pt-3">
                  <h5 className="font-bold text-xs text-purple-700 mb-1">CARD DETAILS:</h5>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Card No:</span>
                      <span className="font-bold">{data.cardNumber}</span>
                    </div>
                    {data.issuedDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Issued:</span>
                        <span className="font-medium">{new Date(data.issuedDate).toLocaleDateString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valid till:</span>
                      <span className="font-medium">{validUntil.toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center border-t pt-2 mt-1">
                <span className="text-xs text-gray-600">Scan QR for verification</span>
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

/** Helper: convert Student + Guardian to ParentCardData */
export function buildParentCardData(student: Student, guardian: GuardianDto): ParentCardData {
  return {
    parentName: guardian.name,
    relation: guardian.relation,
    phone: guardian.phone,
    email: guardian.email,
    address: student.address,
    occupation: guardian.occupation,
    children: [{
      name: student.name,
      admissionNumber: student.admissionNumber,
      class: student.class,
      section: student.section,
    }],
  };
}
