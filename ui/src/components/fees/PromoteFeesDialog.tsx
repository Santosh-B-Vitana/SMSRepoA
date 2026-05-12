import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowRight, TrendingUp, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { feeApi, FeeStructureBasic } from "@/services/api/feeApi";
import { getAcademicYearsArray } from "@/hooks/useSchoolContext";

interface Props {
  structures: FeeStructureBasic[];
  onPromoted?: () => void;
}

export function PromoteFeesDialog({ structures, onPromoted }: Props) {
  const { toast } = useToast();
  const academicYears = getAcademicYearsArray();
  const [open, setOpen] = useState(false);
  const [selectedStructureId, setSelectedStructureId] = useState("");
  const [targetYear, setTargetYear] = useState("");
  const [incrementPercent, setIncrementPercent] = useState<number | "">("");
  const [promoting, setPromoting] = useState(false);

  const selectedStructure = structures.find(s => s.id === selectedStructureId);

  const handlePromote = async () => {
    if (!selectedStructureId || !targetYear) {
      toast({ title: "Please select a structure and target year", variant: "destructive" });
      return;
    }
    if (selectedStructure?.academicYear === targetYear) {
      toast({ title: "Target year must be different from source year", variant: "destructive" });
      return;
    }
    setPromoting(true);
    try {
      const result = await feeApi.promoteFeeStructure(selectedStructureId, {
        targetAcademicYear: targetYear,
        incrementPercent: incrementPercent !== "" ? incrementPercent : undefined,
      });
      toast({ title: `Fee structure promoted to ${targetYear}` });
      setOpen(false);
      onPromoted?.();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? "Promotion failed";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setPromoting(false);
    }
  };

  const previewAmount = selectedStructure && incrementPercent !== ""
    ? Math.round(selectedStructure.totalAmount * (1 + (incrementPercent as number) / 100))
    : selectedStructure?.totalAmount;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <TrendingUp className="h-4 w-4 mr-1" /> Promote to Next Year
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Promote Fee Structure
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1">
              <Label>Source Fee Structure <span className="text-destructive">*</span></Label>
              <Select value={selectedStructureId} onValueChange={setSelectedStructureId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select structure to copy" />
                </SelectTrigger>
                <SelectContent>
                  {structures.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {s.class} ({s.academicYear})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStructure && (
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                Current total: <span className="font-semibold">₹{selectedStructure.totalAmount.toLocaleString("en-IN")}</span>
                &nbsp;|&nbsp;{selectedStructure.installmentCount} installment(s)
              </div>
            )}

            <div className="space-y-1">
              <Label>Target Academic Year <span className="text-destructive">*</span></Label>
              <Select value={targetYear} onValueChange={setTargetYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.filter(y => y !== selectedStructure?.academicYear).map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Fee Increment (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={incrementPercent}
                onChange={e => setIncrementPercent(e.target.value === "" ? "" : parseFloat(e.target.value))}
                placeholder="0 = no change"
              />
            </div>

            {selectedStructure && targetYear && (
              <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/50">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{selectedStructure.academicYear}</p>
                  <p className="font-semibold">₹{selectedStructure.totalAmount.toLocaleString("en-IN")}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-1 text-center" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{targetYear}</p>
                  <p className="font-semibold text-green-600">₹{(previewAmount ?? 0).toLocaleString("en-IN")}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              All fee terms and components will be cloned to the target year. Existing structures for the target year are preserved.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handlePromote} disabled={promoting || !selectedStructureId || !targetYear}>
              {promoting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
              Promote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
