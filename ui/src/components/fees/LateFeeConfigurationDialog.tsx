import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings } from "lucide-react";
import { toast } from "sonner";

interface LateFeeConfig {
  enabled: boolean;
  calculationType: "fixed" | "percentage" | "daily";
  amount: number;
  gracePeriodDays: number;
  maxLateFee?: number;
  applyToClasses: string[];
}

interface LateFeeConfigurationDialogProps {
  config?: LateFeeConfig;
  onSave?: (config: LateFeeConfig) => Promise<void>;
}

export function LateFeeConfigurationDialog({ config, onSave }: LateFeeConfigurationDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<LateFeeConfig>(
    config || {
      enabled: false,
      calculationType: "fixed",
      amount: 0,
      gracePeriodDays: 0,
      applyToClasses: [],
    }
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      await onSave?.(formData);
      toast.success("Late fee configuration saved successfully");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to save configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          Configure Late Fees
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Late Fee Configuration</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">Enable Auto Late Fee</Label>
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, enabled: checked })
              }
            />
          </div>

          {formData.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="calculationType">Calculation Type</Label>
                <Select
                  value={formData.calculationType}
                  onValueChange={(value: "fixed" | "percentage" | "daily") =>
                    setFormData({ ...formData, calculationType: value })
                  }
                >
                  <SelectTrigger id="calculationType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="percentage">Percentage of Fee</SelectItem>
                    <SelectItem value="daily">Daily Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">
                  {formData.calculationType === "fixed"
                    ? "Late Fee Amount"
                    : formData.calculationType === "percentage"
                    ? "Percentage (%)"
                    : "Daily Rate"}
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: Number(e.target.value) })
                  }
                  placeholder="Enter amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gracePeriod">Grace Period (Days)</Label>
                <Input
                  id="gracePeriod"
                  type="number"
                  value={formData.gracePeriodDays}
                  onChange={(e) =>
                    setFormData({ ...formData, gracePeriodDays: Number(e.target.value) })
                  }
                  placeholder="Days after due date"
                />
              </div>

              {formData.calculationType === "daily" && (
                <div className="space-y-2">
                  <Label htmlFor="maxLateFee">Maximum Late Fee (Optional)</Label>
                  <Input
                    id="maxLateFee"
                    type="number"
                    value={formData.maxLateFee || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, maxLateFee: Number(e.target.value) })
                    }
                    placeholder="Cap on total late fee"
                  />
                </div>
              )}

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Late fees will be automatically calculated and applied after the grace period
                  expires.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
