/**
 * DocumentManager — Production-grade document management UI
 * Connects to /api/documents endpoints (real API, no mocks)
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, FolderOpen, Download, Trash2, Plus, Search,
  Edit2, Tag, Shield, BarChart2, AlertCircle, ExternalLink, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorBoundary, LoadingState, EmptyState, ConfirmDialog, useConfirmDialog } from "@/components/common";
import {
  getCategories, getDocuments, createCategory, updateCategory, deleteCategory,
  createDocument, updateDocument, deleteDocument, incrementDownload,
  searchDocuments, getDocumentStats,
  DocumentCategory, DocumentItem, DocumentStats,
  CreateDocumentCategoryRequest, CreateDocumentRequest, UpdateDocumentRequest
} from "@/services/api/documentApi";
import { useLanguage } from "@/contexts/LanguageContext";

const ACCESS_LEVELS = ["Public", "Private", "Class", "Section", "Staff", "Student"] as const;
const ACCESS_COLORS: Record<string, string> = {
  Public: "bg-green-100 text-green-800",
  Private: "bg-red-100 text-red-800",
  Class: "bg-blue-100 text-blue-800",
  Section: "bg-purple-100 text-purple-800",
  Staff: "bg-yellow-100 text-yellow-800",
  Student: "bg-orange-100 text-orange-800",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function StatsBar({ stats }: { stats: DocumentStats }) {
  const { t } = useLanguage();
  const cards = [
    { label: t('docs.stats.totalDocuments'), value: stats.totalDocuments, icon: <FileText className="h-5 w-5 text-blue-500" /> },
    { label: t('docs.stats.totalCategories'), value: stats.totalCategories, icon: <FolderOpen className="h-5 w-5 text-purple-500" /> },
    { label: t('docs.stats.totalDownloads'), value: stats.totalDownloads, icon: <Download className="h-5 w-5 text-green-500" /> },
    { label: t('docs.stats.storageUsed'), value: stats.totalSizeFormatted, icon: <BarChart2 className="h-5 w-5 text-orange-500" /> },
    { label: t('docs.stats.addedLast7Days'), value: stats.addedLast7Days, icon: <Plus className="h-5 w-5 text-teal-500" /> },
    { label: t('docs.stats.addedLast30Days'), value: stats.addedLast30Days, icon: <RefreshCw className="h-5 w-5 text-indigo-500" /> },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map((c) => (
        <Card key={c.label} className="p-3">
          <div className="flex items-center gap-2">
            {c.icon}
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-lg font-bold">{c.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

interface CategoryFormProps { open: boolean; onClose: () => void; initial?: DocumentCategory | null; }
function CategoryFormDialog({ open, onClose, initial }: CategoryFormProps) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [color, setColor] = useState(initial?.color ?? "#3B82F6");
  const [displayOrder, setDisplayOrder] = useState(String(initial?.displayOrder ?? 0));
  const isEdit = !!initial;
  const mutation = useMutation({
    mutationFn: () => {
      const payload: CreateDocumentCategoryRequest = { name: name.trim(), description: description.trim() || undefined, icon: icon.trim() || undefined, color: color.trim() || undefined, displayOrder: Number(displayOrder) || 0 };
      return isEdit ? updateCategory(initial!.id, payload) : createCategory(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["doc-categories"] }); qc.invalidateQueries({ queryKey: ["doc-stats"] }); toast.success(isEdit ? t('docs.category.updateSuccess') : t('docs.category.createSuccess')); onClose(); },
    onError: (e: Error) => toast.error(e.message ?? t('docs.document.saveError')),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? t('docs.category.editTitle') : t('docs.category.newTitle')}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{t('docs.category.nameLabel')}</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Circulars" /></div>
          <div><Label>{t('docs.category.descLabel')}</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t('docs.category.iconLabel')}</Label><Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="📄" maxLength={50} /></div>
            <div><Label>{t('docs.category.colorLabel')}</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 p-1" /></div>
          </div>
          <div><Label>{t('docs.category.displayOrderLabel')}</Label><Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} min={0} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => mutation.mutate()} disabled={!name.trim() || mutation.isPending}>{mutation.isPending ? t('common.saving') : isEdit ? t('common.update') : t('common.create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesTab() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentCategory | null>(null);
  const { confirm, ConfirmDialogElement } = useConfirmDialog();
  const { data, isLoading, isError } = useQuery({ queryKey: ["doc-categories"], queryFn: () => getCategories(1, 100) });
  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["doc-categories"] }); qc.invalidateQueries({ queryKey: ["doc-stats"] }); toast.success(t('docs.category.deleteSuccess')); },
    onError: (e: Error) => toast.error(e.message ?? t('docs.category.deleteError')),
  });
  if (isLoading) return <LoadingState message={t('docs.category.loading')} />;
  if (isError) return <div className="flex items-center gap-2 text-destructive p-4"><AlertCircle className="h-4 w-4" /> {t('docs.category.loadError')}</div>;
  const categories = data?.categories ?? [];
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{categories.length} {t('docs.category.count')}</p>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4 mr-1" /> {t('docs.tabs.categories').replace('s','')}</Button>
      </div>
      {categories.length === 0 ? <EmptyState title={t('docs.category.emptyTitle')} description={t('docs.category.emptyDesc')} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <Card key={cat.id} className="p-4 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: cat.color ?? "#E5E7EB" }}>{cat.icon ?? <FolderOpen className="h-4 w-4" />}</div>
                <div>
                  <p className="font-medium text-sm">{cat.name}</p>
                  {cat.description && <p className="text-xs text-muted-foreground line-clamp-1">{cat.description}</p>}
                  <p className="text-xs text-muted-foreground">{cat.documentCount} {t('docs.category.documentCount')}</p>
                </div>
              </div>
              <div className="flex gap-1 ml-2 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(cat); setFormOpen(true); }}><Edit2 className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={async () => { const ok = await confirm({ title: "Delete Category?", description: `Delete "${cat.name}"? This will fail if there are active documents in this category.` }); if (ok) deleteMutation.mutate(cat.id); }}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {ConfirmDialogElement}
      <CategoryFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} initial={editing} />
    </div>
  );
}

interface DocFormProps { open: boolean; onClose: () => void; categories: DocumentCategory[]; initial?: DocumentItem | null; }
function DocumentFormDialog({ open, onClose, categories, initial }: DocFormProps) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [fileUrl, setFileUrl] = useState(initial?.fileUrl ?? "");
  const [fileName, setFileName] = useState(initial?.fileName ?? "");
  const [fileType, setFileType] = useState(initial?.fileType ?? "PDF");
  const [fileSize, setFileSize] = useState(String(initial?.fileSize ?? ""));
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [accessLevel, setAccessLevel] = useState(initial?.accessLevel ?? "Staff");
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [expiryDate, setExpiryDate] = useState(initial?.expiryDate ? initial.expiryDate.split("T")[0] : "");
  const mutation = useMutation({
    mutationFn: () => {
      if (isEdit) { const payload: UpdateDocumentRequest = { title: title.trim() || undefined, description: description.trim() || undefined, fileUrl: fileUrl.trim() || undefined, fileName: fileName.trim() || undefined, fileType: fileType.trim().toUpperCase() || undefined, fileSize: fileSize ? Number(fileSize) : undefined, categoryId: categoryId || undefined, accessLevel: accessLevel || undefined, tags: tags.trim() || undefined, expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined }; return updateDocument(initial!.id, payload); }
      const payload: CreateDocumentRequest = { title: title.trim(), description: description.trim() || undefined, fileUrl: fileUrl.trim(), fileName: fileName.trim(), fileType: fileType.trim().toUpperCase(), fileSize: Number(fileSize), categoryId, accessLevel, tags: tags.trim() || undefined, expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined };
      return createDocument(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["doc-documents"] }); qc.invalidateQueries({ queryKey: ["doc-stats"] }); toast.success(isEdit ? t('docs.document.updateSuccess') : t('docs.document.uploadSuccess')); onClose(); },
    onError: (e: Error) => toast.error(e.message ?? t('docs.document.saveError')),
  });
  const canSubmit = !isEdit ? !!(title.trim() && fileUrl.trim() && fileName.trim() && fileType.trim() && fileSize && categoryId && accessLevel) : true;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? t('docs.document.editTitle') : t('docs.document.uploadTitle')}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{t('docs.document.titleLabel')}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('docs.document.titlePlaceholder')} /></div>
          <div><Label>{t('common.description')}</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t('docs.document.fileUrlLabel')}</Label><Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." /></div>
            <div><Label>{t('docs.document.fileNameLabel')}</Label><Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="document.pdf" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t('docs.document.fileTypeLabel')}</Label><Input value={fileType} onChange={(e) => setFileType(e.target.value)} placeholder="PDF" maxLength={50} /></div>
            <div><Label>{t('docs.document.fileSizeLabel')}</Label><Input type="number" value={fileSize} onChange={(e) => setFileSize(e.target.value)} min={1} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t('docs.document.categoryLabel')}</Label><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger><SelectValue placeholder={t('docs.document.selectCategoryPlaceholder')} /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{t('docs.document.accessLevelLabel')}</Label><Select value={accessLevel} onValueChange={setAccessLevel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ACCESS_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div><Label>{t('docs.document.tagsLabel')}</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('docs.document.tagsPlaceholder')} maxLength={200} /></div>
          <div><Label>{t('docs.document.expiryDateLabel')}</Label><Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>{mutation.isPending ? t('common.saving') : isEdit ? t('common.update') : t('docs.document.uploadBtn')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocumentsTab({ categories }: { categories: DocumentCategory[] }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterAccess, setFilterAccess] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentItem | null>(null);
  const { confirm, ConfirmDialogElement } = useConfirmDialog();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["doc-documents", filterCategory, filterAccess, page, searchTerm],
    queryFn: () => searchTerm
      ? searchDocuments(searchTerm).then((docs) => ({ documents: docs, totalCount: docs.length, page: 1, pageSize: docs.length, totalPages: 1 }))
      : getDocuments({ categoryId: filterCategory !== "all" ? filterCategory : undefined, accessLevel: filterAccess !== "all" ? filterAccess : undefined, page, pageSize: 20 }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["doc-documents"] }); qc.invalidateQueries({ queryKey: ["doc-stats"] }); toast.success(t('docs.document.deleteSuccess')); },
    onError: (e: Error) => toast.error(e.message ?? t('docs.document.deleteError')),
  });
  const downloadMutation = useMutation({
    mutationFn: ({ id, url }: { id: string; url: string }) => incrementDownload(id).then(() => url),
    onSuccess: (url) => window.open(url, "_blank"),
    onError: () => toast.error(t('docs.document.downloadError')),
  });
  const handleSearch = () => { setSearchTerm(searchInput.trim()); setPage(1); };
  const clearSearch = () => { setSearchTerm(""); setSearchInput(""); setPage(1); };
  if (isLoading) return <LoadingState message={t('common.loading')} />;
  if (isError) return <div className="flex items-center gap-2 text-destructive p-4"><AlertCircle className="h-4 w-4" /> {t('docs.document.loadError')}</div>;
  const docs = data?.documents ?? [];
  const totalPages = data?.totalPages ?? 1;
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1 flex-1 min-w-[200px]">
        <Input placeholder={t('docs.document.searchPlaceholder')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
        <Button size="sm" onClick={handleSearch}><Search className="h-4 w-4" /></Button>
        {searchTerm && <Button size="sm" variant="outline" onClick={clearSearch}>{t('common.clear')}</Button>}
        </div>
        <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent><SelectItem value="all">{t('docs.document.allCategories')}</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterAccess} onValueChange={(v) => { setFilterAccess(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Access level" /></SelectTrigger>
          <SelectContent><SelectItem value="all">{t('docs.document.allLevels')}</SelectItem>{ACCESS_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4 mr-1" /> {t('docs.document.uploadBtn')}</Button>
      </div>
      {docs.length === 0 ? <EmptyState title={t('docs.document.emptyTitle')} description={searchTerm ? `No results for "${searchTerm}"` : t('docs.document.emptyDesc')} /> : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('docs.document.colTitle')}</TableHead><TableHead>{t('docs.document.colCategory')}</TableHead><TableHead>{t('docs.document.colType')}</TableHead><TableHead>{t('docs.document.colSize')}</TableHead><TableHead>{t('docs.document.colAccess')}</TableHead><TableHead>{t('docs.document.colDownloads')}</TableHead><TableHead>{t('docs.document.colUploaded')}</TableHead><TableHead className="w-24">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium max-w-[160px]">
                      <div className="truncate" title={doc.title}>{doc.title}</div>
                      {doc.tags && <div className="flex gap-1 mt-1 flex-wrap">{doc.tags.split(",").slice(0, 2).map((tag) => <span key={tag} className="text-xs text-muted-foreground flex items-center gap-0.5"><Tag className="h-2.5 w-2.5" />{tag.trim()}</span>)}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{doc.categoryName ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{doc.fileType}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatBytes(doc.fileSize)}</TableCell>
                    <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACCESS_COLORS[doc.accessLevel] ?? "bg-gray-100 text-gray-800"}`}>{doc.accessLevel}</span></TableCell>
                    <TableCell className="text-sm text-center">{doc.downloadCount}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title={t('common.open')} onClick={() => downloadMutation.mutate({ id: doc.id, url: doc.fileUrl })}><ExternalLink className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title={t('common.edit')} onClick={() => { setEditing(doc); setFormOpen(true); }}><Edit2 className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title={t('common.delete')} onClick={async () => { const ok = await confirm({ title: t('docs.document.deleteTitle'), description: `Delete "${doc.title}"? ${t('common.cannotUndo')}` }); if (ok) deleteMutation.mutate(doc.id); }}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!searchTerm && totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {data?.totalCount ?? 0} documents</p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('common.prev')}</Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t('common.next')}</Button>
              </div>
            </div>
          )}
        </>
      )}
      {ConfirmDialogElement}
      <DocumentFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} categories={categories} initial={editing} />
    </div>
  );
}

function StatsTab({ stats }: { stats: DocumentStats }) {
  const { t } = useLanguage();
  const sections = [
    { title: t('docs.stats.byCategory'), data: stats.byCategory, icon: <FolderOpen className="h-4 w-4 text-purple-500" /> },
    { title: t('docs.stats.byAccessLevel'), data: stats.byAccessLevel, icon: <Shield className="h-4 w-4 text-blue-500" /> },
    { title: t('docs.stats.byFileType'), data: stats.byFileType, icon: <FileText className="h-4 w-4 text-green-500" /> },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {sections.map((s) => (
        <Card key={s.title}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">{s.icon}{s.title}</CardTitle></CardHeader>
          <CardContent>
            {Object.entries(s.data).length === 0 ? <p className="text-xs text-muted-foreground">No data</p> : (
              <ul className="space-y-1">{Object.entries(s.data).sort((a, b) => b[1] - a[1]).map(([k, v]) => <li key={k} className="flex justify-between text-sm"><span className="text-muted-foreground truncate mr-2">{k}</span><span className="font-medium">{v}</span></li>)}</ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DocumentManager() {
  const { t } = useLanguage();
  const { data: statsData } = useQuery({ queryKey: ["doc-stats"], queryFn: getDocumentStats, staleTime: 60_000 });
  const { data: categoriesData } = useQuery({ queryKey: ["doc-categories"], queryFn: () => getCategories(1, 100), staleTime: 60_000 });
  const categories = categoriesData?.categories ?? [];
  return (
    <ErrorBoundary>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-blue-500" /> {t('docs.title')}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t('docs.subtitle')}</p>
          </div>
        </div>
        {statsData && <StatsBar stats={statsData} />}
        <Tabs defaultValue="documents">
          <TabsList>
            <TabsTrigger value="documents">{t('docs.tabs.documents')}</TabsTrigger>
            <TabsTrigger value="categories">{t('docs.tabs.categories')}</TabsTrigger>
            {statsData && <TabsTrigger value="stats">{t('docs.tabs.analytics')}</TabsTrigger>}
          </TabsList>
          <TabsContent value="documents" className="mt-4"><DocumentsTab categories={categories} /></TabsContent>
          <TabsContent value="categories" className="mt-4"><CategoriesTab /></TabsContent>
          {statsData && <TabsContent value="stats" className="mt-4"><StatsTab stats={statsData} /></TabsContent>}
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}

export default DocumentManager;
