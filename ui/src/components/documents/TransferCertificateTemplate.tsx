import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { generateTransferCertificate } from "@/utils/professionalCertificateGenerator";
import { useSchool } from "@/contexts/SchoolContext";
import { toast } from "sonner";
import { PdfPreviewModal } from "@/components/common/PdfPreviewModal";

/** Complete TC data â€” mirrors TransferCertificate entity + Student fields */
export interface TransferCertificateData {
  // Certificate meta
  tcNumber: string;
  issueDate: string;
  applicationDate?: string;

  // Student identifiers
  admissionNumber: string;
  srNo?: string;                // Serial / GR number in admission register
  penNumber?: string;

  // Student personal
  studentName: string;
  fatherName: string;
  motherName?: string;
  nationality?: string;
  religion?: string;
  category?: string;            // General, SC, ST, OBC, EWS
  caste?: string;
  dateOfBirth: string;          // dd/MM/yyyy
  dateOfBirthInWords?: string;

  // Academic
  dateOfAdmission: string;
  classAtAdmission?: string;
  academicYear: string;
  classAtLeaving: string;
  sectionAtLeaving?: string;
  workingDays?: number;
  presentDays?: number;

  // Examination
  lastAnnualExamResult?: string;       // Passed / Failed / Detained
  qualifiedForPromotion?: boolean;
  qualifiedToClass?: string;
  failedInLastClass?: boolean;
  detainedInSameClass?: boolean;

  // Fees
  feesDueCleared?: boolean;            // Whether all dues are cleared

  // Co-curricular
  ncc?: string;
  scouts?: string;
  sports?: string;
  games?: string;

  // Leaving details
  dateOfLeaving: string;
  reasonForLeaving: string;
  conduct: string;                     // Good / Very Good / Excellent / Satisfactory
  additionalRemarks?: string;

  // Issuing authority
  principalName?: string;
}

export function TransferCertificateTemplate(props: TransferCertificateData) {
  const { schoolInfo, loading } = useSchool();
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const {
    tcNumber, issueDate, applicationDate,
    admissionNumber, srNo, penNumber,
    studentName, fatherName, motherName, nationality = "Indian",
    religion, category, caste,
    dateOfBirth, dateOfBirthInWords,
    dateOfAdmission, classAtAdmission, academicYear,
    classAtLeaving, sectionAtLeaving, workingDays, presentDays,
    lastAnnualExamResult, qualifiedForPromotion, qualifiedToClass,
    failedInLastClass, detainedInSameClass,
    feesDueCleared,
    ncc, scouts, sports, games,
    dateOfLeaving, reasonForLeaving, conduct, additionalRemarks,
    principalName,
  } = props;

  const handlePreview = () => {
    if (!schoolInfo) { toast.error("School information not available"); return; }
    const url = generateTransferCertificate(schoolInfo, {
      certificateNumber: tcNumber,
      studentName, fatherName, motherName: motherName ?? '',
      nationality, religion, category, caste,
      class: classAtLeaving, section: sectionAtLeaving,
      dateOfBirth, admissionDate: dateOfAdmission,
      classAtAdmission, academicYear,
      dateOfLeaving, classAtLeaving,
      workingDays, presentDays,
      lastAnnualExamResult, qualifiedForPromotion, qualifiedToClass,
      failedInLastClass, detainedInSameClass,
      feesDueCleared, ncc, scouts, sports, games,
      conduct, reasonForLeaving, additionalRemarks,
      issueDate, principalName,
    });
    setPreviewUrl(url);
  };

  const schoolName = schoolInfo?.name ?? '';
  const att = (workingDays && presentDays)
    ? `${presentDays} / ${workingDays} days (${Math.round((presentDays / workingDays) * 100)}%)`
    : 'â€”';

  const rows: Array<[string, React.ReactNode]> = [
    ["1. Name of Student (in full)",              studentName],
    ["2. Father's Name",                           fatherName],
    ["3. Mother's Name",                           motherName ?? 'â€”'],
    ["4. Nationality",                             nationality],
    ...(religion ? [["5. Religion", religion] as [string, React.ReactNode]] : []),
    ...(category ? [["6. Category (SC/ST/OBC/Gen)", category + (caste ? ` â€” ${caste}` : '')] as [string, React.ReactNode]] : []),
    ["7. Date of Birth (as per records)",         dateOfBirth],
    ...(dateOfBirthInWords ? [["   (in words)", dateOfBirthInWords] as [string, React.ReactNode]] : []),
    ["8. Admission No. / Serial No.",              `${admissionNumber}${srNo ? ` / ${srNo}` : ''}`],
    ...(penNumber ? [["9. PEN Number", penNumber] as [string, React.ReactNode]] : []),
    ["10. Class in which admitted",               classAtAdmission ?? 'â€”'],
    ["11. Date of Admission",                      dateOfAdmission],
    ["12. Class in which studying (at leaving)",  `${classAtLeaving}${sectionAtLeaving ? ` â€” ${sectionAtLeaving}` : ''}`],
    ["13. Academic Year",                         academicYear],
    ["14. Date of Leaving",                       dateOfLeaving],
    ["15. Reason for Leaving",                    reasonForLeaving],
    ["16. Attendance (Present / Working Days)",   att],
    ["17. Whether failed in any class",           failedInLastClass ? "Yes" : "No"],
    ["18. Last Annual Exam Result",               lastAnnualExamResult ?? 'â€”'],
    ["19. Whether qualified for promotion",       qualifiedForPromotion === undefined ? 'â€”' : qualifiedForPromotion ? `Yes â€” to ${qualifiedToClass ?? 'next class'}` : "No"],
    ["20. Whether detained in same class",        detainedInSameClass ? "Yes" : "No"],
    ["21. NCC / NSS",                             ncc ?? 'â€”'],
    ["22. Scouts / Guides",                       scouts ?? 'â€”'],
    ["23. Games / Sports",                        sports ?? games ?? 'â€”'],
    ["24. All dues/fees cleared",                 feesDueCleared === undefined ? 'â€”' : feesDueCleared ? "Yes" : "No"],
    ["25. Character and Conduct",                 conduct],
    ...(additionalRemarks ? [["26. Remarks", additionalRemarks] as [string, React.ReactNode]] : []),
  ];

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-2 justify-end mb-4">
          <Button onClick={handlePreview} disabled={loading || !schoolInfo} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Preview & Print
          </Button>
        </div>

        <Card id="transfer-certificate" className="max-w-4xl mx-auto bg-white">
          <CardContent className="p-10">
            {/* Header */}
            <div className="text-center mb-6 border-b-2 border-blue-800 pb-4">
              {schoolInfo?.logoUrl && (
                <img src={schoolInfo.logoUrl} alt="logo"
                     className="h-16 w-16 object-contain rounded-full mx-auto mb-2" />
              )}
              <h1 className="text-2xl font-bold text-blue-800 uppercase">{schoolName}</h1>
              {schoolInfo?.address && (
                <p className="text-sm text-gray-600">{schoolInfo.address}</p>
              )}
              {(schoolInfo?.phone || schoolInfo?.email) && (
                <p className="text-xs text-gray-500">
                  {[schoolInfo.phone && `Tel: ${schoolInfo.phone}`, schoolInfo.email].filter(Boolean).join(' | ')}
                </p>
              )}
              {schoolInfo?.boardAffiliation && (
                <p className="text-xs text-gray-500">{schoolInfo.boardAffiliation}</p>
              )}
              <h2 className="text-xl font-bold mt-3 tracking-wider text-gray-800">
                TRANSFER CERTIFICATE / SCHOOL LEAVING CERTIFICATE
              </h2>
            </div>

            {/* TC meta */}
            <div className="flex justify-between text-sm mb-4">
              <div>
                <span className="font-semibold">TC No.: </span>
                <span className="font-bold text-blue-800">{tcNumber}</span>
              </div>
              <div>
                {applicationDate && (
                  <span className="mr-4">
                    <span className="font-semibold">Application Date: </span>{applicationDate}
                  </span>
                )}
                <span className="font-semibold">Date of Issue: </span>
                <span className="font-bold">{issueDate}</span>
              </div>
            </div>

            {/* Student Details Table */}
            <table className="w-full border border-gray-300 text-sm mb-6">
              <tbody>
                {rows.map(([label, value], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="border border-gray-300 p-2 font-medium w-5/12 text-gray-700">{label}</td>
                    <td className="border border-gray-300 p-2 font-semibold">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Certification paragraph */}
            <div className="text-sm leading-relaxed mb-6 text-justify">
              <p>
                Certified that the above particulars have been verified from the school records
                and are found to be correct. The student has {feesDueCleared ? "cleared all dues" : "outstanding dues on record"}.
                This certificate is issued on the request of the student / parent / guardian.
              </p>
            </div>

            {/* Signature Section */}
            <div className="flex justify-between items-end mt-10">
              <div className="text-center">
                <div className="h-12 w-40 border-b border-gray-400 mb-1"></div>
                <p className="text-xs font-medium text-gray-600">Class Teacher</p>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 border border-gray-300 mb-1 mx-auto flex items-end justify-center pb-1">
                  <p className="text-xs text-gray-400">Official Seal</p>
                </div>
              </div>
              <div className="text-center">
                <div className="h-12 w-40 border-b border-gray-400 mb-1"></div>
                <p className="text-xs font-medium text-gray-600">Principal / Head of Institution</p>
                {principalName && <p className="text-xs text-gray-500">{principalName}</p>}
              </div>
            </div>

            <div className="text-center mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-400 italic">
                This is a computer-generated certificate. Valid subject to verification of original school records.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <PdfPreviewModal
        open={!!previewUrl}
        onClose={() => setPreviewUrl("")}
        pdfUrl={previewUrl}
        fileName={`TC_${tcNumber}_${studentName.replace(/\s+/g, '_')}.pdf`}
      />
    </>
  );
}

