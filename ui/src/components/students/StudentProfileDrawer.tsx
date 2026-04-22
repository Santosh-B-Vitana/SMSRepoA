import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Dialog as RadixDialog } from "@radix-ui/react-dialog";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Student, studentApi } from "@/services/api/studentApi";
import placeholderImg from '/placeholder.svg';
import { useLanguage } from "@/contexts/LanguageContext";
import { Users } from "lucide-react";

function SiblingInfo({ siblingId }: { siblingId: string }) {
  const [sibling, setSibling] = useState<Student | null>(null);
  
  useEffect(() => {
    studentApi.getById(siblingId).then(setSibling).catch(() => setSibling(null));
  }, [siblingId]);
  
  if (!sibling) return null;
  
  return (
    <div className="flex items-center gap-3 p-2 bg-background rounded border">
      <Users className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <div className="font-medium text-sm">{sibling.name}</div>
        <div className="text-sm text-muted-foreground">{t('studentProfile.rollNo')}: {sibling.rollNumber || "—"}</div>
      </div>
    </div>
  );
}

export function StudentProfileDrawer({ studentId, open, onClose }: {
  studentId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    if (open && studentId) {
      setLoading(true);
      studentApi.getById(studentId).then(setStudent).finally(() => setLoading(false));
    }
  }, [open, studentId]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full p-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle>{t('studentProfile.title')}</DialogTitle>
        </DialogHeader>
        <div className="p-6 flex flex-col gap-6">
          {loading || !student ? (
            <div className="text-center text-muted-foreground">{t('common.loading')}</div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <span className="inline-block w-20 h-20 rounded-full overflow-hidden bg-gray-200 border border-gray-300">
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <img src={placeholderImg} alt="No photo" className="w-full h-full object-cover opacity-60" />
                    )}
                  </span>
                  <label 
                    htmlFor={`photo-upload-${student.id}`} 
                    className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:bg-primary/90 transition-colors"
                    title={t('common.uploadPhoto')}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </label>
                  <input
                    id={`photo-upload-${student.id}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file && student) {
                        try {
                          // TODO: Implement photo upload to backend API
                          console.log('Photo upload not yet implemented for backend:', file.name);
                          // const photoUrl = await studentApi.uploadPhoto(student.id, file);
                          // setStudent({ ...student, photoUrl });
                        } catch (error) {
                          console.error('Failed to upload photo:', error);
                        }
                      }
                    }}
                  />
                </div>
                <div>
                  <div className="text-xl font-bold">{student.name}</div>
                  <div className="text-sm text-muted-foreground">{t('studentProfile.rollNo')}: {student.rollNumber || "—"}</div>
                  <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className="mt-2">
                    {student.status === 'active' ? t('common.active') : t('common.inactive')}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="font-semibold">{t('studentProfile.classSection')}</div>
                  <div>{student.class}-{student.section}</div>
                </div>
                <div>
                  <div className="font-semibold">{t('studentProfile.dob')}</div>
                  <div>{student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '—'}</div>
                </div>
                <div>
                  <div className="font-semibold">{t('studentProfile.guardian')}</div>
                  <div>{student.guardianName}</div>
                </div>
                <div>
                  <div className="font-semibold">{t('studentProfile.guardianPhone')}</div>
                  <div>{student.guardianPhone}</div>
                </div>
                <div>
                  <div className="font-semibold">{t('studentProfile.address')}</div>
                  <div>{student.address}</div>
                </div>
                <div>
                  <div className="font-semibold">{t('studentProfile.category')}</div>
                  <div>{student.category}</div>
                </div>
                <div>
                  <div className="font-semibold">{t('studentProfile.admissionDate')}</div>
                  <div>{student.admissionDate}</div>
                </div>
                {student.previousSchool && (
                  <div>
                    <div className="font-semibold">{t('studentProfile.previousSchool')}</div>
                    <div>{student.previousSchool}</div>
                  </div>
                )}
              </div>
              
              {/* Siblings Section */}
              {(() => {
                const siblingIds = student.siblingIds
                  ? (JSON.parse(student.siblingIds) as string[])
                  : [];
                return siblingIds.length > 0 ? (
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold mb-3">Siblings in School</h4>
                    <div className="space-y-2">
                      {siblingIds.map((sibId) => (
                        <SiblingInfo key={sibId} siblingId={sibId} />
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
              <div className="flex gap-2 mt-6">
                <Button
                  variant="default"
                  disabled={actionLoading}
                  onClick={() => {
                    if (student) navigate(`/students/${student.id}/edit`);
                  }}
                >{t('common.edit')}</Button>
                {student.status === 'active' ? (
                  <Button
                    variant="destructive"
                    disabled={actionLoading}
                    onClick={async () => {
                      if (!student) return;
                      setActionLoading(true);
                      await studentApi.update(student.id, { status: 'inactive' });
                      setStudent({ ...student, status: 'inactive' });
                      setActionLoading(false);
                    }}
                  >{t('common.deactivate')}</Button>
                ) : (
                  <Button
                    variant="secondary"
                    disabled={actionLoading}
                    onClick={() => setShowReactivateDialog(true)}
                  >{t('common.reactivate')}</Button>
                )}
      {/* Reactivate Warning Dialog */}
      <RadixDialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <DialogContent className="max-w-sm w-full">
          <DialogHeader>
            <DialogTitle>{t('common.warning')}</DialogTitle>
          </DialogHeader>
          <div className="mb-4 text-yellow-700 font-semibold">{t('studentProfile.reactivateWarning')}</div>
          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => setShowReactivateDialog(false)}>{t('common.cancel')}</Button>
            <Button
              variant="secondary"
              onClick={async () => {
                if (!student) return;
                setActionLoading(true);
                await studentApi.update(student.id, { status: 'active' });
                setStudent({ ...student, status: 'active' });
                setActionLoading(false);
                setShowReactivateDialog(false);
              }}
            >{t('common.reactivate')}</Button>
          </div>
        </DialogContent>
      </RadixDialog>
                <Button
                  variant="secondary"
                  disabled={actionLoading}
                  onClick={() => alert('TC generated (mock)!')}
                >{t('common.generateTC')}</Button>
                <Button
                  variant="secondary"
                  disabled={actionLoading}
                  onClick={() => alert('Report card generated (mock)!')}
                >{t('common.reportCard')}</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
