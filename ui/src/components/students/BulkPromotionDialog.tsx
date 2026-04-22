import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Users } from "lucide-react";

interface BulkPromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPromote: (fromClass: string, toClass: string) => Promise<void>;
}

export function BulkPromotionDialog({ open, onOpenChange, onPromote }: BulkPromotionDialogProps) {
  const [fromClass, setFromClass] = useState("");
  const [toClass, setToClass] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const classes = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

  const handlePromote = async () => {
    if (!fromClass || !toClass) {
      toast({
        title: "Error",
        description: "Please select both source and target classes",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await onPromote(fromClass, toClass);
      toast({
        title: "Success",
        description: `Students promoted from Class ${fromClass} to Class ${toClass}`,
      });
      onOpenChange(false);
      setFromClass("");
      setToClass("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to promote students",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Student Promotion
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="fromClass">Promote From Class</Label>
            <Select value={fromClass} onValueChange={setFromClass}>
              <SelectTrigger id="fromClass">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-center">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>

          <div>
            <Label htmlFor="toClass">Promote To Class</Label>
            <Select value={toClass} onValueChange={setToClass}>
              <SelectTrigger id="toClass">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handlePromote} 
            className="w-full" 
            disabled={loading || !fromClass || !toClass}
          >
            {loading ? "Promoting..." : "Promote Students"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
