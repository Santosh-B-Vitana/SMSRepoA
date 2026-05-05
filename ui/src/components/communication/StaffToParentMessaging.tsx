import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Send, MessageSquare, Plus, Search, Trash2, Eye,
  Mail, Clock, User, CheckCircle, AlertCircle, Loader,
  Users, ChevronLeft, ChevronRight, Phone, AtSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import staffCommunicationApi, { Student, GuardianInfo, Message } from "@/services/api/staffCommunicationApi";

const PAGE_SIZE = 10;

// Flat row type for the students+parents table
interface StudentParentRow {
  studentId: string;
  studentName: string;
  rollNumber: string;
  class: string;
  section: string;
  guardian: GuardianInfo;
}

function relationBadgeColor(relation: string) {
  const r = relation.toLowerCase();
  if (r === 'father') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (r === 'mother') return 'bg-pink-50 text-pink-700 border-pink-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
}

export default function StaffToParentMessaging() {
  const [students, setStudents] = useState<Student[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [showBulkSend, setShowBulkSend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [rosterPage, setRosterPage] = useState(1);
  const [isSending, setIsSending] = useState(false);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const { toast } = useToast();

  const [composeData, setComposeData] = useState({
    subject: '',
    message: '',
    guardianPortalUserId: '',
    studentId: '',
    guardianLabel: ''
  });

  const [bulkData, setBulkData] = useState({
    subject: '',
    message: '',
    sendToAll: true,
    selectedParents: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsData, messagesData] = await Promise.all([
        staffCommunicationApi.getClassStudents(),
        staffCommunicationApi.getSentMessages(1, 50)
      ]);
      setStudents(studentsData);
      setMessages(messagesData.items);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load class students",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Flatten students â†’ one row per guardian
  const allRows: StudentParentRow[] = useMemo(() => {
    return students.flatMap(s =>
      (s.guardians ?? []).map(g => ({
        studentId: s.id,
        studentName: s.name,
        rollNumber: s.rollNumber,
        class: s.class,
        section: s.section,
        guardian: g
      }))
    );
  }, [students]);

  // Unique sections for filter tabs
  const sections = useMemo(() => {
    const set = new Set(students.map(s => s.section).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [students]);

  // Filtered + paginated rows
  const filteredRows = useMemo(() => {
    const q = rosterSearch.toLowerCase();
    return allRows.filter(r => {
      const matchesSection = sectionFilter === 'all' || r.section === sectionFilter;
      const matchesSearch = !q ||
        (r.studentName ?? '').toLowerCase().includes(q) ||
        (r.guardian?.name ?? '').toLowerCase().includes(q) ||
        (r.rollNumber ?? '').toLowerCase().includes(q);
      return matchesSection && matchesSearch;
    });
  }, [allRows, rosterSearch, sectionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((rosterPage - 1) * PAGE_SIZE, rosterPage * PAGE_SIZE);

  // Groups by section for display headers
  const sectionGroups = useMemo(() => {
    const groups: Record<string, StudentParentRow[]> = {};
    pagedRows.forEach(r => {
      const key = `${r.class} â€“ ${r.section || 'No Section'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  }, [pagedRows]);

  // All guardians with portal accounts for dropdowns
  const guardiansWithPortal = useMemo(() => {
    return allRows.filter(r => r.guardian.portalUserId);
  }, [allRows]);

  const handleSendMessage = async () => {
    if (!composeData.subject.trim() || composeData.subject.trim().length < 3) {
      toast({ title: "Error", description: "Subject must be at least 3 characters", variant: "destructive" });
      return;
    }
    if (!composeData.message.trim() || composeData.message.trim().length < 10) {
      toast({ title: "Error", description: "Message must be at least 10 characters", variant: "destructive" });
      return;
    }
    if (!composeData.guardianPortalUserId) {
      toast({ title: "Error", description: "Please select a parent/guardian", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      const response = await staffCommunicationApi.sendToParent({
        subject: composeData.subject,
        message: composeData.message,
        parentUserId: composeData.guardianPortalUserId,
        studentId: composeData.studentId || undefined,
        messageType: 'Text'
      });
      setMessages([response, ...messages]);
      toast({ title: "Success", description: `Message sent to ${composeData.guardianLabel}` });
      setComposeData({ subject: '', message: '', guardianPortalUserId: '', studentId: '', guardianLabel: '' });
      setShowCompose(false);
    } catch {
      toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleBulkSend = async () => {
    if (!bulkData.subject.trim() || !bulkData.message.trim()) {
      toast({ title: "Error", description: "Subject and message are required", variant: "destructive" });
      return;
    }
    const portalParents = guardiansWithPortal;
    if (bulkData.sendToAll && portalParents.length === 0) {
      toast({ title: "Error", description: "No parents with portal accounts found", variant: "destructive" });
      return;
    }
    if (!bulkData.sendToAll && bulkData.selectedParents.length === 0) {
      toast({ title: "Error", description: "Please select at least one parent", variant: "destructive" });
      return;
    }
    setIsSendingBulk(true);
    try {
      const result = await staffCommunicationApi.bulkSendToParents({
        subject: bulkData.subject,
        message: bulkData.message,
        parentUserIds: bulkData.sendToAll ? undefined : bulkData.selectedParents,
        sendToAllClassParents: bulkData.sendToAll,
        messageType: 'Text'
      });
      toast({ title: "Success", description: `Sent to ${result.successCount} parent(s).${result.failureCount > 0 ? ` ${result.failureCount} failed.` : ''}` });
      setBulkData({ subject: '', message: '', sendToAll: true, selectedParents: [] });
      setShowBulkSend(false);
      await loadData();
    } catch {
      toast({ title: "Error", description: "Failed to send bulk messages.", variant: "destructive" });
    } finally {
      setIsSendingBulk(false);
    }
  };

  const filteredMessages = messages.filter(m =>
    m.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Message Parents</h1>
          <p className="text-gray-500 mt-1">Send messages to parents of your students</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCompose} onOpenChange={setShowCompose}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Send Message</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Send Message to Parent</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select Parent/Guardian *</Label>
                  <Select
                    value={composeData.guardianPortalUserId}
                    onValueChange={(val) => {
                      const row = guardiansWithPortal.find(r => r.guardian.portalUserId === val);
                      setComposeData({
                        ...composeData,
                        guardianPortalUserId: val,
                        studentId: row?.studentId ?? '',
                        guardianLabel: row ? `${row.guardian.name} (${row.studentName})` : ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={guardiansWithPortal.length === 0 ? "No parents with portal accounts" : "Choose parent..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {guardiansWithPortal.map((r, i) => (
                        <SelectItem key={`${r.guardian.guardianId}_${i}`} value={r.guardian.portalUserId!}>
                          {r.guardian.name} â€“ {r.studentName} ({r.class}{r.section ? ` ${r.section}` : ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {guardiansWithPortal.length === 0 && !loading && (
                    <p className="text-xs text-amber-600 mt-1">No parents have portal accounts yet. Bulk send uses all guardians.</p>
                  )}
                </div>
                <div>
                  <Label>Subject * (min 3 chars)</Label>
                  <Input placeholder="Message subject" value={composeData.subject}
                    onChange={e => setComposeData({ ...composeData, subject: e.target.value })} disabled={isSending} />
                </div>
                <div>
                  <Label>Message * (min 10 chars)</Label>
                  <Textarea placeholder="Write your message here..." rows={6} value={composeData.message}
                    onChange={e => setComposeData({ ...composeData, message: e.target.value })} disabled={isSending} />
                  <div className="text-xs text-gray-400 mt-1">{composeData.message.length} / 5000 characters</div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCompose(false)} disabled={isSending}>Cancel</Button>
                <Button onClick={handleSendMessage} className="gap-2" disabled={isSending}>
                  {isSending ? <><Loader className="h-4 w-4 animate-spin" /> Sending...</> : <><Send className="h-4 w-4" /> Send</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showBulkSend} onOpenChange={setShowBulkSend}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><Mail className="h-4 w-4" /> Bulk Send</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Bulk Send to All Parents</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <input type="checkbox" id="sendAll" checked={bulkData.sendToAll}
                    onChange={e => setBulkData({ ...bulkData, sendToAll: e.target.checked, selectedParents: [] })}
                    disabled={isSendingBulk} className="h-4 w-4" />
                  <label htmlFor="sendAll" className="text-sm font-medium">
                    Send to all parents ({guardiansWithPortal.length} with portal accounts)
                  </label>
                </div>
                {!bulkData.sendToAll && (
                  <div>
                    <Label>Select Parents</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {guardiansWithPortal.map((r, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="checkbox" id={`bulk_${i}`}
                            checked={bulkData.selectedParents.includes(r.guardian.portalUserId!)}
                            onChange={e => {
                              const id = r.guardian.portalUserId!;
                              setBulkData({ ...bulkData, selectedParents: e.target.checked
                                ? [...bulkData.selectedParents, id]
                                : bulkData.selectedParents.filter(x => x !== id) });
                            }} disabled={isSendingBulk} />
                          <label htmlFor={`bulk_${i}`} className="text-sm">
                            {r.guardian.name} â€“ {r.studentName}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label>Subject *</Label>
                  <Input placeholder="Message subject" value={bulkData.subject}
                    onChange={e => setBulkData({ ...bulkData, subject: e.target.value })} disabled={isSendingBulk} />
                </div>
                <div>
                  <Label>Message *</Label>
                  <Textarea placeholder="Write your message here..." rows={6} value={bulkData.message}
                    onChange={e => setBulkData({ ...bulkData, message: e.target.value })} disabled={isSendingBulk} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBulkSend(false)} disabled={isSendingBulk}>Cancel</Button>
                <Button onClick={handleBulkSend} className="gap-2" disabled={isSendingBulk}>
                  {isSendingBulk ? <><Loader className="h-4 w-4 animate-spin" /> Sending...</> : <><Mail className="h-4 w-4" /> Send</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* â”€â”€ TABS: Students & Parents first (default), then Sent Messages â”€â”€ */}
      <Tabs defaultValue="students" className="w-full">
        <TabsList>
          <TabsTrigger value="students" className="gap-2">
            <Users className="h-4 w-4" /> Students &amp; Parents
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <MessageSquare className="h-4 w-4" /> Sent Messages
          </TabsTrigger>
        </TabsList>

        {/* â”€â”€â”€ STUDENTS & PARENTS TAB â”€â”€â”€ */}
        <TabsContent value="students" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>Class Roster with Parent Contacts</CardTitle>
                  <CardDescription>
                    {allRows.length} guardian record{allRows.length !== 1 ? 's' : ''} across {students.length} student{students.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search student or parent..."
                      value={rosterSearch}
                      onChange={e => { setRosterSearch(e.target.value); setRosterPage(1); }}
                      className="pl-8 w-52"
                    />
                  </div>
                </div>
              </div>

              {/* Section filter pills */}
              {sections.length > 2 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {sections.map(sec => (
                    <button
                      key={sec}
                      onClick={() => { setSectionFilter(sec); setRosterPage(1); }}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        sectionFilter === sec
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {sec === 'all' ? 'All Sections' : `Section ${sec}`}
                    </button>
                  ))}
                </div>
              )}
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <Loader className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                  <p className="text-gray-500">Loading class roster...</p>
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No students found</p>
                  <p className="text-sm mt-1">
                    {students.length === 0
                      ? "You have no students assigned to your classes yet."
                      : "Try adjusting your search or section filter."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Group by section when viewing all sections */}
                  {Object.entries(sectionGroups).map(([sectionLabel, rows]) => (
                    <div key={sectionLabel} className="mb-6 last:mb-0">
                      {sectionFilter === 'all' && Object.keys(sectionGroups).length > 1 && (
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{sectionLabel}</span>
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-xs text-gray-400">{rows.length} record{rows.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      <div className="overflow-x-auto rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="w-8">#</TableHead>
                              <TableHead>Student</TableHead>
                              <TableHead>Roll</TableHead>
                              <TableHead>Guardian</TableHead>
                              <TableHead>Relation</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Email / Portal</TableHead>
                              <TableHead className="text-center">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((row, idx) => (
                              <TableRow key={`${row.studentId}_${row.guardian.guardianId}`} className="hover:bg-gray-50/50">
                                <TableCell className="text-gray-400 text-xs">{(rosterPage - 1) * PAGE_SIZE + filteredRows.indexOf(row) + 1}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                      {row.studentName.charAt(0)}
                                    </div>
                                    <span className="font-medium text-sm">{row.studentName}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">{row.rollNumber}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <User className="h-3.5 w-3.5 text-gray-400" />
                                    <span className="text-sm font-medium">{row.guardian.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${relationBadgeColor(row.guardian.relation)}`}>
                                    {row.guardian.relation}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    {row.guardian.phone || <span className="text-gray-300">â€”</span>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {row.guardian.email ? (
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <AtSign className="h-3 w-3" />
                                        {row.guardian.email}
                                      </div>
                                      {row.guardian.portalUserId ? (
                                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
                                          <CheckCircle className="h-3 w-3" /> Portal active
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">No portal</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-300 text-xs">No email</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {row.guardian.portalUserId ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1 h-7 text-xs"
                                      onClick={() => {
                                        setComposeData({
                                          subject: '',
                                          message: '',
                                          guardianPortalUserId: row.guardian.portalUserId!,
                                          studentId: row.studentId,
                                          guardianLabel: `${row.guardian.name} (${row.studentName})`
                                        });
                                        setShowCompose(true);
                                      }}
                                    >
                                      <Send className="h-3 w-3" /> Message
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-gray-300">No portal</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-gray-500">
                        Showing {(rosterPage - 1) * PAGE_SIZE + 1}â€“{Math.min(rosterPage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          variant="outline" size="sm"
                          disabled={rosterPage === 1}
                          onClick={() => setRosterPage(p => p - 1)}
                          className="gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" /> Prev
                        </Button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                          <Button
                            key={p}
                            variant={p === rosterPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setRosterPage(p)}
                            className="w-8"
                          >
                            {p}
                          </Button>
                        ))}
                        <Button
                          variant="outline" size="sm"
                          disabled={rosterPage === totalPages}
                          onClick={() => setRosterPage(p => p + 1)}
                          className="gap-1"
                        >
                          Next <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* â”€â”€â”€ SENT MESSAGES TAB â”€â”€â”€ */}
        <TabsContent value="sent" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Message History</CardTitle>
              <CardDescription>All messages sent to parents</CardDescription>
              <div className="mt-3 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by parent name or subject..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <Loader className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Loading messages...</p>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No messages yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMessages.map(msg => (
                        <TableRow key={msg.id}>
                          <TableCell>
                            {msg.isRead ? (
                              <Badge variant="outline" className="gap-1"><CheckCircle className="h-3 w-3" /> Read</Badge>
                            ) : (
                              <Badge variant="default" className="gap-1"><AlertCircle className="h-3 w-3" /> Unread</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{msg.parentName}</p>
                              <p className="text-xs text-gray-400">{msg.parentEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>{msg.studentName}</TableCell>
                          <TableCell className="max-w-xs truncate">{msg.subject}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Clock className="h-3 w-3" />
                              {new Date(msg.sentAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600"
                                onClick={() => setMessages(messages.filter(m => m.id !== msg.id))}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
