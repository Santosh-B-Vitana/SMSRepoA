import { useEffect, useState } from "react";
import { Save, RefreshCw, ToggleLeft, ToggleRight, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import * as waApi from "@/services/api/whatsappApi";
import type { WhatsAppSettings, WhatsAppTemplate, WhatsAppTemplateMapping } from "@/services/api/whatsappApi";

// All available event keys with friendly names
const EVENT_DEFINITIONS = [
  { key: "attendance.student_absent", label: "Student Absent Alert", category: "Attendance", audience: "Parent" },
  { key: "attendance.shortage", label: "Attendance Shortage Warning", category: "Attendance", audience: "Parent" },
  { key: "fees.fee_due", label: "Fee Due Reminder", category: "Fees", audience: "Parent" },
  { key: "fees.fee_overdue", label: "Fee Overdue Alert", category: "Fees", audience: "Parent" },
  { key: "fees.payment_received", label: "Payment Confirmation", category: "Fees", audience: "Parent" },
  { key: "exams.result_published", label: "Result Published", category: "Exams", audience: "Parent" },
  { key: "exams.exam_schedule", label: "Exam Schedule", category: "Exams", audience: "Parent" },
  { key: "admissions.application_received", label: "Application Received", category: "Admissions", audience: "Parent" },
  { key: "admissions.application_approved", label: "Application Approved", category: "Admissions", audience: "Parent" },
  { key: "admissions.application_rejected", label: "Application Rejected", category: "Admissions", audience: "Parent" },
  { key: "admissions.enrollment_confirmed", label: "Enrollment Confirmed", category: "Admissions", audience: "Parent" },
  { key: "leave.staff_approved", label: "Leave Approved (Staff)", category: "Leave", audience: "Staff" },
  { key: "leave.staff_rejected", label: "Leave Rejected (Staff)", category: "Leave", audience: "Staff" },
  { key: "leave.student_approved", label: "Leave Approved (Student)", category: "Leave", audience: "Parent" },
  { key: "leave.student_rejected", label: "Leave Rejected (Student)", category: "Leave", audience: "Parent" },
  { key: "diary.diary_posted", label: "Daily Diary Posted", category: "Diary", audience: "Parent" },
  { key: "announcements.urgent", label: "Urgent Announcement", category: "Announcements", audience: "All" },
  { key: "announcements.emergency_alert", label: "Emergency Alert", category: "Announcements", audience: "All" },
  { key: "transport.bus_delayed", label: "Bus Delay Alert", category: "Transport", audience: "Parent" },
  { key: "hostel.room_allotted", label: "Room Allotment", category: "Hostel", audience: "Parent" },
  { key: "library.book_overdue", label: "Book Overdue Alert", category: "Library", audience: "Parent" },
  { key: "visitor.visitor_arrived", label: "Visitor Arrived", category: "Visitor", audience: "Parent" },
  { key: "payroll.salary_slip", label: "Salary Slip Ready", category: "Payroll", audience: "Staff" },
];

export default function WhatsAppSettings() {
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [mappings, setMappings] = useState<WhatsAppTemplateMapping[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      waApi.getSettings().then(setSettings),
      waApi.getTemplates("Approved").then(setTemplates),
      waApi.getTemplateMappings().then(setMappings),
    ])
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      await waApi.updateSettings(settings);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleMappingChange = async (eventKey: string, templateId: string, isEnabled: boolean) => {
    try {
      await waApi.updateTemplateMapping(eventKey, { templateId, isEnabled });
      const updated = await waApi.getTemplateMappings();
      setMappings(updated);
    } catch {
      toast.error("Failed to update mapping");
    }
  };

  const getMappingForEvent = (eventKey: string) =>
    mappings.find(m => m.eventKey === eventKey);

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading settings...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure WhatsApp notifications for your school</p>
      </div>

      {/* General Settings */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Enable WhatsApp Notifications</p>
              <p className="text-xs text-gray-500 mt-0.5">Send automatic WhatsApp messages for school events</p>
            </div>
            <Switch
              checked={settings?.isEnabled ?? false}
              onCheckedChange={v => setSettings(s => s ? { ...s, isEnabled: v } : s)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Auto-Send on Events</p>
              <p className="text-xs text-gray-500 mt-0.5">Automatically queue messages when events occur (e.g., attendance marked)</p>
            </div>
            <Switch
              checked={settings?.autoSendOnEvents ?? true}
              onCheckedChange={v => setSettings(s => s ? { ...s, autoSendOnEvents: v } : s)}
            />
          </div>

          <div>
            <Label>Default Language</Label>
            <Select
              value={settings?.defaultLanguage ?? "en"}
              onValueChange={v => setSettings(s => s ? { ...s, defaultLanguage: v } : s)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
                <SelectItem value="ta">Tamil</SelectItem>
                <SelectItem value="te">Telugu</SelectItem>
                <SelectItem value="kn">Kannada</SelectItem>
                <SelectItem value="mr">Marathi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSaveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Event-to-Template Mappings */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Event Notification Mappings</CardTitle>
            <Badge variant="outline" className="text-xs">
              {mappings.filter(m => m.isEnabled).length} active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {templates.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <Zap className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No approved templates yet.</p>
              <p className="text-xs mt-1">Create and submit templates to Meta first, then map them to events here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead className="text-center">Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EVENT_DEFINITIONS.map(event => {
                  const mapping = getMappingForEvent(event.key);
                  return (
                    <TableRow key={event.key}>
                      <TableCell className="text-sm font-medium">{event.label}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{event.category}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">{event.audience}</TableCell>
                      <TableCell>
                        <Select
                          value={mapping?.templateId ?? "none"}
                          onValueChange={v => {
                            if (v !== "none")
                              handleMappingChange(event.key, v, mapping?.isEnabled ?? true);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs w-44">
                            <SelectValue placeholder="Select template..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Select template —</SelectItem>
                            {templates.map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={mapping?.isEnabled ?? false}
                          disabled={!mapping?.templateId}
                          onCheckedChange={v => {
                            if (mapping?.templateId)
                              handleMappingChange(event.key, mapping.templateId, v);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
