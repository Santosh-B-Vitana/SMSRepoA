/**
 * StudentExitDialog — multi-step flow for marking a student as Dropped Out or Passed Out.
 *
 * Steps:
 *  1. checking      — fetches exit-clearance from backend
 *  2. fee_review    — shows pending fees; admin must confirm clearance
 *  3. documents     — pick documents + edit their pre-populated fields
 *  4. confirm       — summary + action-specific options (dropout type, destination)
 *  5. result        — success; shows generated-document cards with download buttons
 */

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Student,
  studentApi,
  ExitClearanceResponse,
  ExitDocument,
  StudentDropoutRequest,
  StudentPassoutRequest,
  StudentExitResponse,
  GeneratedDocumentInfo,
} from "@/services/api/studentApi";
import { generateDocumentPdf } from "@/utils/professionalPdfGenerator";
import { useSchool } from "@/contexts/SchoolContext";

// ─── types ────────────────────────────────────────────────────────────────────

type Step = "checking" | "fee_review" | "documents" | "confirm" | "result";

interface Props {
  student: Student;
  exitType: "dropout" | "passout";
  open: boolean;
  onClose: () => void;
  onComplete: (result: StudentExitResponse) => void;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function currency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

// ─── DocumentCard — collapsible field editor ─────────────────────────────────

function DocumentCard({
  doc,
  selected,
  onToggle,
  fields,
  onFieldChange,
}: {
  doc: ExitDocument;
  selected: boolean;
  onToggle: () => void;
  fields: Record<string, string>;
  onFieldChange: (key: string, val: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const fieldKeys = Object.keys(doc.fields);

  return (
    <div className={`border rounded-lg transition-colors ${selected ? "border-primary bg-primary/5" : "border-border"}`}>
      {/* header row */}
      <div className="flex items-center gap-3 p-3">
        <Checkbox
          id={`doc-${doc.documentKey}`}
          checked={selected}
          onCheckedChange={onToggle}
          disabled={doc.isMandatory}
        />
        <Label htmlFor={`doc-${doc.documentKey}`} className="flex-1 cursor-pointer font-medium text-sm">
          {doc.title}
          {doc.isMandatory && (
            <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
          )}
        </Label>
        {selected && fieldKeys.length > 0 && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {expanded ? "Hide fields" : "Edit fields"}
          </button>
        )}
      </div>

      {/* editable fields */}
      {selected && expanded && (
        <div className="border-t px-4 pb-4 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fieldKeys.map((key) => (
            <div key={key} className="flex flex-col gap-1">
              <Label className="text-xs capitalize text-muted-foreground">
                {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
              </Label>
              <Input
                value={fields[key] ?? ""}
                onChange={(e) => onFieldChange(key, e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── GeneratedDocumentViewer ─────────────────────────────────────────────────

function GeneratedDocumentViewer({ doc }: { doc: GeneratedDocumentInfo }) {
  const { schoolInfo } = useSchool();
  const [downloading, setDownloading] = useState(false);

  function handleDownloadPdf() {
    setDownloading(true);
    try {
      const pdf = generateDocumentPdf(doc.documentKey, doc.fields, schoolInfo ?? undefined);
      const fileName = `${doc.title.replace(/\s+/g, "_")}_${doc.fields.studentName?.replace(/\s+/g, "_") ?? "document"}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{doc.title}</p>
          {doc.fileUrl && (
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Server copy ↗
            </a>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" onClick={handleDownloadPdf} disabled={downloading}>
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1.5" />
            )}
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StudentExitDialog({ student, exitType, open, onClose, onComplete }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("checking");
  const [clearance, setClearance] = useState<ExitClearanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // fee step
  const [feeClearanceConfirmed, setFeeClearanceConfirmed] = useState(false);

  // documents step — per-doc selection + editable fields
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [docFields, setDocFields] = useState<Record<string, Record<string, string>>>({});

  // confirm step — dropout-specific
  const [dropoutType, setDropoutType] = useState<"transfer" | "detain">("transfer");
  const [destinationSchool, setDestinationSchool] = useState("");
  const [conduct, setConduct] = useState("Good");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");

  // result
  const [result, setResult] = useState<StudentExitResponse | null>(null);

  // ── fetch clearance on open ───────────────────────────────────────────────
  const fetchClearance = useCallback(async () => {
    setStep("checking");
    setError(null);
    try {
      const data = await studentApi.getExitClearance(student.id);
      setClearance(data);

      // Pre-select mandatory docs and initialise field copies
      const initSelected = new Set<string>();
      const initFields: Record<string, Record<string, string>> = {};
      data.availableDocuments.forEach((d) => {
        if (d.isMandatory) initSelected.add(d.documentKey);
        initFields[d.documentKey] = { ...d.fields };
      });
      setSelectedDocs(initSelected);
      setDocFields(initFields);

      setStep("fee_review");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to load clearance info.";
      setError(msg);
    }
  }, [student.id]);

  useEffect(() => {
    if (open) {
      // reset all state
      setStep("checking");
      setError(null);
      setClearance(null);
      setResult(null);
      setFeeClearanceConfirmed(false);
      setDropoutType("transfer");
      setDestinationSchool("");
      setConduct("Good");
      setReason("");
      setRemarks("");
      fetchClearance();
    }
  }, [open, fetchClearance]);

  // ── handlers ─────────────────────────────────────────────────────────────

  function toggleDoc(key: string) {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function updateField(docKey: string, fieldKey: string, val: string) {
    setDocFields((prev) => ({
      ...prev,
      [docKey]: { ...(prev[docKey] ?? {}), [fieldKey]: val },
    }));
  }

  async function handleSubmit() {
    if (!clearance) return;
    setSubmitting(true);
    try {
      const docsToGenerate = Array.from(selectedDocs).map((key) => ({
        documentKey: key,
        fields: docFields[key] ?? {},
      }));

      let res: StudentExitResponse;
      if (exitType === "dropout") {
        const payload: StudentDropoutRequest = {
          dropoutType: "transfer",
          destinationSchool: destinationSchool || undefined,
          reason: reason || undefined,
          conduct,
          feeClearanceConfirmed,
          documentsToGenerate: docsToGenerate,
          remarks: remarks || undefined,
        };
        res = await studentApi.processDropout(student.id, payload);
      } else {
        const payload: StudentPassoutRequest = {
          academicYear: clearance.academicYear,
          passingClass: clearance.currentClass,
          destinationSchool: destinationSchool || undefined,
          reason: reason || undefined,
          conduct,
          feeClearanceConfirmed,
          documentsToGenerate: docsToGenerate,
          remarks: remarks || undefined,
        };
        res = await studentApi.processPassout(student.id, payload);
      }

      setResult(res);
      setStep("result");
      toast({ title: "Done", description: res.message });
      // NOTE: onComplete is intentionally NOT called here.
      // It is called when the user clicks "Done" on the result step
      // so the parent doesn't close the dialog before the result is visible.
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Action failed. Please try again.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  // ── title / description per exit type ────────────────────────────────────

  const title = exitType === "dropout" ? "Drop Out Student — Transfer" : "Mark as Passed Out";
  const description =
    exitType === "dropout"
      ? "Process a student dropout — transfer to another school. An alumni record will be created."
      : "Mark the student as having passed out — an alumni record will be created.";

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* ── STEP: checking ─────────────────────────────────────────────── */}
        {step === "checking" && !error && (
          <div className="flex flex-col items-center gap-4 py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading clearance info for {student.name}…</p>
          </div>
        )}

        {step === "checking" && error && (
          <div className="flex flex-col items-center gap-4 py-8">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-destructive text-sm text-center">{error}</p>
            <Button variant="outline" onClick={fetchClearance}>Retry</Button>
          </div>
        )}

        {/* ── STEP: fee_review ──────────────────────────────────────────── */}
        {step === "fee_review" && clearance && (
          <div className="space-y-4">
            {/* student summary */}
            <div className="rounded-lg border p-4 bg-muted/30 text-sm space-y-1">
              <p><span className="font-medium">Student: </span>{clearance.studentName}</p>
              <p><span className="font-medium">Class: </span>{clearance.currentClass} – {clearance.currentSection}</p>
              <p><span className="font-medium">Academic Year: </span>{clearance.academicYear}</p>
            </div>

            {/* fee status */}
            {clearance.isFeeClear ? (
              <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950 p-3 text-sm text-green-800 dark:text-green-300">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                All fees are cleared. No outstanding dues.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>Outstanding dues: <strong>{currency(clearance.totalPendingAmount)}</strong></span>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Academic Year</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clearance.pendingFees.map((f) => (
                      <TableRow key={f.feeRecordId}>
                        <TableCell className="font-medium">{f.feeType}</TableCell>
                        <TableCell>{f.academicYear}</TableCell>
                        <TableCell className="text-right text-destructive">{currency(f.pendingAmount)}</TableCell>
                        <TableCell>{f.dueDate ? new Date(f.dueDate).toLocaleDateString("en-IN") : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-start gap-2 rounded-lg border p-3 bg-muted/40">
                  <Checkbox
                    id="fee-confirm"
                    checked={feeClearanceConfirmed}
                    onCheckedChange={(v) => setFeeClearanceConfirmed(Boolean(v))}
                  />
                  <Label htmlFor="fee-confirm" className="text-sm leading-relaxed cursor-pointer">
                    I confirm that the outstanding dues have been settled or waived off-system, and authorise this exit.
                  </Label>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={() => setStep("documents")}
                disabled={!clearance.isFeeClear && !feeClearanceConfirmed}
              >
                Next: Documents
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: documents ──────────────────────────────────────────────  */}
        {step === "documents" && clearance && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select the documents to generate. Required documents are pre-selected. Click "Edit fields" to customise content before download.
            </p>

            <div className="space-y-2">
              {clearance.availableDocuments.map((doc) => (
                <DocumentCard
                  key={doc.documentKey}
                  doc={doc}
                  selected={selectedDocs.has(doc.documentKey)}
                  onToggle={() => toggleDoc(doc.documentKey)}
                  fields={docFields[doc.documentKey] ?? doc.fields}
                  onFieldChange={(k, v) => updateField(doc.documentKey, k, v)}
                />
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("fee_review")}>Back</Button>
              <Button onClick={() => setStep("confirm")} disabled={selectedDocs.size === 0}>
                Next: Confirm
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: confirm ────────────────────────────────────────────────  */}
        {step === "confirm" && clearance && (
          <div className="space-y-5">
            {/* dropout is always transfer now — detain is handled by StudentDetainDialog */}

            {/* destination school (optional for both) */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                {exitType === "dropout" ? "Destination School" : "Next Institution (optional)"}
              </Label>
              <Input
                placeholder="e.g. ABC High School, City"
                value={destinationSchool}
                onChange={(e) => setDestinationSchool(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Conduct</Label>
                <Input value={conduct} onChange={(e) => setConduct(e.target.value)} placeholder="Good" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Reason</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Family relocation" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Internal Remarks (not printed on docs)</Label>
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional admin notes" />
            </div>

            <Separator />

            {/* summary */}
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
              <p className="font-semibold text-base mb-1">Summary</p>
              <p><span className="font-medium">Student: </span>{clearance.studentName} ({clearance.currentClass})</p>
              <p>
                <span className="font-medium">Action: </span>
                {exitType === "dropout" ? "Drop Out — Transfer" : "Passed Out"}
              </p>
              {destinationSchool && (
                <p><span className="font-medium">Destination: </span>{destinationSchool}</p>
              )}
              <p><span className="font-medium">Documents ({selectedDocs.size}): </span>
                {Array.from(selectedDocs)
                  .map((key) => clearance.availableDocuments.find((d) => d.documentKey === key)?.title)
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {exitType === "dropout" && (
                <p className="text-muted-foreground text-xs mt-1">
                  Student will be marked inactive and an alumni record will be created.
                </p>
              )}
            </div>

            <div className="flex justify-between pt-1">
              <Button variant="outline" onClick={() => setStep("documents")}>Back</Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                variant={exitType === "dropout" ? "destructive" : "default"}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {exitType === "dropout" ? "Confirm Drop Out" : "Confirm Passed Out"}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: result ─────────────────────────────────────────────────  */}
        {step === "result" && result && (
          <div className="space-y-5">
            {/* Success header */}
            <div className="text-center space-y-3 py-2">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-9 w-9 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-800 dark:text-green-200">
                  {exitType === "dropout" ? "Student Dropped Out Successfully" : "Student Passed Out Successfully"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
              </div>
            </div>

            {/* Student details card */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student Record</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Student</span>
                  <span className="font-semibold">{result.studentName}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="capitalize">{result.newStatus}</Badge>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Exit Type</span>
                  <span className="font-medium capitalize">{result.exitType.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
                {result.alumniId && (
                  <div className="flex justify-between col-span-full border-b pb-1.5">
                    <span className="text-muted-foreground">Alumni Record ID</span>
                    <span className="font-mono font-semibold text-primary text-xs">{result.alumniId}</span>
                  </div>
                )}
                {result.alumniMessage && (
                  <div className="col-span-full text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 rounded p-2 mt-1">
                    {result.alumniMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Generated documents */}
            {result.generatedDocuments.length > 0 ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold">
                    Generated Documents ({result.generatedDocuments.length})
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click <strong>Download PDF</strong> to save each document directly.
                  </p>
                </div>
                <div className="space-y-2">
                  {result.generatedDocuments.map((doc) => (
                    <GeneratedDocumentViewer key={doc.documentKey} doc={doc} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No documents were generated for this exit.
              </div>
            )}

            <Separator />

            <div className="flex justify-end">
              <Button onClick={() => { onComplete(result); onClose(); }} className="min-w-24">Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
