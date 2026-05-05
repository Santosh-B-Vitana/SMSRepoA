import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import leaveManagementApi from "@/services/api/leaveManagementApi";
import { useToast } from "@/hooks/use-toast";

interface StaffLeaveRequestFormProps {
  staffId: string;
  staffName: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function StaffLeaveRequestForm({ staffId, staffName, onSuccess, onClose }: StaffLeaveRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const form = useForm({
    defaultValues: {
      leaveType: "",
      startDate: "",
      endDate: "",
      reason: "",
    },
  });

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      
      // Get leave type ID from the selected leave type name
      const leaveTypes = await leaveManagementApi.getLeaveTypes("Staff");
      const selectedLeaveType = leaveTypes.find(
        (lt) => lt.name.toLowerCase() === data.leaveType.toLowerCase()
      );

      if (!selectedLeaveType) {
        throw new Error("Invalid leave type selected");
      }

      await leaveManagementApi.createLeaveRequest({
        leaveTypeId: selectedLeaveType.id,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
      });

      toast({
        title: "Success",
        description: "Leave request submitted successfully",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit leave request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="leaveType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Leave Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                  <SelectItem value="earned">Earned Leave</SelectItem>
                  <SelectItem value="maternity">Maternity Leave</SelectItem>
                  <SelectItem value="paternity">Paternity Leave</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter reason for leave..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
