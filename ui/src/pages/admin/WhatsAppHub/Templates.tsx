import { useEffect, useState } from "react";
import { Plus, Send, Eye, Pencil, Trash2, CheckCircle, Clock, XCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import * as waApi from "@/services/api/whatsappApi";
import type { WhatsAppTemplate } from "@/services/api/whatsappApi";

const statusIcon = (status: string) => {
  switch (status) {
    case "Approved": return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "Submitted": return <Clock className="h-4 w-4 text-amber-600" />;
    case "Rejected": return <XCircle className="h-4 w-4 text-red-600" />;
    default: return <Clock className="h-4 w-4 text-gray-400" />;
  }
};

const statusBadge = (status: string) => {
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    Approved: "default",
    Submitted: "secondary",
    Rejected: "destructive",
    Draft: "outline",
    Paused: "outline",
  };
  return <Badge variant={map[status] ?? "outline"} className="gap-1">{statusIcon(status)} {status}</Badge>;
};

const eventCategories = [
  "attendance", "fees", "exams", "admissions", "leave", "diary",
  "announcements", "emergency", "transport", "hostel", "payroll", "library", "visitor", "general"
];

const PLACEHOLDERS = [
  "{{ParentName}}", "{{StudentName}}", "{{Class}}", "{{Section}}", "{{SchoolName}}",
  "{{Amount}}", "{{DueDate}}", "{{ExamName}}", "{{AttendanceDate}}", "{{AdmissionNumber}}",
  "{{FeeReceiptNumber}}", "{{AcademicYear}}", "{{PrincipalName}}", "{{LeaveType}}",
  "{{LeaveDates}}", "{{BusNumber}}", "{{RouteNumber}}", "{{RoomNumber}}", "{{VisitorName}}",
  "{{BookTitle}}", "{{OverdueDays}}", "{{OverdueFine}}", "{{ResultSummary}}"
];

interface TemplateForm {
  name: string;
  category: string;
  language: string;
  bodyText: string;
  headerType: string;
  headerValue: string;
  footerText: string;
  eventCategory: string;
}

const emptyForm: TemplateForm = {
  name: "", category: "Utility", language: "en",
  bodyText: "", headerType: "None", headerValue: "",
  footerText: "Reply STOP to opt out", eventCategory: "general"
};

export default function WhatsAppTemplates() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [editTemplate, setEditTemplate] = useState<WhatsAppTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [previewText, setPreviewText] = useState("");

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await waApi.getTemplates();
      setTemplates(data);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.bodyText) return;
    try {
      setSubmitting(true);
      await waApi.createTemplate(form);
      toast.success("Template created");
      setCreateDialog(false);
      setForm(emptyForm);
      fetchTemplates();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to create template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitToMeta = async (id: string) => {
    try {
      await waApi.submitTemplate(id);
      toast.success("Template submitted to Meta for approval");
      fetchTemplates();
    } catch {
      toast.error("Failed to submit template");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await waApi.deleteTemplate(id);
      toast.success("Template deleted");
      fetchTemplates();
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const handlePreview = async (template: WhatsAppTemplate) => {
    setPreviewTemplate(template);
    const sampleData: Record<string, string> = {
      "{{ParentName}}": "Mr. Ramesh Sharma",
      "{{StudentName}}": "Aarav Sharma",
      "{{Class}}": "Class 5",
      "{{Section}}": "A",
      "{{SchoolName}}": "Demo School",
      "{{Amount}}": "₹5,000",
      "{{DueDate}}": "30 Jun 2026",
      "{{ExamName}}": "Annual Exam",
      "{{AttendanceDate}}": "10 Jun 2026",
    };
    try {
      const preview = await waApi.previewTemplate(template.id, sampleData);
      setPreviewText(preview);
    } catch {
      setPreviewText(template.bodyText);
    }
  };

  const insertPlaceholder = (ph: string) => {
    setForm(f => ({ ...f, bodyText: f.bodyText + ph }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Templates</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage WhatsApp Utility templates for your school</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTemplates}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={() => { setForm(emptyForm); setCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Template
          </Button>
        </div>
      </div>

      {/* Meta Compliance Notice */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <strong>Meta Compliance:</strong> Only Utility templates are allowed. Use factual, transactional language. Avoid promotional phrases. Templates require Meta approval (24–72 hours).
      </div>

      {/* Templates Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageIcon />
              <p className="mt-2 text-sm">No templates yet. Create your first template to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                    <TableCell className="text-sm text-gray-500">{t.eventCategory ?? "—"}</TableCell>
                    <TableCell>{statusBadge(t.status)}</TableCell>
                    <TableCell className="text-sm text-gray-400">
                      {new Date(t.createdAt).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handlePreview(t)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {t.status === "Draft" || t.status === "Rejected" ? (
                          <Button variant="ghost" size="sm" onClick={() => handleSubmitToMeta(t.id)}
                            title="Submit to Meta for approval">
                            <Send className="h-4 w-4 text-green-600" />
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Template Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create WhatsApp Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Name *</Label>
                <Input placeholder="fee_due_reminder" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/\s/g, "_") }))} />
                <p className="text-xs text-gray-400 mt-1">Lowercase, underscores only</p>
              </div>
              <div>
                <Label>Event Category</Label>
                <Select value={form.eventCategory} onValueChange={v => setForm(f => ({ ...f, eventCategory: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {eventCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Utility">Utility (Recommended)</SelectItem>
                    <SelectItem value="Authentication">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Language</Label>
                <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
            </div>

            <div>
              <Label>Message Body *</Label>
              <Textarea
                placeholder="Dear {{ParentName}}, {{StudentName}} was absent on {{AttendanceDate}}. - {{SchoolName}}"
                value={form.bodyText}
                onChange={e => setForm(f => ({ ...f, bodyText: e.target.value }))}
                rows={4}
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {PLACEHOLDERS.slice(0, 8).map(ph => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertPlaceholder(ph)}
                    className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100"
                  >
                    {ph}
                  </button>
                ))}
                <span className="text-xs text-gray-400 self-center">+ more</span>
              </div>
            </div>

            <div>
              <Label>Footer Text</Label>
              <Input value={form.footerText}
                onChange={e => setForm(f => ({ ...f, footerText: e.target.value }))}
                placeholder="Reply STOP to opt out" />
            </div>

            {/* Compliance checklist */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
              <p className="font-medium">Before submitting to Meta, verify:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Message is transactional/informational (not promotional)</li>
                <li>No "Buy now", "Limited offer", "Discount" phrases</li>
                <li>No ALL CAPS in body text</li>
                <li>Footer includes opt-out instruction</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.name || !form.bodyText}>
              {submitting ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-[#dcf8c6] rounded-lg p-4 shadow-sm max-w-xs ml-auto">
              {previewTemplate?.headerType !== "None" && previewTemplate?.headerValue && (
                <p className="font-semibold text-sm mb-2 text-gray-800">{previewTemplate.headerValue}</p>
              )}
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{previewText}</p>
              {previewTemplate?.footerText && (
                <p className="text-xs text-gray-400 mt-2 border-t border-gray-200 pt-2">{previewTemplate.footerText}</p>
              )}
              <p className="text-xs text-gray-400 text-right mt-2">10:30 AM ✓✓</p>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Status:</strong> {previewTemplate?.status}</p>
              <p><strong>Category:</strong> {previewTemplate?.category}</p>
              {previewTemplate?.rejectionReason && (
                <p className="text-red-600"><strong>Rejection:</strong> {previewTemplate.rejectionReason}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Close</Button>
            {previewTemplate && (previewTemplate.status === "Draft" || previewTemplate.status === "Rejected") && (
              <Button onClick={() => {
                handleSubmitToMeta(previewTemplate.id);
                setPreviewTemplate(null);
              }}>
                Submit to Meta
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageIcon() {
  return (
    <svg className="h-12 w-12 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
