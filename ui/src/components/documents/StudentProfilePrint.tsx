import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSchool } from "@/contexts/SchoolContext";
import { Student, GuardianDto, StudentDocumentDto } from "@/services/api/studentApi";

interface StudentProfilePrintProps {
  student: Student;
  guardians?: GuardianDto[];
  documents?: StudentDocumentDto[];
  academicYear?: string;
}

/**
 * Full student profile print — equivalent to v1's PrintStudent.html
 * Renders all sections: personal, academic, health, guardian, documents, etc.
 * Usage: wrap in a hidden div and call window.print(), or integrate with jsPDF.
 */
export function StudentProfilePrint({
  student,
  guardians = [],
  documents = [],
  academicYear,
}: StudentProfilePrintProps) {
  const { schoolInfo } = useSchool();

  const schoolName = schoolInfo?.name ?? '';
  const currentYear = academicYear ?? new Date().getFullYear().toString();
  const printDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const field = (label: string, value?: string | number | boolean | null, full = false) =>
    value != null && value !== "" && value !== false ? (
      <div className={full ? "col-span-2" : ""}>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">{label}</span>
        <span className="text-sm font-medium text-gray-800">{String(value)}</span>
      </div>
    ) : null;

  const primaryGuardian = guardians.find(g => g.isPrimary) ?? guardians[0];

  return (
    <div className="student-profile-print bg-white text-black font-sans max-w-5xl mx-auto p-8 print:p-4">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b-2 border-blue-800 pb-4 mb-6">
        <div className="flex items-center gap-4">
          {schoolInfo?.logoUrl && (
            <img src={schoolInfo.logoUrl} alt="logo" className="h-14 w-14 object-contain rounded-full" />
          )}
          <div>
            <h1 className="text-xl font-bold text-blue-800 uppercase">{schoolName}</h1>
            {schoolInfo?.address && <p className="text-xs text-gray-600">{schoolInfo.address}</p>}
            {schoolInfo?.boardAffiliation && <p className="text-xs text-gray-500">{schoolInfo.boardAffiliation}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Academic Year: <span className="font-semibold">{currentYear}</span></p>
          <p className="text-xs text-gray-500">Printed: {printDate}</p>
          <p className="text-xs text-gray-500">Adm. No.: <span className="font-bold text-blue-700">{student.admissionNumber}</span></p>
        </div>
      </div>

      {/* Student Banner */}
      <div className="flex items-start gap-6 mb-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
        <div className="w-24 h-28 bg-gray-200 border-2 border-gray-300 rounded overflow-hidden flex-shrink-0">
          {student.photoUrl ? (
            <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 text-center px-1">PHOTO</div>
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 uppercase">{student.name}</h2>
          <div className="flex flex-wrap gap-2 mt-1 mb-2">
            <Badge variant="outline" className="text-blue-700 border-blue-300 text-xs">
              Class {student.class} – {student.section}
            </Badge>
            {student.rollNumber && (
              <Badge variant="outline" className="text-green-700 border-green-300 text-xs">
                Roll No. {student.rollNumber}
              </Badge>
            )}
            {(student as any).category && (
              <Badge variant="outline" className="text-purple-700 border-purple-300 text-xs">
                {(student as any).category}
              </Badge>
            )}
            {(student as any).bloodGroup && (
              <Badge variant="destructive" className="text-xs">
                {(student as any).bloodGroup}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {field("Father's Name", student.guardianName)}
            {field("Phone", student.guardianPhone)}
            {field("Date of Birth", student.dateOfBirth)}
            {field("Date of Admission", student.dateOfAdmission)}
            {field("Address", student.address, true)}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Section 1: Personal Information */}
        <section>
          <SectionHeading title="1. Personal Information" />
          <div className="grid grid-cols-3 gap-3 mt-2">
            {field("Full Name", student.name)}
            {field("Admission Number", student.admissionNumber)}
            {field("Roll Number", student.rollNumber)}
            {field("Date of Birth", student.dateOfBirth)}
            {field("Gender", (student as any).gender)}
            {field("Nationality", (student as any).nationality)}
            {field("Religion", (student as any).religion)}
            {field("Category", (student as any).category)}
            {field("Caste", (student as any).caste)}
            {field("Mother Tongue", (student as any).motherTongue)}
            {field("Blood Group", (student as any).bloodGroup)}
            {field("Height (cm)", (student as any).height)}
            {field("Weight (kg)", (student as any).weight)}
            {field("Address", student.address, true)}
          </div>
        </section>

        {/* Section 2: Government IDs */}
        {hasAny(student, ["aadharNumber", "birthCertificateNumber", "uidaiNumber", "penNumber", "srNo", "grNo", "passportNumber", "rationCardNumber"]) && (
          <section>
            <SectionHeading title="2. Government IDs / Registration Numbers" />
            <div className="grid grid-cols-3 gap-3 mt-2">
              {field("Aadhaar Number", (student as any).aadharNumber)}
              {field("Birth Certificate No.", (student as any).birthCertificateNumber)}
              {field("UIDAI / EID", (student as any).uidaiNumber)}
              {field("PEN Number", (student as any).penNumber)}
              {field("SR No. / GR No.", (student as any).srNo ?? (student as any).grNo)}
              {field("Passport Number", (student as any).passportNumber)}
              {field("Ration Card No.", (student as any).rationCardNumber)}
            </div>
          </section>
        )}

        {/* Section 3: Academic */}
        <section>
          <SectionHeading title="3. Academic Details" />
          <div className="grid grid-cols-3 gap-3 mt-2">
            {field("Class", student.class)}
            {field("Section", student.section)}
            {field("Academic Year", academicYear)}
            {field("Date of Admission", student.dateOfAdmission)}
            {field("Previous Class", (student as any).previousClass)}
            {field("Board", (student as any).board ?? schoolInfo?.boardAffiliation)}
            {field("Quota / Allocation", (student as any).quota)}
            {field("Bus Route", (student as any).busRoute)}
            {field("Bus Stop", (student as any).busStop)}
          </div>
        </section>

        {/* Section 4: Health */}
        {hasAny(student, ["bloodGroup", "height", "weight", "medicalConditions", "allergies", "vaccinations", "specialNeeds", "disability"]) && (
          <section>
            <SectionHeading title="4. Health & Medical" />
            <div className="grid grid-cols-3 gap-3 mt-2">
              {field("Blood Group", (student as any).bloodGroup)}
              {field("Height (cm)", (student as any).height)}
              {field("Weight (kg)", (student as any).weight)}
              {field("Medical Conditions", (student as any).medicalConditions, true)}
              {field("Allergies", (student as any).allergies, true)}
              {field("Vaccinations", (student as any).vaccinations, true)}
              {field("Special Needs / Disability", (student as any).disability ?? (student as any).specialNeeds, true)}
            </div>
          </section>
        )}

        {/* Section 5: Guardians */}
        {guardians.length > 0 && (
          <section>
            <SectionHeading title="5. Guardian / Parent Details" />
            <div className="space-y-3 mt-2">
              {guardians.map((g, i) => (
                <div key={g.id ?? i} className="border rounded p-3 grid grid-cols-3 gap-3">
                  <div className="col-span-3 flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm uppercase">{g.name}</span>
                    <Badge variant="outline" className="text-xs">{g.relation}</Badge>
                    {g.isPrimary && <Badge className="text-xs bg-blue-600">Primary</Badge>}
                  </div>
                  {field("Occupation", g.occupation)}
                  {field("Phone", g.phone)}
                  {field("Email", g.email)}
                  {field("Office Phone", (g as any).officePhone)}
                  {field("Annual Income", (g as any).annualIncome)}
                  {field("Education", (g as any).education)}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 6: Documents */}
        {documents.length > 0 && (
          <section>
            <SectionHeading title="6. Documents Submitted" />
            <table className="w-full border text-xs mt-2">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Document Type</th>
                  <th className="border p-2 text-left">Document Number</th>
                  <th className="border p-2 text-left">Status</th>
                  <th className="border p-2 text-left">Verified</th>
                  <th className="border p-2 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, i) => (
                  <tr key={doc.id ?? i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border p-2">{doc.documentType}</td>
                    <td className="border p-2">{doc.documentNumber ?? '—'}</td>
                    <td className="border p-2">
                      <Badge variant={doc.isVerified ? "default" : "secondary"} className="text-xs">
                        {doc.isVerified ? "Verified" : "Pending"}
                      </Badge>
                    </td>
                    <td className="border p-2">{doc.isVerified ? "Yes" : "No"}</td>
                    <td className="border p-2">{(doc as any).remarks ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Signature Block */}
        <div className="flex justify-between items-end mt-12 border-t pt-6">
          <div className="text-center">
            <div className="h-10 w-36 border-b border-gray-400 mb-1"></div>
            <p className="text-xs text-gray-600">Class Teacher</p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 border border-gray-300 mb-1 mx-auto flex items-end justify-center pb-1">
              <p className="text-xs text-gray-400">Seal</p>
            </div>
          </div>
          <div className="text-center">
            <div className="h-10 w-36 border-b border-gray-400 mb-1"></div>
            <p className="text-xs text-gray-600">Principal</p>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 italic mt-4">
          Computer generated profile — {schoolName} — {printDate}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <div className="h-4 w-1 bg-blue-800 rounded"></div>
      <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide">{title}</h3>
    </div>
  );
}

function hasAny(obj: Record<string, unknown>, keys: string[]): boolean {
  return keys.some(k => obj[k] != null && obj[k] !== "");
}
