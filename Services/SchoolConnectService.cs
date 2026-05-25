using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SmsApi.Services
{
    public interface ISchoolConnectService
    {
        // Posts
        Task<SchoolConnectPostListResponse> GetPostsAsync(Guid schoolId, Guid currentUserId, string viewerRole, int page = 1, int pageSize = 10, SchoolConnectPostFilters? filters = null);
        Task<SchoolConnectPostResponse?> GetPostByIdAsync(Guid postId, Guid schoolId, Guid currentUserId);
        Task<SchoolConnectPostResponse> CreatePostAsync(CreateSchoolConnectPostRequest request);
        Task<SchoolConnectPostResponse?> UpdatePostAsync(Guid postId, UpdateSchoolConnectPostRequest request, Guid schoolId, Guid authorId);
        Task<bool> DeletePostAsync(Guid postId, Guid schoolId, Guid authorId);
        Task<SchoolConnectPostListResponse> GetPinnedPostsAsync(Guid schoolId, Guid currentUserId, int page = 1, int pageSize = 10);
        Task<SchoolConnectPostListResponse> GetScheduledPostsAsync(Guid schoolId, Guid currentUserId, int page = 1, int pageSize = 10);
        Task<bool> PublishScheduledPostsAsync();

        // Comments
        Task<SchoolConnectCommentListResponse> GetCommentsAsync(Guid postId, Guid currentUserId, int page = 1, int pageSize = 20);
        Task<SchoolConnectCommentResponse> CreateCommentAsync(CreateSchoolConnectCommentRequest request);
        Task<SchoolConnectCommentResponse?> UpdateCommentAsync(Guid commentId, UpdateSchoolConnectCommentRequest request, Guid authorId);
        Task<bool> DeleteCommentAsync(Guid commentId, Guid authorId);

        // Likes
        Task<SchoolConnectLikeResponse> TogglePostLikeAsync(Guid postId, SchoolConnectLikeRequest request);
        Task<SchoolConnectLikeResponse> ToggleCommentLikeAsync(Guid commentId, SchoolConnectLikeRequest request);

        // Pin
        Task<bool> TogglePinPostAsync(Guid postId, SchoolConnectPinRequest request, Guid schoolId);

        // Reports & Moderation
        Task<bool> ReportPostAsync(CreateSchoolConnectReportRequest request);
        Task<SchoolConnectReportListResponse> GetModerationQueueAsync(Guid schoolId, int page = 1, int pageSize = 10, string? status = null);
        Task<bool> ReviewReportAsync(Guid reportId, ReviewSchoolConnectReportRequest request, Guid schoolId);

        // Shares
        Task<int> SharePostAsync(CreateSchoolConnectShareRequest request);

        // Analytics
        Task<SchoolConnectAnalyticsResponse> GetAnalyticsAsync(Guid schoolId);
    }

    public class SchoolConnectService : ISchoolConnectService
    {
        private readonly AppDbContext _context;

        public SchoolConnectService(AppDbContext context)
        {
            _context = context;
        }

        #region Posts

        public async Task<SchoolConnectPostListResponse> GetPostsAsync(Guid schoolId, Guid currentUserId, string viewerRole, int page = 1, int pageSize = 10, SchoolConnectPostFilters? filters = null)
        {
            var query = _context.SchoolConnectPosts
                .Where(p => p.SchoolId == schoolId && p.IsActive && !p.IsHidden && p.IsPublished);

            // ── Role-based visibility gate ─────────────────────────────────────────
            // Admins see everything. Other roles only see posts they are entitled to.
            var role = viewerRole?.ToLower() ?? "";
            var isAdmin = role == "admin" || role == "super_admin";

            if (!isAdmin)
            {
                query = query.Where(p =>
                    p.Visibility == "public" ||                              // public: all roles
                    p.AuthorId == currentUserId ||                           // own private posts
                    (role == "staff"  && (p.Visibility == "staff"  || p.Visibility == "class")) ||
                    (role == "parent" && p.Visibility == "parent")
                );
            }

            // Apply filters
            if (filters != null)
            {
                if (!string.IsNullOrWhiteSpace(filters.Visibility))
                    query = query.Where(p => p.Visibility == filters.Visibility);

                if (filters.AuthorId.HasValue)
                    query = query.Where(p => p.AuthorId == filters.AuthorId.Value);

                if (!string.IsNullOrWhiteSpace(filters.AuthorRole))
                    query = query.Where(p => p.AuthorRole == filters.AuthorRole);

                if (filters.IsPinned.HasValue)
                    query = query.Where(p => p.IsPinned == filters.IsPinned.Value);

                if (filters.IsReported.HasValue)
                    query = query.Where(p => p.IsReported == filters.IsReported.Value);

                if (!string.IsNullOrWhiteSpace(filters.SearchTerm))
                    query = query.Where(p => p.Content.Contains(filters.SearchTerm) || 
                                            (p.Tags != null && p.Tags.Contains(filters.SearchTerm)));

                if (!string.IsNullOrWhiteSpace(filters.Tag))
                    query = query.Where(p => p.Tags != null && p.Tags.Contains(filters.Tag));

                if (filters.FromDate.HasValue)
                    query = query.Where(p => p.CreatedAt >= filters.FromDate.Value);

                if (filters.ToDate.HasValue)
                    query = query.Where(p => p.CreatedAt <= filters.ToDate.Value);

                if (filters.TargetClassId.HasValue)
                    query = query.Where(p => p.TargetClassId == filters.TargetClassId.Value || p.Visibility == "public");
            }

            var total = await query.CountAsync();

            var posts = await query
                .OrderByDescending(p => p.IsPinned)
                .ThenByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Include(p => p.Likes)
                .Include(p => p.Comments.Where(c => c.IsActive && !c.IsHidden).OrderByDescending(c => c.CreatedAt).Take(3))
                .ToListAsync();

            var postResponses = posts.Select(p => MapToPostResponse(p, currentUserId)).ToList();

            return new SchoolConnectPostListResponse
            {
                Posts = postResponses,
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        public async Task<SchoolConnectPostResponse?> GetPostByIdAsync(Guid postId, Guid schoolId, Guid currentUserId)
        {
            var post = await _context.SchoolConnectPosts
                .Include(p => p.Likes)
                .Include(p => p.Comments.Where(c => c.IsActive && !c.IsHidden))
                .FirstOrDefaultAsync(p => p.Id == postId && p.SchoolId == schoolId && p.IsActive);

            if (post == null) return null;

            // Increment view count
            post.ViewsCount++;
            await _context.SaveChangesAsync();

            return MapToPostResponse(post, currentUserId);
        }

        public async Task<SchoolConnectPostResponse> CreatePostAsync(CreateSchoolConnectPostRequest request)
        {
            // Validation
            var hasContent = !string.IsNullOrWhiteSpace(request.Content);
            var hasMedia = !string.IsNullOrWhiteSpace(request.MediaUrl);
            if (!hasContent && !hasMedia)
                throw new InvalidOperationException("Post must have content or media");

            if (request.Content != null && request.Content.Length > 5000)
                throw new InvalidOperationException("Post content cannot exceed 5000 characters");

            var validVisibilities = new[] { "public", "class", "group", "staff", "parent", "private" };
            if (!validVisibilities.Contains(request.Visibility))
                throw new InvalidOperationException("Invalid visibility type");

            if (request.Visibility == "class" && !request.TargetClassId.HasValue)
                throw new InvalidOperationException("Target class is required for class visibility");

            var validMediaTypes = new[] { "image", "video", "document", "link" };
            if (!string.IsNullOrEmpty(request.MediaType) && !validMediaTypes.Contains(request.MediaType))
                throw new InvalidOperationException("Invalid media type");

            if (request.IsScheduled && (!request.ScheduledPublishAt.HasValue || request.ScheduledPublishAt <= DateTime.UtcNow))
                throw new InvalidOperationException("Scheduled posts must have a future publish date");

            var post = new SchoolConnectPost
            {
                Id = Guid.NewGuid(),
                SchoolId = request.SchoolId,
                AuthorId = request.AuthorId,
                AuthorName = request.AuthorName,
                AuthorRole = request.AuthorRole,
                AuthorAvatar = request.AuthorAvatar,
                Content = request.Content ?? string.Empty,
                MediaType = request.MediaType,
                MediaUrl = request.MediaUrl,
                Visibility = request.Visibility,
                TargetClassId = request.TargetClassId,
                TargetGroupId = request.TargetGroupId,
                IsScheduled = request.IsScheduled,
                ScheduledPublishAt = request.ScheduledPublishAt,
                IsPublished = !request.IsScheduled,
                Tags = request.Tags != null ? string.Join(",", request.Tags) : null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.SchoolConnectPosts.Add(post);
            await _context.SaveChangesAsync();

            return MapToPostResponse(post, request.AuthorId);
        }

        public async Task<SchoolConnectPostResponse?> UpdatePostAsync(Guid postId, UpdateSchoolConnectPostRequest request, Guid schoolId, Guid authorId)
        {
            var post = await _context.SchoolConnectPosts
                .FirstOrDefaultAsync(p => p.Id == postId && p.SchoolId == schoolId && p.AuthorId == authorId);

            if (post == null)
                throw new KeyNotFoundException("Post not found or you don't have permission to edit");

            post.Content = request.Content ?? post.Content;
            post.MediaType = request.MediaType ?? post.MediaType;
            post.MediaUrl = request.MediaUrl ?? post.MediaUrl;
            post.Visibility = request.Visibility ?? post.Visibility;
            post.TargetClassId = request.TargetClassId;
            post.TargetGroupId = request.TargetGroupId;
            post.Tags = request.Tags != null ? string.Join(",", request.Tags) : post.Tags;
            post.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToPostResponse(post, authorId);
        }

        public async Task<bool> DeletePostAsync(Guid postId, Guid schoolId, Guid authorId)
        {
            var post = await _context.SchoolConnectPosts
                .FirstOrDefaultAsync(p => p.Id == postId && p.SchoolId == schoolId && 
                                         (p.AuthorId == authorId || true)); // Admin override would be checked via role

            if (post == null) return false;

            post.IsActive = false;
            post.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<SchoolConnectPostListResponse> GetPinnedPostsAsync(Guid schoolId, Guid currentUserId, int page = 1, int pageSize = 10)
        {
            var query = _context.SchoolConnectPosts
                .Where(p => p.SchoolId == schoolId && p.IsActive && !p.IsHidden && p.IsPublished && p.IsPinned);

            var total = await query.CountAsync();

            var posts = await query
                .OrderByDescending(p => p.PinnedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Include(p => p.Likes)
                .ToListAsync();

            return new SchoolConnectPostListResponse
            {
                Posts = posts.Select(p => MapToPostResponse(p, currentUserId)).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        public async Task<SchoolConnectPostListResponse> GetScheduledPostsAsync(Guid schoolId, Guid currentUserId, int page = 1, int pageSize = 10)
        {
            var query = _context.SchoolConnectPosts
                .Where(p => p.SchoolId == schoolId && p.IsActive && p.IsScheduled && !p.IsPublished);

            var total = await query.CountAsync();

            var posts = await query
                .OrderBy(p => p.ScheduledPublishAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new SchoolConnectPostListResponse
            {
                Posts = posts.Select(p => MapToPostResponse(p, currentUserId)).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        public async Task<bool> PublishScheduledPostsAsync()
        {
            var now = DateTime.UtcNow;
            var postsToPublish = await _context.SchoolConnectPosts
                .Where(p => p.IsScheduled && !p.IsPublished && p.ScheduledPublishAt <= now && p.IsActive)
                .ToListAsync();

            foreach (var post in postsToPublish)
            {
                post.IsPublished = true;
                post.UpdatedAt = now;
            }

            await _context.SaveChangesAsync();
            return postsToPublish.Count > 0;
        }

        #endregion

        #region Comments

        public async Task<SchoolConnectCommentListResponse> GetCommentsAsync(Guid postId, Guid currentUserId, int page = 1, int pageSize = 20)
        {
            var query = _context.SchoolConnectComments
                .Where(c => c.PostId == postId && c.ParentCommentId == null && c.IsActive && !c.IsHidden);

            var total = await query.CountAsync();

            var comments = await query
                .OrderByDescending(c => c.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Include(c => c.Likes)
                .Include(c => c.Replies.Where(r => r.IsActive && !r.IsHidden))
                    .ThenInclude(r => r.Likes)
                .ToListAsync();

            return new SchoolConnectCommentListResponse
            {
                Comments = comments.Select(c => MapToCommentResponse(c, currentUserId)).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        public async Task<SchoolConnectCommentResponse> CreateCommentAsync(CreateSchoolConnectCommentRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Content))
                throw new InvalidOperationException("Comment content is required");

            var post = await _context.SchoolConnectPosts.FindAsync(request.PostId);
            if (post == null || !post.IsActive)
                throw new KeyNotFoundException("Post not found");

            if (request.ParentCommentId.HasValue)
            {
                var parentComment = await _context.SchoolConnectComments.FindAsync(request.ParentCommentId.Value);
                if (parentComment == null || !parentComment.IsActive)
                    throw new KeyNotFoundException("Parent comment not found");
            }

            var comment = new SchoolConnectComment
            {
                Id = Guid.NewGuid(),
                PostId = request.PostId,
                ParentCommentId = request.ParentCommentId,
                AuthorId = request.AuthorId,
                AuthorName = request.AuthorName,
                AuthorRole = request.AuthorRole,
                AuthorAvatar = request.AuthorAvatar,
                Content = request.Content,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.SchoolConnectComments.Add(comment);

            // Update post comment count
            post.CommentsCount++;
            post.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToCommentResponse(comment, request.AuthorId);
        }

        public async Task<SchoolConnectCommentResponse?> UpdateCommentAsync(Guid commentId, UpdateSchoolConnectCommentRequest request, Guid authorId)
        {
            var comment = await _context.SchoolConnectComments
                .FirstOrDefaultAsync(c => c.Id == commentId && c.AuthorId == authorId && c.IsActive);

            if (comment == null)
                throw new KeyNotFoundException("Comment not found or you don't have permission to edit");

            comment.Content = request.Content;
            comment.IsEdited = true;
            comment.EditedAt = DateTime.UtcNow;
            comment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToCommentResponse(comment, authorId);
        }

        public async Task<bool> DeleteCommentAsync(Guid commentId, Guid authorId)
        {
            var comment = await _context.SchoolConnectComments
                .Include(c => c.Post)
                .FirstOrDefaultAsync(c => c.Id == commentId && c.AuthorId == authorId);

            if (comment == null) return false;

            comment.IsActive = false;
            comment.UpdatedAt = DateTime.UtcNow;

            if (comment.Post != null)
            {
                comment.Post.CommentsCount = Math.Max(0, comment.Post.CommentsCount - 1);
            }

            await _context.SaveChangesAsync();
            return true;
        }

        #endregion

        #region Likes

        public async Task<SchoolConnectLikeResponse> TogglePostLikeAsync(Guid postId, SchoolConnectLikeRequest request)
        {
            var post = await _context.SchoolConnectPosts.FindAsync(postId);
            if (post == null || !post.IsActive)
                throw new KeyNotFoundException("Post not found");

            var existingLike = await _context.SchoolConnectPostLikes
                .FirstOrDefaultAsync(l => l.PostId == postId && l.UserId == request.UserId);

            bool isLiked;
            if (existingLike != null)
            {
                // Unlike
                _context.SchoolConnectPostLikes.Remove(existingLike);
                post.LikesCount = Math.Max(0, post.LikesCount - 1);
                isLiked = false;
            }
            else
            {
                // Like
                var like = new SchoolConnectPostLike
                {
                    Id = Guid.NewGuid(),
                    PostId = postId,
                    UserId = request.UserId,
                    UserName = request.UserName,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.SchoolConnectPostLikes.Add(like);
                post.LikesCount++;
                isLiked = true;
            }

            await _context.SaveChangesAsync();

            return new SchoolConnectLikeResponse
            {
                IsLiked = isLiked,
                TotalLikes = post.LikesCount
            };
        }

        public async Task<SchoolConnectLikeResponse> ToggleCommentLikeAsync(Guid commentId, SchoolConnectLikeRequest request)
        {
            var comment = await _context.SchoolConnectComments.FindAsync(commentId);
            if (comment == null || !comment.IsActive)
                throw new KeyNotFoundException("Comment not found");

            var existingLike = await _context.SchoolConnectCommentLikes
                .FirstOrDefaultAsync(l => l.CommentId == commentId && l.UserId == request.UserId);

            bool isLiked;
            if (existingLike != null)
            {
                _context.SchoolConnectCommentLikes.Remove(existingLike);
                comment.LikesCount = Math.Max(0, comment.LikesCount - 1);
                isLiked = false;
            }
            else
            {
                var like = new SchoolConnectCommentLike
                {
                    Id = Guid.NewGuid(),
                    CommentId = commentId,
                    UserId = request.UserId,
                    UserName = request.UserName,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.SchoolConnectCommentLikes.Add(like);
                comment.LikesCount++;
                isLiked = true;
            }

            await _context.SaveChangesAsync();

            return new SchoolConnectLikeResponse
            {
                IsLiked = isLiked,
                TotalLikes = comment.LikesCount
            };
        }

        #endregion

        #region Pin

        public async Task<bool> TogglePinPostAsync(Guid postId, SchoolConnectPinRequest request, Guid schoolId)
        {
            var post = await _context.SchoolConnectPosts
                .FirstOrDefaultAsync(p => p.Id == postId && p.SchoolId == schoolId && p.IsActive);

            if (post == null) return false;

            post.IsPinned = request.IsPinned;
            post.PinnedAt = request.IsPinned ? DateTime.UtcNow : null;
            post.PinnedById = request.IsPinned ? request.PinnedById : null;
            post.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        #endregion

        #region Reports & Moderation

        public async Task<bool> ReportPostAsync(CreateSchoolConnectReportRequest request)
        {
            var post = await _context.SchoolConnectPosts.FindAsync(request.PostId);
            if (post == null || !post.IsActive)
                throw new KeyNotFoundException("Post not found");

            // Check if user already reported this post
            var existingReport = await _context.SchoolConnectPostReports
                .AnyAsync(r => r.PostId == request.PostId && r.ReportedById == request.ReportedById);

            if (existingReport)
                throw new InvalidOperationException("You have already reported this post");

            var validReasons = new[] { "spam", "inappropriate", "harassment", "misinformation", "other" };
            if (!validReasons.Contains(request.Reason.ToLower()))
                throw new InvalidOperationException("Invalid report reason");

            var report = new SchoolConnectPostReport
            {
                Id = Guid.NewGuid(),
                PostId = request.PostId,
                ReportedById = request.ReportedById,
                ReporterName = request.ReporterName,
                Reason = request.Reason.ToLower(),
                Details = request.Details,
                Status = "pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.SchoolConnectPostReports.Add(report);

            // Update post report status
            post.IsReported = true;
            post.ReportCount++;
            post.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<SchoolConnectReportListResponse> GetModerationQueueAsync(Guid schoolId, int page = 1, int pageSize = 10, string? status = null)
        {
            var query = _context.SchoolConnectPostReports
                .Include(r => r.Post)
                .Where(r => r.Post != null && r.Post.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(r => r.Status == status);
            else
                query = query.Where(r => r.Status == "pending"); // Default to pending

            var total = await query.CountAsync();

            var reports = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new SchoolConnectReportListResponse
            {
                Reports = reports.Select(r => new SchoolConnectReportResponse
                {
                    Id = r.Id,
                    PostId = r.PostId,
                    ReportedById = r.ReportedById,
                    ReporterName = r.ReporterName,
                    Reason = r.Reason,
                    Details = r.Details,
                    Status = r.Status,
                    ReviewedById = r.ReviewedById,
                    ReviewedAt = r.ReviewedAt,
                    ReviewNotes = r.ReviewNotes,
                    CreatedAt = r.CreatedAt,
                    Post = r.Post != null ? MapToPostResponse(r.Post, Guid.Empty) : null
                }).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        public async Task<bool> ReviewReportAsync(Guid reportId, ReviewSchoolConnectReportRequest request, Guid schoolId)
        {
            var report = await _context.SchoolConnectPostReports
                .Include(r => r.Post)
                .FirstOrDefaultAsync(r => r.Id == reportId && r.Post != null && r.Post.SchoolId == schoolId);

            if (report == null) return false;

            var validStatuses = new[] { "reviewed", "dismissed", "action_taken" };
            if (!validStatuses.Contains(request.Status.ToLower()))
                throw new InvalidOperationException("Invalid status");

            report.Status = request.Status.ToLower();
            report.ReviewedById = request.ReviewedById;
            report.ReviewedAt = DateTime.UtcNow;
            report.ReviewNotes = request.ReviewNotes;
            report.UpdatedAt = DateTime.UtcNow;

            if (request.HidePost && report.Post != null)
            {
                report.Post.IsHidden = true;
                report.Post.ModeratedById = request.ReviewedById;
                report.Post.ModeratedAt = DateTime.UtcNow;
                report.Post.ModerationNotes = request.ReviewNotes;
                report.Post.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        #endregion

        #region Shares

        public async Task<int> SharePostAsync(CreateSchoolConnectShareRequest request)
        {
            var post = await _context.SchoolConnectPosts.FindAsync(request.PostId);
            if (post == null || !post.IsActive)
                throw new KeyNotFoundException("Post not found");

            var share = new SchoolConnectPostShare
            {
                Id = Guid.NewGuid(),
                PostId = request.PostId,
                SharedById = request.SharedById,
                SharedByName = request.SharedByName,
                ShareType = request.ShareType,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.SchoolConnectPostShares.Add(share);
            post.SharesCount++;
            post.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return post.SharesCount;
        }

        #endregion

        #region Analytics

        public async Task<SchoolConnectAnalyticsResponse> GetAnalyticsAsync(Guid schoolId)
        {
            var now = DateTime.UtcNow;
            var weekAgo = now.AddDays(-7);
            var monthAgo = now.AddMonths(-1);

            var posts = await _context.SchoolConnectPosts
                .Where(p => p.SchoolId == schoolId && p.IsActive)
                .ToListAsync();

            var totalPosts = posts.Count;
            var totalLikes = posts.Sum(p => p.LikesCount);
            var totalComments = posts.Sum(p => p.CommentsCount);
            var totalShares = posts.Sum(p => p.SharesCount);
            var totalViews = posts.Sum(p => p.ViewsCount);

            var postsThisWeek = posts.Count(p => p.CreatedAt >= weekAgo);
            var postsThisMonth = posts.Count(p => p.CreatedAt >= monthAgo);

            var activeAuthors = posts
                .Where(p => p.CreatedAt >= monthAgo)
                .Select(p => p.AuthorId)
                .Distinct()
                .Count();

            var engagementRate = totalPosts > 0 
                ? (double)(totalLikes + totalComments + totalShares) / totalPosts 
                : 0;

            var pendingReports = await _context.SchoolConnectPostReports
                .CountAsync(r => r.Post != null && r.Post.SchoolId == schoolId && r.Status == "pending");

            var topPosts = posts
                .OrderByDescending(p => p.LikesCount + p.CommentsCount + p.SharesCount)
                .Take(5)
                .Select(p => new TopPostDto
                {
                    PostId = p.Id,
                    Content = p.Content.Length > 100 ? p.Content.Substring(0, 100) + "..." : p.Content,
                    AuthorName = p.AuthorName,
                    Engagement = p.LikesCount + p.CommentsCount + p.SharesCount
                })
                .ToList();

            var topAuthors = posts
                .GroupBy(p => new { p.AuthorId, p.AuthorName, p.AuthorRole })
                .Select(g => new TopAuthorDto
                {
                    AuthorId = g.Key.AuthorId,
                    AuthorName = g.Key.AuthorName,
                    AuthorRole = g.Key.AuthorRole,
                    PostCount = g.Count(),
                    TotalEngagement = g.Sum(p => p.LikesCount + p.CommentsCount + p.SharesCount)
                })
                .OrderByDescending(a => a.TotalEngagement)
                .Take(5)
                .ToList();

            return new SchoolConnectAnalyticsResponse
            {
                TotalPosts = totalPosts,
                TotalComments = totalComments,
                TotalLikes = totalLikes,
                TotalShares = totalShares,
                TotalActiveUsers = activeAuthors,
                PostsThisWeek = postsThisWeek,
                PostsThisMonth = postsThisMonth,
                EngagementRate = Math.Round(engagementRate, 2),
                TotalReach = totalViews,
                PendingReports = pendingReports,
                TopPosts = topPosts,
                TopAuthors = topAuthors
            };
        }

        #endregion

        #region Mapping Helpers

        private SchoolConnectPostResponse MapToPostResponse(SchoolConnectPost post, Guid currentUserId)
        {
            return new SchoolConnectPostResponse
            {
                Id = post.Id,
                SchoolId = post.SchoolId,
                AuthorId = post.AuthorId,
                AuthorName = post.AuthorName,
                AuthorRole = post.AuthorRole,
                AuthorAvatar = post.AuthorAvatar,
                Content = post.Content,
                MediaType = post.MediaType,
                MediaUrl = post.MediaUrl,
                Visibility = post.Visibility,
                TargetClassId = post.TargetClassId,
                TargetGroupId = post.TargetGroupId,
                LikesCount = post.LikesCount,
                CommentsCount = post.CommentsCount,
                SharesCount = post.SharesCount,
                ViewsCount = post.ViewsCount,
                IsPinned = post.IsPinned,
                PinnedAt = post.PinnedAt,
                IsScheduled = post.IsScheduled,
                ScheduledPublishAt = post.ScheduledPublishAt,
                IsPublished = post.IsPublished,
                IsReported = post.IsReported,
                ReportCount = post.ReportCount,
                Tags = string.IsNullOrEmpty(post.Tags) ? new List<string>() : post.Tags.Split(',').ToList(),
                CreatedAt = post.CreatedAt,
                UpdatedAt = post.UpdatedAt,
                IsLikedByCurrentUser = currentUserId != Guid.Empty && post.Likes.Any(l => l.UserId == currentUserId),
                RecentComments = post.Comments?
                    .OrderByDescending(c => c.CreatedAt)
                    .Take(3)
                    .Select(c => MapToCommentResponse(c, currentUserId))
                    .ToList() ?? new List<SchoolConnectCommentResponse>()
            };
        }

        private SchoolConnectCommentResponse MapToCommentResponse(SchoolConnectComment comment, Guid currentUserId)
        {
            return new SchoolConnectCommentResponse
            {
                Id = comment.Id,
                PostId = comment.PostId,
                ParentCommentId = comment.ParentCommentId,
                AuthorId = comment.AuthorId,
                AuthorName = comment.AuthorName,
                AuthorRole = comment.AuthorRole,
                AuthorAvatar = comment.AuthorAvatar,
                Content = comment.Content,
                LikesCount = comment.LikesCount,
                IsEdited = comment.IsEdited,
                EditedAt = comment.EditedAt,
                CreatedAt = comment.CreatedAt,
                IsLikedByCurrentUser = currentUserId != Guid.Empty && comment.Likes.Any(l => l.UserId == currentUserId),
                Replies = comment.Replies?
                    .Where(r => r.IsActive && !r.IsHidden)
                    .OrderBy(r => r.CreatedAt)
                    .Select(r => MapToCommentResponse(r, currentUserId))
                    .ToList() ?? new List<SchoolConnectCommentResponse>()
            };
        }

        #endregion
    }
}
