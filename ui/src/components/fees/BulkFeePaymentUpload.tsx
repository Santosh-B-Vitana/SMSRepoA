import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, CheckCircle, XCircle, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { feeApi, BulkFeePaymentRow, BulkPaymentResult } from "@/services/api/feeApi";

const TEMPLATE_HEADERS = ["admissionNumber", "amount", "paymentDate", "paymentMode", "transactionRef", "remarks"];
const PAYMENT_MODES = ["cash", "online", "cheque", "dd", "neft", "upi"];

export function BulkFeePaymentUpload() {
  const { toast } = useToast();
  const [rows, setRows] = useState<BulkFeePaymentRow[]>([]);
  const [result, setResult] = useState<BulkPaymentResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [csvText, setCsvText] = useState("");

  const parseCSV = (text: string): BulkFeePaymentRow[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const header = lines[0].split(",").map(h => h.trim().toLowerCase());
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      const get = (key: string) => cols[header.indexOf(key)] ?? "";
      return {
        admissionNumber: get("admissionnumber"),
        amount: parseFloat(get("amount")) || 0,
        paymentDate: get("paymentdate"),
        paymentMode: get("paymentmode") || "cash",
        transactionRef: get("transactionref") || undefined,
        remarks: get("remarks") || undefined,
      } as BulkFeePaymentRow;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setCsvText(text);
      const parsed = parseCSV(text);
      setRows(parsed);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (rows.length === 0) {
      toast({ title: "No rows to upload", variant: "destructive" });
      return;
    }
    if (rows.length > 500) {
      toast({ title: "Maximum 500 rows per upload", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const res = await feeApi.bulkUploadPayments(rows);
      setResult(res);
      toast({ title: `Processed: ${res.successCount} success, ${res.failureCount} failed` });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = [TEMPLATE_HEADERS.join(","), "ADM001,5000,2025-06-01,cash,,First term payment"].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_payment_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Bulk Fee Payment Upload
            </CardTitle>
            <CardDescription>Import fee payments for multiple students via CSV (max 500 rows)</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1" /> Download Template
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <Label htmlFor="csv-upload" className="cursor-pointer">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Click to upload CSV file</p>
            <p className="text-xs text-muted-foreground mt-1">Required columns: admissionNumber, amount, paymentDate, paymentMode</p>
          </Label>
          <Input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        </div>

        {rows.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{rows.length} rows loaded</p>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload {rows.length} Payments
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 10).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.admissionNumber}</TableCell>
                      <TableCell>₹{r.amount.toLocaleString("en-IN")}</TableCell>
                      <TableCell>{r.paymentDate}</TableCell>
                      <TableCell><Badge variant="outline">{r.paymentMode}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{r.transactionRef ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {rows.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground text-sm">
                        ... and {rows.length - 10} more rows
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-2xl font-bold">{result.totalRows}</p>
                <p className="text-xs text-muted-foreground">Total Rows</p>
              </div>
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{result.successCount}</p>
                <p className="text-xs text-muted-foreground">Successful</p>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{result.failureCount}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>

            {result.failures.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2 text-destructive">Failed Rows:</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.failures.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm p-2 bg-red-50 rounded">
                      <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                      <span><span className="font-medium">{f.admissionNumber}</span>: {f.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.successCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                {result.successCount} payment(s) recorded successfully
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
