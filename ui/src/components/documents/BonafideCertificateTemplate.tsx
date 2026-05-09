import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { generateBonafideCertificate } from "@/utils/professionalCertificateGenerator";
import { useSchool } from "@/contexts/SchoolContext";
import { toast } from "sonner";
import { PdfPreviewModal } from "@/components/common/PdfPreviewModal";

export interface BonafideCertificateData {
  // Certificate meta
  certificateNumber: string;
  issueDate: string;
  purpose: string;

  // Student personal
  studentName: string;
  fatherName: string;
  motherName?: string;
  dateOfBirth?: string;
  nationality?: string;
  religion?: string;
  category?: string;    // General / SC / ST / OBC / EWS
  caste?: string;
  bloodGroup?: string;
  gender?: "male" | "female" | "other";

  // Academic
  admissionNumber: string;
  rollNumber?: string;
  className: string;
  section?: string;
  academicYear: string;

  // Issuing authority
  principalName?: string;
  additionalRemarks?: string;
}

export function BonafideCertificateTemplate(props: BonafideCertificateData) {
  const { schoolInfo, loading } = useSchool();
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const {
    certificateNumber, issueDate, purpose,
    studentName, fatherName, motherName, dateOfBirth, nationality = "Indian",
    religion, category, caste, bloodGroup, gender,
    admissionNumber, rollNumber, className, section, academicYear,
    principalName, additionalRemarks,
  } = props;

  const salutation = gender === "female" ? "Ms." : "Mr.";
  const pronoun    = gender === "female" ? "She" : "He";
  const possessive = gender === "female" ? "her" : "his";

  const handlePreview = () => {
    if (!schoolInfo) { toast.error("School information not available"); return; }
    const url = generateBonafideCertificate(schoolInfo, {
      certificateNumber, studentName, fatherName, motherName,
      class: className, section: section ?? '',
      studentId: admissionNumber, rollNumber,
      dateOfBirth, nationality, religion, category, caste, bloodGroup,
      academicYear, purpose, issueDate, principalName,
    });
    setPreviewUrl(url);
  };

  const schoolName = schoolInfo?.name ?? '';

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-2 justify-end mb-4">
          <Button onClick={handlePreview} disabled={loading || !schoolInfo} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Preview & Print
          </Button>
        </div>

        <Card id="bonafide-certificate" className="max-w-4xl mx-auto bg-white">
          <CardContent className="p-12">
            {/* Header */}
            <div className="text-center mb-8 border-b-2 border-blue-800 pb-6">
              {schoolInfo?.logoUrl && (
                <img src={schoolInfo.logoUrl} alt="logo"
                     className="h-16 w-16 object-contain rounded-full mx-auto mb-2" />
              )}
              <h1 className="text-2xl font-bold text-blue-800 uppercase">{schoolName}</h1>
              {schoolInfo?.address && <p className="text-sm text-gray-600">{schoolInfo.address}</p>}
              {(schoolInfo?.phone || schoolInfo?.email) && (
                <p className="text-xs text-gray-500">
                  {[schoolInfo.phone && `Tel: ${schoolInfo.phone}`, schoolInfo.email].filter(Boolean).join(' | ')}
                </p>
              )}
              {schoolInfo?.boardAffiliation && <p className="text-xs text-gray-500">{schoolInfo.boardAffiliation}</p>}
              <h2 className="text-xl font-bold mt-4 tracking-widest text-gray-700">
                BONAFIDE CERTIFICATE
              </h2>
            </div>

            {/* Ref & Date */}
            <div className="flex justify-between text-sm mb-6">
              <p><span className="font-semibold">Certificate No.: </span><span className="font-bold text-blue-800">{certificateNumber}</span></p>
              <p><span className="font-semibold">Date: </span><span className="font-bold">{issueDate}</span></p>
            </div>

            {/* TO WHOM */}
            <p className="font-bold text-base mb-6">TO WHOM IT MAY CONCERN</p>

            {/* Body Paragraph */}
            <div className="text-base leading-8 text-justify space-y-4">
              <p>
                This is to certify that <span className="font-bold">{salutation} {studentName}</span>,&nbsp;
                Son/Daughter of <span className="font-bold">{fatherName}</span>
                {motherName && <> and <span className="font-bold">{motherName}</span></>},&nbsp;
                is a bonafide student of this school.
              </p>

              {/* Student Details Table */}
              <table className="w-full text-sm border border-gray-300 my-4">
                <tbody>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 p-2 font-medium w-1/3">Admission Number</td>
                    <td className="border border-gray-300 p-2 font-semibold">{admissionNumber}</td>
                    <td className="border border-gray-300 p-2 font-medium">Academic Year</td>
                    <td className="border border-gray-300 p-2 font-semibold">{academicYear}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Class / Section</td>
                    <td className="border border-gray-300 p-2 font-semibold">{className}{section ? ` â€” ${section}` : ''}</td>
                    {rollNumber && <>
                      <td className="border border-gray-300 p-2 font-medium">Roll No.</td>
                      <td className="border border-gray-300 p-2 font-semibold">{rollNumber}</td>
                    </>}
                  </tr>
                  {dateOfBirth && (
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-2 font-medium">Date of Birth</td>
                      <td className="border border-gray-300 p-2 font-semibold">{dateOfBirth}</td>
                      <td className="border border-gray-300 p-2 font-medium">Nationality</td>
                      <td className="border border-gray-300 p-2 font-semibold">{nationality}</td>
                    </tr>
                  )}
                  {(religion || category) && (
                    <tr>
                      {religion && <>
                        <td className="border border-gray-300 p-2 font-medium">Religion</td>
                        <td className="border border-gray-300 p-2 font-semibold">{religion}</td>
                      </>}
                      {category && <>
                        <td className="border border-gray-300 p-2 font-medium">Category</td>
                        <td className="border border-gray-300 p-2 font-semibold">{category}{caste ? ` / ${caste}` : ''}</td>
                      </>}
                    </tr>
                  )}
                  {bloodGroup && (
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-2 font-medium">Blood Group</td>
                      <td className="border border-gray-300 p-2 font-semibold">{bloodGroup}</td>
                      <td className="border border-gray-300 p-2 font-medium">Purpose</td>
                      <td className="border border-gray-300 p-2 font-semibold">{purpose}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <p>
                {pronoun} bears a good moral character and is regular in attendance. This certificate
                is issued on {possessive} request for the purpose of <span className="font-bold">{purpose}</span>.
              </p>
              {additionalRemarks && <p>{additionalRemarks}</p>}
              <p>We wish {possessive} all success in {possessive} future endeavours.</p>
            </div>

            {/* Signature Section */}
            <div className="flex justify-between items-end mt-12">
              <div className="text-center">
                <div className="h-14 w-40 border-b border-gray-400 mb-1"></div>
                <p className="text-xs font-medium text-gray-600">Class Teacher</p>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 border border-gray-300 mb-1 mx-auto flex items-end justify-center pb-1">
                  <p className="text-xs text-gray-400">Official Seal</p>
                </div>
              </div>
              <div className="text-center">
                <div className="h-14 w-40 border-b border-gray-400 mb-1"></div>
                <p className="text-xs font-medium text-gray-600">Principal / Head of Institution</p>
                {principalName && <p className="text-xs text-gray-500">{principalName}</p>}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-400 italic">
                This certificate is issued based on school records and is valid for official purposes only.
                Verification available at school office.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <PdfPreviewModal
        open={!!previewUrl}
        onClose={() => setPreviewUrl("")}
        pdfUrl={previewUrl}
        fileName={`Bonafide_${certificateNumber}_${studentName.replace(/\s+/g, '_')}.pdf`}
      />
    </>
  );
}


