
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  announcementSchema,
  type AnnouncementFormData,
  ANNOUNCEMENT_PRIORITY,
  ANNOUNCEMENT_AUDIENCE,
  PRIORITY_LABELS,
  AUDIENCE_LABELS,
} from "@/schemas/announcementSchema";

interface AnnouncementFormProps {
  onSubmit: (announcement: AnnouncementFormData) => void;
  onCancel: () => void;
}

export function AnnouncementForm({ onSubmit, onCancel }: AnnouncementFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      priority: "medium",
      category: "general",
      targetAudience: [],
      isPublished: false,
      allowComments: false,
      sendNotification: true,
      sendSms: false,
      sendEmail: false,
    },
  });

  const onValid = (data: AnnouncementFormData) => {
    onSubmit(data);
    toast.success("Announcement created successfully");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Announcement</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onValid)} className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input {...register("title")} placeholder="Enter announcement title" />
            {errors.title && (
              <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="text-sm font-medium">Content *</label>
            <Textarea
              {...register("content")}
              placeholder="Enter announcement content"
              rows={4}
            />
            {errors.content && (
              <p className="text-xs text-destructive mt-1">{errors.content.message}</p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="text-sm font-medium">Priority</label>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANNOUNCEMENT_PRIORITY.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Target Audience */}
          <div>
            <label className="text-sm font-medium">Target Audience *</label>
            <Controller
              name="targetAudience"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {ANNOUNCEMENT_AUDIENCE.map((audience) => (
                    <div key={audience} className="flex items-center space-x-2">
                      <Checkbox
                        id={`audience-${audience}`}
                        checked={field.value.includes(audience)}
                        onCheckedChange={(checked) => {
                          field.onChange(
                            checked
                              ? [...field.value, audience]
                              : field.value.filter((a) => a !== audience)
                          );
                        }}
                      />
                      <label htmlFor={`audience-${audience}`} className="text-sm capitalize">
                        {AUDIENCE_LABELS[audience]}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            />
            {errors.targetAudience && (
              <p className="text-xs text-destructive mt-1">{errors.targetAudience.message}</p>
            )}
          </div>

          {/* Scheduled / Expiry dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Scheduled Date (Optional)</label>
              <Input type="datetime-local" {...register("scheduledDate")} />
            </div>
            <div>
              <label className="text-sm font-medium">Expiry Date (Optional)</label>
              <Input type="datetime-local" {...register("expiryDate")} />
              {errors.expiryDate && (
                <p className="text-xs text-destructive mt-1">{errors.expiryDate.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              <Plus className="h-4 w-4 mr-2" />
              Create Announcement
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

