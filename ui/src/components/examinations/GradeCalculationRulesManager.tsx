import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Calculator } from "lucide-react";
import { toast } from "sonner";

interface GradeRule {
  id: string;
  minMarks: number;
  maxMarks: number;
  grade: string;
  gradePoint: number;
  description: string;
}

interface GradeCalculationRulesManagerProps {
  onSave?: (rules: GradeRule[]) => Promise<void>;
}

export function GradeCalculationRulesManager({ onSave }: GradeCalculationRulesManagerProps) {
  const [rules, setRules] = useState<GradeRule[]>([
    { id: "1", minMarks: 90, maxMarks: 100, grade: "A+", gradePoint: 10, description: "Outstanding" },
    { id: "2", minMarks: 80, maxMarks: 89, grade: "A", gradePoint: 9, description: "Excellent" },
    { id: "3", minMarks: 70, maxMarks: 79, grade: "B+", gradePoint: 8, description: "Very Good" },
    { id: "4", minMarks: 60, maxMarks: 69, grade: "B", gradePoint: 7, description: "Good" },
    { id: "5", minMarks: 50, maxMarks: 59, grade: "C", gradePoint: 6, description: "Average" },
    { id: "6", minMarks: 40, maxMarks: 49, grade: "D", gradePoint: 5, description: "Pass" },
    { id: "7", minMarks: 0, maxMarks: 39, grade: "F", gradePoint: 0, description: "Fail" },
  ]);
  const [newRule, setNewRule] = useState<Partial<GradeRule>>({});

  const addRule = () => {
    if (!newRule.minMarks || !newRule.maxMarks || !newRule.grade || newRule.gradePoint === undefined) {
      toast.error("Please fill all fields");
      return;
    }

    const rule: GradeRule = {
      id: Date.now().toString(),
      minMarks: newRule.minMarks,
      maxMarks: newRule.maxMarks,
      grade: newRule.grade,
      gradePoint: newRule.gradePoint,
      description: newRule.description || "",
    };

    setRules([...rules, rule].sort((a, b) => b.minMarks - a.minMarks));
    setNewRule({});
    toast.success("Grade rule added");
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
    toast.success("Grade rule deleted");
  };

  const handleSave = async () => {
    try {
      await onSave?.(rules);
      toast.success("Grade calculation rules saved successfully");
    } catch (error) {
      toast.error("Failed to save rules");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Grade Calculation Rules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Min Marks</TableHead>
                <TableHead>Max Marks</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Grade Point</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.minMarks}</TableCell>
                  <TableCell>{rule.maxMarks}</TableCell>
                  <TableCell>
                    <span className="font-semibold">{rule.grade}</span>
                  </TableCell>
                  <TableCell>{rule.gradePoint}</TableCell>
                  <TableCell>{rule.description}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-4">Add New Grade Rule</h3>
          <div className="grid grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Min Marks</Label>
              <Input
                type="number"
                value={newRule.minMarks || ""}
                onChange={(e) => setNewRule({ ...newRule, minMarks: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Marks</Label>
              <Input
                type="number"
                value={newRule.maxMarks || ""}
                onChange={(e) => setNewRule({ ...newRule, maxMarks: Number(e.target.value) })}
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label>Grade</Label>
              <Input
                value={newRule.grade || ""}
                onChange={(e) => setNewRule({ ...newRule, grade: e.target.value })}
                placeholder="A+"
              />
            </div>
            <div className="space-y-2">
              <Label>Grade Point</Label>
              <Input
                type="number"
                step="0.1"
                value={newRule.gradePoint ?? ""}
                onChange={(e) => setNewRule({ ...newRule, gradePoint: Number(e.target.value) })}
                placeholder="10"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={newRule.description || ""}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                placeholder="Outstanding"
              />
            </div>
          </div>
          <Button onClick={addRule} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave}>Save All Rules</Button>
        </div>
      </CardContent>
    </Card>
  );
}
