import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StudentDocumentDto, studentApi } from "@/services/api/studentApi";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  FolderOpen,
} from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────

export const DOCUMENT_TYPES: { value: string; label: string; required?: boolean }[] = [
  { value: "birth_certificate",    label: "Birth Certificate",           required: true },
  { value: "transfer_certificate", label: "Transfer Certificate (Previous School)", required: false },
  { value: "aadhar",              label: "Aadhar Card",                  required: true },
  { value: "passport",            label: "Passport",                    required: false },
  { value: "marksheet",          label: "Previous School Marksheet",    required: false },
  { value: "caste_certificate",  label: "Caste Certificate",            required: false },
  { value: "income_certificate", label: "Income Certificate",           required: false },
  { value: "address_proof",      label: "Address Proof",                required: true },
  { value: "medical_certificate",label: "Medical / Fitness Certificate", required: false },
  { value: "photo",              label: "Passport Size Photo",          required: true },
  { value: "other",              label: "Other",                        required: false },
];

const DOCUMENT_LABEL: Record<string, string> = Object.fromEntries(
  DOCUMENT_TYPES.map((d) => [d.value, d.label])
);

const TYPE_BADGE_COLOR: Record<string, string> = {
  birth_certificate:    "bg-green-100 text-green-800",
  transfer_certificate: "bg-blue-100 text-blue-800",
  aadhar:              "bg-yellow-100 text-yellow-800",
  passport:            "bg-purple-100 text-purple-800",
  marksheet:           "bg-indigo-100 text-indigo-800",
  caste_certificate:   "bg-orange-100 text-orange-800",
  income_certificate:  "bg-teal-100 text-teal-800",
  address_proof:       "bg-cyan-100 text-cyan-800",
  medical_certificate: "bg-red-100 text-red-800",
  photo:               "bg-pink-100 text-pink-800",
  other:               "bg-gray-100 text-gray-700",
};

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_MB = 10;

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  studentId: string;
  studentName?: string;
  /** When true, shows the required-document checklist banner */
  showRequiredChecklist?: boolean;
}

export function StudentDocumentUpload({ studentId, studentName, showRequiredChecklist }: Props) {
  const [documents, setDocuments] = useState<StudentDocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [docType, setDocType] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchDocuments = async () => {
    try {
      setError(null);
      const docs = await studentApi.getDocuments(studentId);
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch {
      setError("Could not load documents. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) fetchDocuments();
  }, [studentId]);

  // ── Upload ─────────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error("Only PDF, JPG, PNG, or WEBP files are allowed.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File must be under ${MAX_MB} MB.`);
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!docType || !selectedFile) {
      toast.error("Select a document type and file.");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await studentApi.uploadDocument(studentId, docType, selectedFile);
      setDocuments((prev) => [uploaded, ...prev]);
      toast.success("Document uploaded successfully.");
      setDialogOpen(false);
      setDocType("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (docId: string) => {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setDeletingId(docId);
    try {
      await studentApi.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast.success("Document deleted.");
    } catch {
      toast.error("Could not delete. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Required checklist ─────────────────────────────────────────────────────

  const uploadedTypes = new Set(documents.map((d) => d.documentType));
  const requiredTypes = DOCUMENT_TYPES.filter((t) => t.required);
  const missingRequired = requiredTypes.filter((t) => !uploadedTypes.has(t.value));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-5 w-5" />
            Student Documents
            {studentName && <span className="font-normal text-muted-foreground">— {studentName}</span>}
          </CardTitle>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Required checklist banner */}
          {showRequiredChecklist && missingRequired.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Missing required documents</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {missingRequired.map((t) => t.label).join(", ")}
                </p>
              </div>
            </div>
          )}

          {/* Document list */}
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading documents…
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 py-4 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No documents uploaded yet.</p>
              <p className="text-xs mt-1">
                Use the Upload button to attach birth certificate, Aadhar, TC and other records.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Type</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Uploaded On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          TYPE_BADGE_COLOR[doc.documentType] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {DOCUMENT_LABEL[doc.documentType] ?? doc.documentType}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {doc.fileName ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(doc.uploadedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {doc.fileUrl && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            asChild
                          >
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" title="View / Download">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          disabled={deletingId === doc.id}
                          onClick={() => handleDelete(doc.id)}
                          title="Delete"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!uploading) {
          setDialogOpen(open);
          if (!open) { setDocType(""); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Student Document</DialogTitle>
            <DialogDescription>
              Attach official documents (PDF, JPG, PNG — max {MAX_MB} MB each).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Document Type *</Label>
              <Select value={docType} onValueChange={setDocType} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                      {t.required && (
                        <span className="ml-1.5 text-xs text-amber-600 font-medium">Required</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>File *</Label>
              <div
                className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-2 text-xs"
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to browse or drag & drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, WEBP — max {MAX_MB} MB</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading || !docType || !selectedFile}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
