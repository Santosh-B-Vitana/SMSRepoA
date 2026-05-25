import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Pin,
  Flag,
  Pencil,
  Trash2,
  Image,
  Link as LinkIcon,
  Globe,
  Users,
  Lock,
  Send,
  TrendingUp,
  BarChart2,
  ChevronDown,
  Search,
  X,
  AlertCircle,
  RefreshCw,
  Hash,
  Eye,
  Upload,
  FileText,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  schoolConnectApi,
  PostResponse,
  CommentResponse,
  CreatePostDto,
  AnalyticsResponse,
} from "@/services/api/schoolConnectApi";
import { academicApi } from "@/services/api/academicApi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// --- Helpers -----------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function relativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

const ROLE_COLORS: Record<string, string> = {
  Principal: "bg-purple-100 text-purple-800",
  Admin: "bg-red-100 text-red-800",
  admin: "bg-red-100 text-red-800",
  super_admin: "bg-red-100 text-red-800",
  Teacher: "bg-blue-100 text-blue-800",
  Staff: "bg-blue-100 text-blue-800",
  staff: "bg-blue-100 text-blue-800",
  Student: "bg-green-100 text-green-800",
  student: "bg-green-100 text-green-800",
  Parent: "bg-orange-100 text-orange-800",
  parent: "bg-orange-100 text-orange-800",
  Alumni: "bg-amber-100 text-amber-800",
  alumni: "bg-amber-100 text-amber-800",
};

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_COLORS[role] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize", cls)}>
      {role}
    </span>
  );
}

function VisibilityIcon({ v }: { v: string }) {
  if (v === "public") return <Globe className="h-3 w-3 text-muted-foreground" />;
  if (v === "class") return <Users className="h-3 w-3 text-muted-foreground" />;
  return <Lock className="h-3 w-3 text-muted-foreground" />;
}

// --- Author Chip -------------------------------------------------------------

function AuthorChip({
  name,
  role,
  avatar,
  timestamp,
}: {
  name: string;
  role: string;
  avatar?: string;
  timestamp: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-9 w-9">
        <AvatarImage src={avatar} />
        <AvatarFallback className="text-xs font-semibold bg-primary/10">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold leading-tight">{name}</span>
          <RoleBadge role={role} />
        </div>
        <span className="text-[11px] text-muted-foreground">{relativeTime(timestamp)}</span>
      </div>
    </div>
  );
}

// --- Comment Item ------------------------------------------------------------

function CommentItem({
  comment,
  currentUserId,
  onReply,
  onDelete,
  onLike,
  depth,
}: {
  comment: CommentResponse;
  currentUserId: string;
  onReply: (parentId: string, authorName: string) => void;
  onDelete: (commentId: string) => void;
  onLike: (commentId: string) => void;
  depth: number;
}) {
  return (
    <div className={cn("flex gap-2", depth > 0 && "ml-7 mt-2")}>
      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
        <AvatarImage src={comment.authorAvatar} />
        <AvatarFallback className="text-[10px]">{getInitials(comment.authorName)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="bg-muted/60 rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-semibold">{comment.authorName}</span>
            {comment.authorRole && <RoleBadge role={comment.authorRole} />}
            {comment.isEdited && (
              <span className="text-[10px] text-muted-foreground">(edited)</span>
            )}
          </div>
          <p className="text-sm leading-snug break-words">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 px-1">
          <button
            className={cn(
              "flex items-center gap-0.5 text-[11px] font-medium transition-colors",
              comment.isLikedByCurrentUser
                ? "text-red-500"
                : "text-muted-foreground hover:text-red-500"
            )}
            onClick={() => onLike(comment.id)}
          >
            <Heart className={cn("h-3 w-3", comment.isLikedByCurrentUser && "fill-current")} />
            {comment.likesCount > 0 && <span>{comment.likesCount}</span>}
          </button>
          {depth === 0 && (
            <button
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onReply(comment.id, comment.authorName)}
            >
              Reply
            </button>
          )}
          <span className="text-[11px] text-muted-foreground">{relativeTime(comment.createdAt)}</span>
          {comment.authorId === currentUserId && (
            <button
              className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
              onClick={() => onDelete(comment.id)}
            >
              Delete
            </button>
          )}
        </div>
        {comment.replies?.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            currentUserId={currentUserId}
            onReply={onReply}
            onDelete={onDelete}
            onLike={onLike}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  );
}

// --- Post Card ---------------------------------------------------------------

function PostCard({
  post,
  currentUserId,
  currentUserRole,
  onLike,
  onShare,
  onDelete,
  onPin,
  onReport,
  onPostUpdated,
}: {
  post: PostResponse;
  currentUserId: string;
  currentUserRole: string;
  onLike: (postId: string, currentlyLiked: boolean) => void;
  onShare: (postId: string) => void;
  onDelete: (postId: string) => void;
  onPin: (postId: string, isPinned: boolean) => void;
  onReport: (post: PostResponse) => void;
  onPostUpdated: (post: PostResponse) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentResponse[]>(post.recentComments ?? []);
  const [commentCount, setCommentCount] = useState(post.commentsCount);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadedAll, setLoadedAll] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editTags, setEditTags] = useState(post.tags.join(", "));
  const [savingEdit, setSavingEdit] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const isAdminRole = ["super_admin", "admin", "Principal", "Admin"].includes(currentUserRole);
  const canEdit = post.authorId === currentUserId;
  const canDelete = post.authorId === currentUserId || isAdminRole;
  const canPin = isAdminRole;
  const contentTruncated = post.content.length > 300;
  const displayContent =
    expanded || !contentTruncated ? post.content : post.content.slice(0, 300) + "...";

  async function loadComments() {
    if (loadedAll) return;
    setLoadingComments(true);
    try {
      const res = await schoolConnectApi.getComments(post.id, { page: 1, pageSize: 20 });
      setComments(res.comments);
      setLoadedAll(true);
    } catch {
      toast.error("Failed to load comments");
    } finally {
      setLoadingComments(false);
    }
  }

  function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && !loadedAll) loadComments();
  }

  async function submitComment() {
    const text = commentText.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      const newComment = await schoolConnectApi.createComment(post.id, {
        content: text,
        parentCommentId: replyTo?.id,
      });
      if (replyTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyTo.id
              ? { ...c, replies: [...(c.replies ?? []), newComment] }
              : c
          )
        );
      } else {
        setComments((prev) => [newComment, ...prev]);
      }
      setCommentCount((n) => n + 1);
      setCommentText("");
      setReplyTo(null);
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteComment(commentId: string) {
    try {
      await schoolConnectApi.deleteComment(commentId);
      setComments((prev) =>
        prev
          .filter((c) => c.id !== commentId)
          .map((c) => ({
            ...c,
            replies: c.replies?.filter((r) => r.id !== commentId) ?? [],
          }))
      );
      setCommentCount((n) => Math.max(0, n - 1));
    } catch {
      toast.error("Failed to delete comment");
    }
  }

  async function likeComment(commentId: string) {
    try {
      const res = await schoolConnectApi.likeComment(commentId);
      const updateLike = (c: CommentResponse): CommentResponse =>
        c.id === commentId
          ? { ...c, isLikedByCurrentUser: res.isLiked, likesCount: res.totalLikes }
          : { ...c, replies: c.replies?.map(updateLike) ?? [] };
      setComments((prev) => prev.map(updateLike));
    } catch {
      toast.error("Failed to process like");
    }
  }

  async function saveEdit() {
    setSavingEdit(true);
    try {
      const updated = await schoolConnectApi.updatePost(post.id, {
        content: editContent,
        visibility: post.visibility,
        mediaType: post.mediaType,
        mediaUrl: post.mediaUrl,
        tags: editTags
          ? editTags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      });
      onPostUpdated(updated);
      setEditing(false);
      toast.success("Post updated");
    } catch {
      toast.error("Failed to update post");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md",
        post.isPinned && "border-amber-300 bg-amber-50/30 dark:bg-amber-950/10"
      )}
    >
      <CardContent className="p-4">
        {post.isPinned && (
          <div className="flex items-center gap-1 mb-2 text-amber-600 text-xs font-medium">
            <Pin className="h-3 w-3 fill-current" />
            Pinned
          </div>
        )}

        <div className="flex items-start justify-between gap-2 mb-3">
          <AuthorChip
            name={post.authorName}
            role={post.authorRole}
            avatar={post.authorAvatar}
            timestamp={post.createdAt}
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <VisibilityIcon v={post.visibility} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => setEditing(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                  </DropdownMenuItem>
                )}
                {canPin && (
                  <DropdownMenuItem onClick={() => onPin(post.id, !post.isPinned)}>
                    <Pin className="h-3.5 w-3.5 mr-2" />
                    {post.isPinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(post.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
                {!canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onReport(post)}
                    >
                      <Flag className="h-3.5 w-3.5 mr-2" /> Report
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {editing ? (
          <div className="space-y-2 mb-3">
            <Textarea
              className="text-sm min-h-[100px] resize-none"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
            <Input
              className="text-xs"
              placeholder="Tags (comma separated)"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {displayContent}
            </p>
            {contentTruncated && (
              <button
                className="text-xs text-primary font-medium mt-1 hover:underline"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}

        {!editing && post.mediaUrl && (
          <div className="mb-3 rounded-lg overflow-hidden border bg-muted/30">
            {post.mediaType === "image" ? (
              <>
                <div
                  className="relative group cursor-zoom-in"
                  onClick={() => setLightboxOpen(true)}
                >
                  <img
                    src={post.mediaUrl}
                    alt="Post media"
                    className="w-full max-h-80 object-cover transition-transform duration-200 group-hover:scale-[1.01]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-80 transition-opacity duration-200 drop-shadow-lg" />
                  </div>
                </div>
                {/* Lightbox */}
                <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                  <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0 overflow-hidden flex items-center justify-center">
                    <button
                      onClick={() => setLightboxOpen(false)}
                      className="absolute top-3 right-3 z-50 h-9 w-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                    <img
                      src={post.mediaUrl}
                      alt="Post media"
                      className="max-w-[93vw] max-h-[90vh] object-contain rounded"
                    />
                  </DialogContent>
                </Dialog>
              </>
            ) : post.mediaType === "video" ? (
              <video
                src={post.mediaUrl}
                controls
                className="w-full max-h-80"
              />
            ) : post.mediaType === "link" ? (
              <a
                href={post.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 hover:bg-muted/60 transition-colors text-sm text-primary"
              >
                <LinkIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{post.mediaUrl}</span>
              </a>
            ) : (
              /* document / pdf / any other uploaded file */
              (() => {
                const rawUrl = post.mediaUrl;
                // Resolve legacy relative /files/ paths to the API server origin
                const resolvedUrl = rawUrl.startsWith("/")
                  ? `${((import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:5092/api").replace(/\/api$/, "")}${rawUrl}`
                  : rawUrl;
                const filename = decodeURIComponent(resolvedUrl.split("/").pop()?.split("?")[0] ?? "file");
                const isPdf = filename.toLowerCase().endsWith(".pdf");
                return (
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 hover:bg-muted/60 transition-colors group"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">{filename}</p>
                      <p className="text-xs text-muted-foreground">{isPdf ? "PDF Document" : "File"} · Click to open</p>
                    </div>
                  </a>
                );
              })()
            )}
          </div>
        )}

        {!editing && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {!editing && (
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
            {post.likesCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                {post.likesCount}
              </span>
            )}
            {post.viewsCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Eye className="h-3 w-3" />
                {post.viewsCount} views
              </span>
            )}
            {post.sharesCount > 0 && <span>{post.sharesCount} shares</span>}
          </div>
        )}

        {!editing && (
          <>
            <Separator className="mb-2" />
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1 gap-1.5 text-xs font-medium",
                  post.isLikedByCurrentUser ? "text-red-500" : "text-muted-foreground"
                )}
                onClick={() => onLike(post.id, post.isLikedByCurrentUser)}
              >
                <Heart
                  className={cn("h-4 w-4", post.isLikedByCurrentUser && "fill-current")}
                />
                {post.isLikedByCurrentUser ? "Liked" : "Like"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 gap-1.5 text-xs font-medium text-muted-foreground"
                onClick={toggleComments}
              >
                <MessageCircle className="h-4 w-4" />
                {commentCount > 0 ? `${commentCount} Comments` : "Comment"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 gap-1.5 text-xs font-medium text-muted-foreground"
                onClick={() => onShare(post.id)}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </>
        )}

        {showComments && !editing && (
          <div className="mt-3 space-y-3">
            <Separator />
            {replyTo && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
                <span>
                  Replying to <strong>{replyTo.name}</strong>
                </span>
                <button onClick={() => setReplyTo(null)} className="ml-auto hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                placeholder={replyTo ? `Reply to ${replyTo.name}...` : "Write a comment..."}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="text-sm resize-none min-h-[60px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
              />
              <Button
                size="sm"
                className="shrink-0 self-end"
                onClick={submitComment}
                disabled={!commentText.trim() || submitting}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    currentUserId={currentUserId}
                    onReply={(id, name) => setReplyTo({ id, name })}
                    onDelete={deleteComment}
                    onLike={likeComment}
                    depth={0}
                  />
                ))}
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Be the first to comment
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Compose Box -------------------------------------------------------------

// Role → allowed visibility options
const VISIBILITY_OPTIONS: Record<string, Array<{ value: string; label: string; icon: React.ReactNode }>> = {
  admin: [
    { value: "public",  label: "Everyone",        icon: <Globe  className="h-3 w-3" /> },
    { value: "staff",   label: "Staff Only",       icon: <Users  className="h-3 w-3" /> },
    { value: "parent",  label: "Parents Only",     icon: <Users  className="h-3 w-3" /> },
    { value: "class",   label: "Specific Class",   icon: <Users  className="h-3 w-3" /> },
    { value: "group",   label: "Group",            icon: <Users  className="h-3 w-3" /> },
    { value: "private", label: "Private (admins)", icon: <Lock   className="h-3 w-3" /> },
  ],
  super_admin: [
    { value: "public",  label: "Everyone",        icon: <Globe  className="h-3 w-3" /> },
    { value: "staff",   label: "Staff Only",       icon: <Users  className="h-3 w-3" /> },
    { value: "parent",  label: "Parents Only",     icon: <Users  className="h-3 w-3" /> },
    { value: "class",   label: "Specific Class",   icon: <Users  className="h-3 w-3" /> },
    { value: "private", label: "Private (admins)", icon: <Lock   className="h-3 w-3" /> },
  ],
  staff: [
    { value: "public",  label: "Everyone",      icon: <Globe  className="h-3 w-3" /> },
    { value: "staff",   label: "Staff Only",     icon: <Users  className="h-3 w-3" /> },
    { value: "class",   label: "My Class",       icon: <Users  className="h-3 w-3" /> },
  ],
  parent: [
    { value: "public",  label: "Everyone",      icon: <Globe  className="h-3 w-3" /> },
    { value: "parent",  label: "Parents Only",   icon: <Users  className="h-3 w-3" /> },
  ],
};

// Default visibility per role
function defaultVisibility(role: string): string {
  if (role === "parent") return "parent";
  return "public";
}

function ComposeBox({
  authorName,
  authorRole,
  authorAvatar,
  onPost,
}: {
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  onPost: (dto: CreatePostDto) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const visOpts = VISIBILITY_OPTIONS[authorRole] ?? VISIBILITY_OPTIONS["staff"];
  const [visibility, setVisibility] = useState<string>(() => defaultVisibility(authorRole));

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  // Link URL state
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  // Class selector state
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [targetClassId, setTargetClassId] = useState<string>("");

  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load classes when visibility switches to "class"
  useEffect(() => {
    if (visibility === "class" && classes.length === 0) {
      setLoadingClasses(true);
      academicApi
        .listClasses(1, 200)
        .then((res) => setClasses(res.classes.map((c) => ({ id: c.id, name: c.name }))))
        .catch(() => toast.error("Failed to load classes"))
        .finally(() => setLoadingClasses(false));
    }
    // Reset class selection when switching away
    if (visibility !== "class") setTargetClassId("");
  }, [visibility]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Clear link when a file is chosen
    setShowLinkInput(false);
    setLinkUrl("");
    setSelectedFile(file);
    setImagePreview(null);
    setVideoPreview(null);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("video/")) {
      setVideoPreview(URL.createObjectURL(file));
    }
  }

  function clearFile() {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setSelectedFile(null);
    setImagePreview(null);
    setVideoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit() {
    const text = content.trim();
    const hasMedia = !!selectedFile || (showLinkInput && !!linkUrl.trim());
    if (!text && !hasMedia) return;
    setSubmitting(true);
    try {
      let mediaUrl: string | undefined;
      let mediaType: "image" | "video" | "link" | "document" | undefined;

      if (selectedFile) {
        try {
          const result = await schoolConnectApi.uploadMedia(selectedFile);
          mediaUrl = result.url;
          mediaType = result.mediaType;
        } catch (uploadErr: unknown) {
          const msg = (uploadErr as { response?: { data?: { message?: string } } })?.response?.data?.message;
          toast.error(msg ?? "Failed to upload media. Please try again.");
          return;
        }
      } else if (showLinkInput && linkUrl.trim()) {
        mediaUrl = linkUrl.trim();
        mediaType = "link";
      }

      await onPost({
        content: text,
        authorName,
        authorRole,
        visibility,
        mediaUrl,
        mediaType,
        targetClassId:
          visibility === "class" && targetClassId ? targetClassId : undefined,
        tags: tags
          ? tags.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
      });

      // Reset
      setContent("");
      clearFile();
      setLinkUrl("");
      setShowLinkInput(false);
      setTags("");
      setTargetClassId("");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card
      className="border-dashed hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => !open && setOpen(true)}
    >
      <CardContent className="p-3">
        {!open ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={authorAvatar} />
              <AvatarFallback className="text-xs">{getInitials(authorName)}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              What is on your mind? Share with your school...
            </span>
          </div>
        ) : (
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            {/* Author row + visibility selector */}
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={authorAvatar} />
                <AvatarFallback className="text-xs">{getInitials(authorName)}</AvatarFallback>
              </Avatar>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger className="h-7 w-[150px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visOpts.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-1">
                        {opt.icon} {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Class selector — shown only when visibility === "class" */}
              {visibility === "class" && (
                <Select
                  value={targetClassId}
                  onValueChange={setTargetClassId}
                  disabled={loadingClasses}
                >
                  <SelectTrigger className="h-7 flex-1 text-xs">
                    <SelectValue
                      placeholder={loadingClasses ? "Loading classes..." : "Select class…"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* File preview / selected file display */}
            {selectedFile && (
              <div className="relative rounded-md border bg-muted/30 p-2">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-48 rounded object-contain w-full"
                  />
                ) : videoPreview ? (
                  <video
                    src={videoPreview}
                    controls
                    className="max-h-48 rounded w-full"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{selectedFile.name}</span>
                    <span className="shrink-0">
                      ({(selectedFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-5 w-5"
                  onClick={clearFile}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Post textarea */}
            <Textarea
              autoFocus
              placeholder="What is on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="resize-none min-h-[80px] text-sm"
              maxLength={5000}
            />

            {/* Link URL input */}
            {showLinkInput && !selectedFile && (
              <div className="flex gap-2">
                <Input
                  className="text-xs h-8 flex-1"
                  placeholder="Paste a link URL..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { setShowLinkInput(false); setLinkUrl(""); }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Tags */}
            <Input
              className="text-xs h-8"
              placeholder="Tags: announcement, class-10, science  (comma separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />

            {/* Action bar */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.avi,.pdf,.doc,.docx,.txt,.csv"
                  onChange={handleFileChange}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={showLinkInput}
                  title="Attach image or file"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {selectedFile ? "Change" : "Attach"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => { setShowLinkInput(!showLinkInput); clearFile(); }}
                  title="Add a link"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  Link
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {content.length}/5000
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={submit}
                  disabled={
                    (!content.trim() && !selectedFile && !(showLinkInput && linkUrl.trim())) ||
                    submitting ||
                    (visibility === "class" && !targetClassId)
                  }
                >
                  {submitting ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Report Dialog -----------------------------------------------------------

function ReportDialog({
  post,
  open,
  onClose,
}: {
  post: PostResponse | null;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<
    "spam" | "inappropriate" | "harassment" | "misinformation" | "other"
  >("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!post) return;
    setSubmitting(true);
    try {
      await schoolConnectApi.reportPost(post.id, { reason, details: details.trim() || undefined });
      toast.success("Post reported for review. Thank you.");
      setDetails("");
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(msg ?? "Failed to report post");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            Report Post
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Reason</label>
            <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                <SelectItem value="harassment">Harassment / Bullying</SelectItem>
                <SelectItem value="misinformation">Misinformation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Additional details (optional)
            </label>
            <Textarea
              placeholder="Describe the issue..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="resize-none text-sm min-h-[80px]"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={submit} disabled={submitting}>
              {submitting ? "Submitting..." : "Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Analytics Panel ---------------------------------------------------------

function AnalyticsPanel() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    schoolConnectApi
      .getAnalytics()
      .then(setData)
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );

  if (!data)
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No analytics data available.
      </div>
    );

  const statsCards = [
    { label: "Total Posts", value: data.totalPosts, icon: Hash },
    { label: "Total Likes", value: data.totalLikes, icon: Heart },
    { label: "Comments", value: data.totalComments, icon: MessageCircle },
    { label: "Shares", value: data.totalShares, icon: Share2 },
    { label: "Active Users", value: data.totalActiveUsers, icon: Users },
    { label: "Total Reach", value: data.totalReach, icon: Eye },
    { label: "Posts This Week", value: data.postsThisWeek, icon: TrendingUp },
    { label: "Posts This Month", value: data.postsThisMonth, icon: BarChart2 },
  ];

  const chartData = [
    { name: "Posts", value: data.totalPosts },
    { name: "Likes", value: data.totalLikes },
    { name: "Comments", value: data.totalComments },
    { name: "Shares", value: data.totalShares },
  ];

  return (
    <div className="space-y-6">
      {data.pendingReports > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {data.pendingReports} post{data.pendingReports !== 1 ? "s" : ""} pending moderation
            review.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statsCards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <span className="text-xl font-bold">{value.toLocaleString()}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Engagement Overview</span>
            <span className="text-xs text-muted-foreground">
              Avg. {data.engagementRate} per post
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Top Posts</h3>
            <div className="space-y-2">
              {data.topPosts.map((p, i) => (
                <div key={p.postId} className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-snug truncate">{p.content}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {p.authorName} · {p.engagement} engagements
                    </span>
                  </div>
                </div>
              ))}
              {data.topPosts.length === 0 && (
                <p className="text-xs text-muted-foreground">No data yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Top Contributors</h3>
            <div className="space-y-2">
              {data.topAuthors.map((a, i) => (
                <div key={a.authorId} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(a.authorName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{a.authorName}</p>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {a.authorRole} · {a.postCount} posts
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-primary shrink-0">
                    {a.totalEngagement}
                  </span>
                </div>
              ))}
              {data.topAuthors.length === 0 && (
                <p className="text-xs text-muted-foreground">No data yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Post Feed ---------------------------------------------------------------

type FeedFilter = "all" | "pinned" | "staff" | "student" | "parent" | "alumni";

function PostFeed({
  filterAuthorId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserRole,
  showCompose,
}: {
  filterAuthorId?: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  currentUserRole: string;
  showCompose?: boolean;
}) {
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<FeedFilter>("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<PostResponse | null>(null);
  const PAGE_SIZE = 10;

  const loadPosts = useCallback(
    async (pg: number, replace = false) => {
      if (pg === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        let res;
        if (filterAuthorId) {
          // Use the /posts/mine endpoint so the server resolves the author from JWT,
          // never relying on the frontend-supplied authorId (avoids stale-user-id mismatches).
          res = await schoolConnectApi.getMyPosts({
            page: pg,
            pageSize: PAGE_SIZE,
            searchTerm: search || undefined,
          });
        } else {
          const params: Record<string, unknown> = {
            page: pg,
            pageSize: PAGE_SIZE,
          };
          if (search) params.searchTerm = search;
          if (roleFilter === "pinned") params.isPinned = true;
          else if (roleFilter !== "all") params.authorRole = roleFilter;
          if (activeTag) params.tag = activeTag;
          res = await schoolConnectApi.getPosts(
            params as Parameters<typeof schoolConnectApi.getPosts>[0]
          );
        }
        setPosts((prev) => (replace ? res.posts : [...prev, ...res.posts]));
        setHasMore(pg < res.totalPages);
      } catch {
        toast.error("Failed to load posts");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filterAuthorId, search, roleFilter, activeTag]
  );

  useEffect(() => {
    setPage(1);
    loadPosts(1, true);
  }, [loadPosts]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    loadPosts(next, false);
  }

  async function createPost(dto: CreatePostDto) {
    try {
      const postPayload = {
        ...dto,
        authorName: currentUserName,
        authorRole: currentUserRole,
        authorAvatar: currentUserAvatar,
      };
      const post = await schoolConnectApi.createPost(postPayload);
      setPosts((prev) => [post, ...prev]);
      toast.success("Post published!");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(msg ?? "Failed to create post");
      throw err;
    }
  }

  async function handleLike(postId: string, currentlyLiked: boolean) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              isLikedByCurrentUser: !currentlyLiked,
              likesCount: currentlyLiked ? p.likesCount - 1 : p.likesCount + 1,
            }
          : p
      )
    );
    try {
      const res = await schoolConnectApi.likePost(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isLikedByCurrentUser: res.isLiked, likesCount: res.totalLikes }
            : p
        )
      );
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                isLikedByCurrentUser: currentlyLiked,
                likesCount: currentlyLiked ? p.likesCount + 1 : p.likesCount - 1,
              }
            : p
        )
      );
      toast.error("Failed to process like");
    }
  }

  async function handleShare(postId: string) {
    try {
      await schoolConnectApi.sharePost(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, sharesCount: p.sharesCount + 1 } : p))
      );
      toast.success("Post shared!");
    } catch {
      toast.error("Failed to share post");
    }
  }

  async function handleDelete(postId: string) {
    try {
      await schoolConnectApi.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Post deleted");
    } catch {
      toast.error("Failed to delete post");
    }
  }

  async function handlePin(postId: string, isPinned: boolean) {
    try {
      await schoolConnectApi.pinPost(postId, isPinned);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isPinned } : p))
      );
      toast.success(isPinned ? "Post pinned" : "Post unpinned");
    } catch {
      toast.error("Failed to update pin");
    }
  }

  function handlePostUpdated(updated: PostResponse) {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  const visibleTags = Array.from(new Set(posts.flatMap((p) => p.tags))).slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 text-sm h-9"
            placeholder="Search posts..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
          />
        </div>
        <Button variant="outline" size="sm" className="h-9 px-3" onClick={() => setSearch(searchInput)}>
          Search
        </Button>
      </div>

      {!filterAuthorId && (
        <div className="flex flex-wrap gap-1.5">
          {((): FeedFilter[] => {
            const base: FeedFilter[] = ["all", "pinned"];
            const role = currentUserRole?.toLowerCase();
            if (role === "admin" || role === "super_admin")
              return [...base, "staff", "student", "parent", "alumni"];
            if (role === "staff")
              return [...base, "staff"];
            if (role === "parent")
              return [...base, "parent"];
            return base;
          })().map(
            (f) => (
              <button
                key={f}
                onClick={() => setRoleFilter(f)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-medium capitalize transition-colors",
                  roleFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {f === "all"
                  ? "All"
                  : f === "pinned"
                  ? "Pinned"
                  : f === "staff"
                  ? "Staff Posts"
                  : f === "parent"
                  ? "Parent Posts"
                  : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            )
          )}
        </div>
      )}

      {visibleTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visibleTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={cn(
                "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors",
                activeTag === tag
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Hash className="h-2.5 w-2.5" />
              {tag}
            </button>
          ))}
        </div>
      )}

      {showCompose && (
        <ComposeBox
          authorName={currentUserName}
          authorRole={currentUserRole}
          authorAvatar={currentUserAvatar}
          onPost={createPost}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No posts yet. Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onLike={handleLike}
              onShare={handleShare}
              onDelete={handleDelete}
              onPin={handlePin}
              onReport={setReportTarget}
              onPostUpdated={handlePostUpdated}
            />
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 mr-2" />
                )}
                Load more
              </Button>
            </div>
          )}
        </div>
      )}

      <ReportDialog
        post={reportTarget}
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
      />
    </div>
  );
}

// --- Main Component ----------------------------------------------------------

const SchoolConnectManager = () => {
  const { user } = useAuth();
  // Tracks how many times My Posts tab has been activated so the PostFeed
  // remounts (fresh API fetch) every time the user switches to the tab.
  const [myPostsKey, setMyPostsKey] = useState(0);

  if (!user) return null;

  const isAdmin = ["super_admin", "admin"].includes(user.role);
  const isStaff = user.role === "staff";
  const isParent = user.role === "parent";

  const headerDesc = isAdmin
    ? "Manage and participate in your school community. You have full moderation access."
    : isStaff
    ? "Connect with colleagues, parents, and share updates with your classes."
    : isParent
    ? "Stay updated with school news and connect with other parents and teachers."
    : "Stay connected with everyone in your school community.";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            School Connect
            {isAdmin && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Admin</Badge>}
            {isStaff && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800">Staff</Badge>}
            {isParent && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-800">Parent</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{headerDesc}</p>
        </div>
      </div>

      <Tabs
        defaultValue="feed"
        className="space-y-4"
        onValueChange={(v) => { if (v === "myposts") setMyPostsKey((k) => k + 1); }}
      >
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="feed" className="gap-1.5 text-xs">
            <Globe className="h-3.5 w-3.5" /> Feed
          </TabsTrigger>
          <TabsTrigger value="myposts" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> My Posts
          </TabsTrigger>
          <TabsTrigger value="trending" className="gap-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> Trending
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="analytics" className="gap-1.5 text-xs">
              <BarChart2 className="h-3.5 w-3.5" /> Analytics
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="feed">
          <PostFeed
            currentUserId={user.id}
            currentUserName={user.name}
            currentUserAvatar={user.avatar}
            currentUserRole={user.role}
            showCompose
          />
        </TabsContent>

        <TabsContent value="myposts">
          <PostFeed
            key={myPostsKey}
            filterAuthorId={user.id}
            currentUserId={user.id}
            currentUserName={user.name}
            currentUserAvatar={user.avatar}
            currentUserRole={user.role}
            showCompose
          />
        </TabsContent>

        <TabsContent value="trending">
          <PostFeed
            currentUserId={user.id}
            currentUserName={user.name}
            currentUserAvatar={user.avatar}
            currentUserRole={user.role}
          />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="analytics">
            <AnalyticsPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SchoolConnectManager;
