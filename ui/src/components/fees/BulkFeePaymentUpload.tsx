import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, CheckCircle, XCircle, Loader2, Download, AlertTriangle, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { feeApi, BulkFeePaymentRow, BulkPaymentResult } from "@/services/api/feeApi";

// Template columns match backend BulkFeePaymentRow (camelCase JSON names)
const TEMPLATE_HEADERS = ["admissionNumber", "studentName", "amountPaid", "paymentDate", "paymentMethod", "receiptNumber", "remarks"];
const PAYMENT_METHODS = ["cash", "online", "cheque", "dd", "neft", "upi"];

/** Parse "ADM001: reason" error strings from backend */
function parseError(err: string): { adm: string; reason: string } {
  const idx = err.indexOf(": ");
  if (idx === -1) return { adm: "—", reason: err };
  return { adm: err.slice(0, idx), reason: err.slice(idx + 2) };
}

export function BulkFeePaymentUpload() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BulkFeePaymentRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<BulkPaymentResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  // ── CSV Parser ────────────────────────────────────────────────────────────
  const parseCSV = (text: string): { rows: BulkFeePaymentRow[]; errors: string[] } => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return { rows: [], errors: ["CSV has no data rows."] };
    const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, ""));
    const errors: string[] = [];
    const parsed: BulkFeePaymentRow[] = [];

    lines.slice(1).forEach((line, i) => {
      if (!line.trim()) return;
      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      const get = (keys: string[]) => {
        for (const k of keys) {
          const idx = header.indexOf(k);
          if (idx !== -1 && cols[idx]) return cols[idx];
        }
        return "";
      };

      const admNo = get(["admissionnumber", "admno", "admission_number"]);
      if (!admNo) { errors.push(`Row ${i + 2}: missing admissionNumber`); return; }

      const rawAmt = get(["amountpaid", "amount", "amtpaid"]);
      const amountPaid = parseFloat(rawAmt);
      if (isNaN(amountPaid) || amountPaid <= 0) {
        errors.push(`Row ${i + 2} (${admNo}): invalid amount '${rawAmt}'`); return;
      }

      const rawDate = get(["paymentdate", "date", "paiddate"]);
      if (!rawDate) { errors.push(`Row ${i + 2} (${admNo}): missing paymentDate`); return; }

      const method = get(["paymentmethod", "paymentmode", "method", "mode"]) || "cash";
      if (!PAYMENT_METHODS.includes(method.toLowerCase())) {
        errors.push(`Row ${i + 2} (${admNo}): unknown paymentMethod '${method}' — valid: ${PAYMENT_METHODS.join(", ")}`);
        return;
      }

      parsed.push({
        admissionNumber: admNo,
        studentName: get(["studentname", "name", "student"]) || undefined,
        amountPaid,
        paymentDate: rawDate,
        paymentMethod: method.toLowerCase(),
        receiptNumber: get(["receiptnumber", "receipt", "transactionref", "txnref", "ref"]) || undefined,
        remarks: get(["remarks", "notes", "comment"]) || undefined,
      });
    });

    return { rows: parsed, errors };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const { rows: parsed, errors } = parseCSV(text);
      setRows(parsed); setParseErrors(errors); setResult(null);
      if (errors.length > 0 && parsed.length === 0) {
        toast.error(`CSV has ${errors.length} error(s) — no valid rows loaded`);
      } else if (parsed.length > 0) {
        toast.success(`${parsed.length} row(s) loaded${errors.length > 0 ? `, ${errors.length} skipped` : ""}`);
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    setRows([]); setParseErrors([]); setResult(null); setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleUpload = async () => {
    if (rows.length === 0) { toast.error("No valid rows to upload"); return; }
    if (rows.length > 500) { toast.error("Maximum 500 rows per upload"); return; }
    setUploading(true);
    try {
      const res = await feeApi.bulkUploadPayments(rows);
      setResult(res);
      if (res.failed === 0) {
        toast.success(`All ${res.successful} payment(s) recorded — fee history updated`);
      } else if (res.successful > 0) {
        toast.warning(`${res.successful} recorded, ${res.failed} failed — see errors below`);
      } else {
        toast.error(`All ${res.failed} rows failed — see errors below`);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Upload failed — server error");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const lines = [
      TEMPLATE_HEADERS.join(","),
      "ADM001,Ravi Kumar,5000,2026-06-01,cash,,First term payment",
      "ADM002,Priya Sharma,3500,2026-06-01,upi,UPI-TXN-12345,",
      "ADM003,Ananya Reddy,7500,2026-06-02,cheque,CHQ-56789,Q1 fees",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "bulk_payment_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadResultReport = () => {
    if (!result) return;
    const lines = [
      "admissionNumber,status,reason",
      ...rows.map(r => {
        const err = result.errors.find(e => e.startsWith(r.admissionNumber + ":"));
        return err ? `${r.admissionNumber},FAILED,${parseError(err).reason}` : `${r.admissionNumber},SUCCESS,`;
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk_upload_result_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />Bulk Fee Payment Upload
            </CardTitle>
            <CardDescription>Import fee payments for multiple students via CSV. Max 500 rows per upload.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1.5" />Download Template
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Drop zone — only when no rows loaded and no result */}
        {rows.length === 0 && !result && (
          <label
            htmlFor="csv-upload"
            className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:bg-muted/30 transition-colors"
          >
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-semibold">Click to choose a CSV file</p>
            <p className="text-xs text-muted-foreground mt-1">
              Required:{" "}
              <code className="bg-muted px-1 rounded">admissionNumber</code>{" "}
              <code className="bg-muted px-1 rounded">amountPaid</code>{" "}
              <code className="bg-muted px-1 rounded">paymentDate</code>{" "}
              <code className="bg-muted px-1 rounded">paymentMethod</code>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              paymentMethod values: cash · online · cheque · dd · neft · upi
            </p>
          </label>
        )}
        <Input ref={fileRef} id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileChange} />

        {/* Parse errors */}
        {parseErrors.length > 0 && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
            <p className="text-sm font-semibold text-orange-700 flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="h-4 w-4" />{parseErrors.length} row(s) skipped due to invalid data
            </p>
            <div className="space-y-0.5 max-h-28 overflow-y-auto">
              {parseErrors.map((e, i) => <p key={i} className="text-xs text-orange-600">{e}</p>)}
            </div>
          </div>
        )}

        {/* Preview table */}
        {rows.length > 0 && !result && (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{fileName}</span>
                <Badge variant="secondary">{rows.length} row{rows.length > 1 ? "s" : ""}</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClear}>
                  <Trash2 className="h-4 w-4 mr-1.5" />Clear
                </Button>
                <Button size="sm" onClick={handleUpload} disabled={uploading}>
                  {uploading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</>
                    : <><Upload className="h-4 w-4 mr-2" />Upload {rows.length} Payment{rows.length > 1 ? "s" : ""}</>
                  }
                </Button>
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <div className="max-h-72 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">Admission No.</TableHead>
                      <TableHead className="text-xs">Student</TableHead>
                      <TableHead className="text-xs">Amount (₹)</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Method</TableHead>
                      <TableHead className="text-xs">Receipt / Ref</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 50).map((r, i) => (
                      <TableRow key={i} className="text-xs">
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{r.admissionNumber}</TableCell>
                        <TableCell className="text-muted-foreground">{r.studentName ?? "—"}</TableCell>
                        <TableCell className="tabular-nums font-semibold">₹{r.amountPaid.toLocaleString("en-IN")}</TableCell>
                        <TableCell>{r.paymentDate}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{r.paymentMethod}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{r.receiptNumber ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                    {rows.length > 50 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground text-xs py-2">
                          + {rows.length - 50} more rows (not shown in preview)
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}

        {/* Upload result */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-muted p-4 text-center">
                <p className="text-2xl font-bold tabular-nums">{result.totalRows}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total Rows</p>
              </div>
              <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
                <p className="text-2xl font-bold text-green-600 tabular-nums">{result.successful}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Recorded</p>
              </div>
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
                <p className="text-2xl font-bold text-red-600 tabular-nums">{result.failed}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Failed</p>
              </div>
            </div>

            {result.successful > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <CheckCircle className="h-4 w-4" />
                {result.successful} payment{result.successful > 1 ? "s" : ""} recorded — fee records and student history updated
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 overflow-hidden">
                <div className="px-4 py-2.5 border-b bg-red-50 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-semibold text-destructive">
                    {result.errors.length} Failed Row{result.errors.length > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y">
                  {result.errors.map((e, i) => {
                    const { adm, reason } = parseError(e);
                    return (
                      <div key={i} className="flex items-start gap-3 px-4 py-2 text-sm">
                        <span className="font-semibold text-destructive shrink-0 w-24">{adm}</span>
                        <span className="text-muted-foreground">{reason}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              {result.errors.length > 0 && (
                <Button variant="outline" size="sm" onClick={downloadResultReport}>
                  <Download className="h-4 w-4 mr-1.5" />Download Error Report
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleClear}>
                <Upload className="h-4 w-4 mr-1.5" />Upload Another File
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
