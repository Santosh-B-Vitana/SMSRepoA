using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public interface IOnlineExamService
    {
        // Question Bank
        Task<List<QuestionResponse>> GetQuestionsAsync(Guid schoolId, Guid? subjectId, string? questionType, string? difficulty);
        Task<QuestionResponse?> GetQuestionByIdAsync(Guid id, Guid schoolId);
        Task<QuestionResponse> CreateQuestionAsync(Guid schoolId, CreateQuestionRequest request);
        Task<QuestionResponse?> UpdateQuestionAsync(Guid id, Guid schoolId, CreateQuestionRequest request);
        Task<bool> DeleteQuestionAsync(Guid id, Guid schoolId);

        // Exams
        Task<List<OnlineExamResponse>> GetExamsAsync(Guid schoolId, string? status);
        Task<OnlineExamResponse?> GetExamByIdAsync(Guid id, Guid schoolId);
        Task<OnlineExamResponse> CreateExamAsync(Guid schoolId, CreateOnlineExamRequest request);
        Task<OnlineExamResponse?> UpdateExamStatusAsync(Guid id, Guid schoolId, string status);
        Task<bool> DeleteExamAsync(Guid id, Guid schoolId);

        // Sessions
        Task<ExamSessionResponse> StartSessionAsync(Guid schoolId, Guid studentId, Guid examId);
        Task<ExamSessionResponse?> SubmitExamAsync(Guid sessionId, Guid schoolId, Guid studentId, SubmitExamRequest request);
        Task<ExamSessionResponse?> GetSessionAsync(Guid sessionId, Guid schoolId);
        Task<List<ExamSessionResponse>> GetSessionsByExamAsync(Guid examId, Guid schoolId);
        Task<bool> GradeResponseAsync(Guid schoolId, Guid gradedBy, GradeResponseRequest request);

        // Stats
        Task<ExamStatsResponse> GetExamStatsAsync(Guid examId, Guid schoolId);
    }

    public class OnlineExamService : IOnlineExamService
    {
        private readonly AppDbContext _context;

        public OnlineExamService(AppDbContext context)
        {
            _context = context;
        }

        // ── Question Bank ────────────────────────────────────────────────────────

        public async Task<List<QuestionResponse>> GetQuestionsAsync(Guid schoolId, Guid? subjectId, string? questionType, string? difficulty)
        {
            var q = _context.QuestionBanks.Where(x => x.SchoolId == schoolId && !x.IsDeleted && x.IsActive);
            if (subjectId.HasValue) q = q.Where(x => x.SubjectId == subjectId.Value);
            if (!string.IsNullOrWhiteSpace(questionType)) q = q.Where(x => x.QuestionType == questionType);
            if (!string.IsNullOrWhiteSpace(difficulty)) q = q.Where(x => x.Difficulty == difficulty);
            var list = await q.OrderBy(x => x.CreatedAt).ToListAsync();
            return list.Select(x => MapQuestion(x, GetSubjectName(x.SubjectId))).ToList();
        }

        public async Task<QuestionResponse?> GetQuestionByIdAsync(Guid id, Guid schoolId)
        {
            var q = await _context.QuestionBanks.FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId && !x.IsDeleted);
            return q == null ? null : MapQuestion(q, GetSubjectName(q.SubjectId));
        }

        public async Task<QuestionResponse> CreateQuestionAsync(Guid schoolId, CreateQuestionRequest request)
        {
            var q = new QuestionBank
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, SubjectId = request.SubjectId,
                QuestionType = request.QuestionType, QuestionText = request.QuestionText,
                Options = request.Options != null ? JsonSerializer.Serialize(request.Options) : null,
                CorrectAnswer = request.CorrectAnswer, Marks = request.Marks,
                Difficulty = request.Difficulty ?? "medium", Tags = request.Tags,
                Explanation = request.Explanation, IsActive = true,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            _context.QuestionBanks.Add(q);
            await _context.SaveChangesAsync();
            return MapQuestion(q, GetSubjectName(q.SubjectId));
        }

        public async Task<QuestionResponse?> UpdateQuestionAsync(Guid id, Guid schoolId, CreateQuestionRequest request)
        {
            var q = await _context.QuestionBanks.FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId && !x.IsDeleted);
            if (q == null) return null;
            q.SubjectId = request.SubjectId; q.QuestionType = request.QuestionType;
            q.QuestionText = request.QuestionText;
            q.Options = request.Options != null ? JsonSerializer.Serialize(request.Options) : null;
            q.CorrectAnswer = request.CorrectAnswer; q.Marks = request.Marks;
            q.Difficulty = request.Difficulty ?? q.Difficulty;
            q.Tags = request.Tags; q.Explanation = request.Explanation;
            q.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return MapQuestion(q, GetSubjectName(q.SubjectId));
        }

        public async Task<bool> DeleteQuestionAsync(Guid id, Guid schoolId)
        {
            var q = await _context.QuestionBanks.FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId && !x.IsDeleted);
            if (q == null) return false;
            q.IsDeleted = true; q.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        private string GetSubjectName(Guid subjectId)
        {
            var subject = _context.Subjects.AsNoTracking().FirstOrDefault(s => s.Id == subjectId);
            return subject?.Name ?? string.Empty;
        }

        private static QuestionResponse MapQuestion(QuestionBank q, string subjectName) => new()
        {
            Id = q.Id, SchoolId = q.SchoolId, SubjectId = q.SubjectId, SubjectName = subjectName,
            QuestionType = q.QuestionType, QuestionText = q.QuestionText,
            Options = q.Options != null ? JsonSerializer.Deserialize<List<string>>(q.Options) : null,
            CorrectAnswer = q.CorrectAnswer, Marks = q.Marks, Difficulty = q.Difficulty,
            Tags = q.Tags, Explanation = q.Explanation, IsActive = q.IsActive, CreatedAt = q.CreatedAt
        };

        // ── Exams ────────────────────────────────────────────────────────────────

        public async Task<List<OnlineExamResponse>> GetExamsAsync(Guid schoolId, string? status)
        {
            var q = _context.OnlineExams
                .Include(e => e.Questions)
                .Where(e => e.SchoolId == schoolId && !e.IsDeleted);
            if (!string.IsNullOrWhiteSpace(status)) q = q.Where(e => e.Status == status);
            var list = await q.OrderByDescending(e => e.ScheduledStart).ToListAsync();
            return list.Select(e => MapExam(e)).ToList();
        }

        public async Task<OnlineExamResponse?> GetExamByIdAsync(Guid id, Guid schoolId)
        {
            var e = await _context.OnlineExams.Include(x => x.Questions).FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId && !x.IsDeleted);
            return e == null ? null : MapExam(e);
        }

        public async Task<OnlineExamResponse> CreateExamAsync(Guid schoolId, CreateOnlineExamRequest request)
        {
            var exam = new OnlineExam
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, Title = request.Title,
                SubjectId = request.SubjectId, ClassId = request.ClassId,
                DurationMinutes = request.DurationMinutes,
                ScheduledStart = request.ScheduledStart, ScheduledEnd = request.ScheduledEnd,
                TotalMarks = request.TotalMarks, PassingMarks = request.PassingMarks,
                Instructions = request.Instructions, Status = "draft",
                ShuffleQuestions = request.ShuffleQuestions, ShowResultImmediately = request.ShowResultImmediately,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            _context.OnlineExams.Add(exam);
            await _context.SaveChangesAsync();

            if (request.Questions != null)
            {
                int order = 1;
                foreach (var qi in request.Questions)
                {
                    _context.OnlineExamQuestions.Add(new OnlineExamQuestion
                    {
                        Id = Guid.NewGuid(), ExamId = exam.Id,
                        QuestionId = qi.QuestionId, QuestionOrder = qi.QuestionOrder > 0 ? qi.QuestionOrder : order++,
                        MarksOverride = qi.MarksOverride,
                        CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                    });
                }
                await _context.SaveChangesAsync();
            }

            await _context.Entry(exam).Collection(e => e.Questions!).LoadAsync();
            return MapExam(exam);
        }

        public async Task<OnlineExamResponse?> UpdateExamStatusAsync(Guid id, Guid schoolId, string status)
        {
            var exam = await _context.OnlineExams.Include(e => e.Questions).FirstOrDefaultAsync(e => e.Id == id && e.SchoolId == schoolId && !e.IsDeleted);
            if (exam == null) return null;
            exam.Status = status; exam.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return MapExam(exam);
        }

        public async Task<bool> DeleteExamAsync(Guid id, Guid schoolId)
        {
            var exam = await _context.OnlineExams.FirstOrDefaultAsync(e => e.Id == id && e.SchoolId == schoolId && !e.IsDeleted);
            if (exam == null) return false;
            exam.IsDeleted = true; exam.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        private static OnlineExamResponse MapExam(OnlineExam e) => new()
        {
            Id = e.Id, SchoolId = e.SchoolId, Title = e.Title,
            SubjectId = e.SubjectId, ClassId = e.ClassId,
            DurationMinutes = e.DurationMinutes,
            ScheduledStart = e.ScheduledStart, ScheduledEnd = e.ScheduledEnd,
            TotalMarks = e.TotalMarks, PassingMarks = e.PassingMarks,
            Instructions = e.Instructions, Status = e.Status,
            ShuffleQuestions = e.ShuffleQuestions, ShowResultImmediately = e.ShowResultImmediately,
            TotalQuestions = e.Questions?.Count ?? 0,
            CreatedAt = e.CreatedAt, UpdatedAt = e.UpdatedAt
        };

        // ── Sessions ─────────────────────────────────────────────────────────────

        public async Task<ExamSessionResponse> StartSessionAsync(Guid schoolId, Guid studentId, Guid examId)
        {
            var exam = await _context.OnlineExams.Include(e => e.Questions)
                .FirstOrDefaultAsync(e => e.Id == examId && e.SchoolId == schoolId && !e.IsDeleted);
            if (exam == null) throw new KeyNotFoundException("Exam not found.");
            if (exam.Status != "published" && exam.Status != "active")
                throw new InvalidOperationException("Exam is not available for taking.");

            var existing = await _context.StudentExamSessions.FirstOrDefaultAsync(
                s => s.ExamId == examId && s.StudentId == studentId && !s.IsDeleted);
            if (existing != null && existing.Status != "pending")
                throw new InvalidOperationException("You have already started or completed this exam.");

            var session = existing ?? new StudentExamSession
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, ExamId = examId, StudentId = studentId,
                TotalMarks = exam.TotalMarks, ObtainedMarks = 0, Status = "in_progress",
                StartedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            if (existing == null)
                _context.StudentExamSessions.Add(session);
            else
            {
                session.Status = "in_progress"; session.StartedAt = DateTime.UtcNow; session.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return await BuildSessionResponse(session, exam);
        }

        public async Task<ExamSessionResponse?> SubmitExamAsync(Guid sessionId, Guid schoolId, Guid studentId, SubmitExamRequest request)
        {
            var session = await _context.StudentExamSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.SchoolId == schoolId && s.StudentId == studentId && !s.IsDeleted);
            if (session == null) return null;
            if (session.Status != "in_progress") throw new InvalidOperationException("Exam session is not in progress.");

            var exam = await _context.OnlineExams.Include(e => e.Questions)
                .FirstOrDefaultAsync(e => e.Id == session.ExamId);
            if (exam == null) throw new KeyNotFoundException("Exam not found.");

            decimal obtainedMarks = 0;
            bool allMcq = true;

            foreach (var answer in request.Answers)
            {
                var examQuestion = exam.Questions?.FirstOrDefault(q => q.QuestionId == answer.QuestionId);
                if (examQuestion == null) continue;

                var questionDef = await _context.QuestionBanks.AsNoTracking().FirstOrDefaultAsync(q => q.Id == answer.QuestionId);
                if (questionDef == null) continue;

                var marksAvailable = examQuestion.MarksOverride ?? questionDef.Marks;
                bool? isCorrect = null;
                decimal marksAwarded = 0;

                if (questionDef.QuestionType == "MCQ" || questionDef.QuestionType == "true_false")
                {
                    isCorrect = !string.IsNullOrWhiteSpace(questionDef.CorrectAnswer) &&
                                string.Equals(answer.ResponseText?.Trim(), questionDef.CorrectAnswer.Trim(), StringComparison.OrdinalIgnoreCase);
                    marksAwarded = isCorrect == true ? marksAvailable : 0;
                    obtainedMarks += marksAwarded;
                }
                else
                {
                    allMcq = false; // subjective — needs manual grading
                }

                var response = await _context.StudentExamResponses.FirstOrDefaultAsync(
                    r => r.SessionId == sessionId && r.QuestionId == answer.QuestionId && !r.IsDeleted);
                if (response == null)
                {
                    _context.StudentExamResponses.Add(new StudentExamResponse
                    {
                        Id = Guid.NewGuid(), SessionId = sessionId,
                        QuestionId = answer.QuestionId, ResponseText = answer.ResponseText,
                        IsCorrect = isCorrect, MarksAwarded = marksAwarded,
                        CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                    });
                }
                else
                {
                    response.ResponseText = answer.ResponseText; response.IsCorrect = isCorrect;
                    response.MarksAwarded = marksAwarded; response.UpdatedAt = DateTime.UtcNow;
                }
            }

            session.SubmittedAt = DateTime.UtcNow;
            session.ObtainedMarks = obtainedMarks;
            session.Status = allMcq ? "graded" : "submitted";
            session.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return await BuildSessionResponse(session, exam);
        }

        public async Task<ExamSessionResponse?> GetSessionAsync(Guid sessionId, Guid schoolId)
        {
            var session = await _context.StudentExamSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.SchoolId == schoolId && !s.IsDeleted);
            if (session == null) return null;
            var exam = await _context.OnlineExams.Include(e => e.Questions)
                .FirstOrDefaultAsync(e => e.Id == session.ExamId);
            return await BuildSessionResponse(session, exam);
        }

        public async Task<List<ExamSessionResponse>> GetSessionsByExamAsync(Guid examId, Guid schoolId)
        {
            var sessions = await _context.StudentExamSessions
                .Where(s => s.ExamId == examId && s.SchoolId == schoolId && !s.IsDeleted)
                .ToListAsync();
            var exam = await _context.OnlineExams.Include(e => e.Questions).FirstOrDefaultAsync(e => e.Id == examId);
            var result = new List<ExamSessionResponse>();
            foreach (var s in sessions) result.Add(await BuildSessionResponse(s, exam));
            return result;
        }

        public async Task<bool> GradeResponseAsync(Guid schoolId, Guid gradedBy, GradeResponseRequest request)
        {
            var response = await _context.StudentExamResponses
                .FirstOrDefaultAsync(r => r.Id == request.ResponseId && !r.IsDeleted);
            if (response == null) return false;
            response.MarksAwarded = request.MarksAwarded;
            response.GraderRemarks = request.Remarks;
            response.GradedBy = gradedBy; response.GradedAt = DateTime.UtcNow;
            response.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Recalculate session total
            var session = await _context.StudentExamSessions.FirstOrDefaultAsync(s => s.Id == response.SessionId && !s.IsDeleted);
            if (session != null)
            {
                var totalObtained = await _context.StudentExamResponses
                    .Where(r => r.SessionId == session.Id && !r.IsDeleted)
                    .SumAsync(r => r.MarksAwarded);
                var ungradedCount = await _context.StudentExamResponses
                    .CountAsync(r => r.SessionId == session.Id && !r.IsDeleted && r.GradedAt == null && r.IsCorrect == null);
                session.ObtainedMarks = totalObtained;
                session.Status = ungradedCount == 0 ? "graded" : "submitted";
                session.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
            return true;
        }

        public async Task<ExamStatsResponse> GetExamStatsAsync(Guid examId, Guid schoolId)
        {
            var exam = await _context.OnlineExams.AsNoTracking().FirstOrDefaultAsync(e => e.Id == examId && e.SchoolId == schoolId);
            var sessions = await _context.StudentExamSessions.AsNoTracking()
                .Where(s => s.ExamId == examId && s.SchoolId == schoolId && !s.IsDeleted)
                .ToListAsync();

            var submitted = sessions.Count(s => s.Status is "submitted" or "graded");
            var graded = sessions.Count(s => s.Status == "graded");
            var passingMarks = exam?.PassingMarks ?? 0;
            var passed = sessions.Count(s => s.Status == "graded" && s.ObtainedMarks >= passingMarks);
            var failed = graded - passed;
            var gradedMarks = sessions.Where(s => s.Status == "graded").Select(s => s.ObtainedMarks).ToList();

            return new ExamStatsResponse
            {
                ExamId = examId, ExamTitle = exam?.Title ?? string.Empty,
                TotalStudents = sessions.Count, Submitted = submitted, Graded = graded,
                Passed = passed, Failed = failed,
                AverageMarks = gradedMarks.Count > 0 ? gradedMarks.Average() : 0,
                HighestMarks = gradedMarks.Count > 0 ? gradedMarks.Max() : 0,
                LowestMarks = gradedMarks.Count > 0 ? gradedMarks.Min() : 0
            };
        }

        private async Task<ExamSessionResponse> BuildSessionResponse(StudentExamSession session, OnlineExam? exam)
        {
            var student = await _context.Students.AsNoTracking().FirstOrDefaultAsync(s => s.Id == session.StudentId);
            var studentName = student != null
                ? (!string.IsNullOrWhiteSpace(student.FirstName) ? $"{student.FirstName} {student.LastName}".Trim() : student.Name)
                : string.Empty;

            var responses = await _context.StudentExamResponses
                .Where(r => r.SessionId == session.Id && !r.IsDeleted)
                .ToListAsync();

            var questionIds = responses.Select(r => r.QuestionId).Distinct().ToList();
            var questions = await _context.QuestionBanks.AsNoTracking()
                .Where(q => questionIds.Contains(q.Id)).ToListAsync();

            var responseItems = responses.Select(r =>
            {
                var q = questions.FirstOrDefault(x => x.Id == r.QuestionId);
                return new ExamResponseItem
                {
                    Id = r.Id, QuestionId = r.QuestionId,
                    QuestionText = q?.QuestionText ?? string.Empty,
                    ResponseText = r.ResponseText, IsCorrect = r.IsCorrect,
                    MarksAwarded = r.MarksAwarded, GraderRemarks = r.GraderRemarks
                };
            }).ToList();

            return new ExamSessionResponse
            {
                Id = session.Id, ExamId = session.ExamId, ExamTitle = exam?.Title ?? string.Empty,
                StudentId = session.StudentId, StudentName = studentName,
                StartedAt = session.StartedAt, SubmittedAt = session.SubmittedAt,
                TotalMarks = session.TotalMarks, ObtainedMarks = session.ObtainedMarks,
                Status = session.Status, Responses = responseItems, CreatedAt = session.CreatedAt
            };
        }
    }
}
