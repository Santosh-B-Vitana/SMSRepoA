using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Models.DTOs;

namespace SmsApi.Services
{
    public interface IFinanceService
    {
        // Accounts
        Task<List<FinanceAccountDto>> GetAccountsAsync(Guid schoolId);
        Task<FinanceAccountDto> CreateAccountAsync(Guid schoolId, CreateFinanceAccountDto dto);
        
        // Transactions
        Task<PaginatedResponse<FinanceTransactionDto>> GetTransactionsAsync(
            Guid schoolId, TransactionFiltersDto filters, int page, int pageSize);
        Task<FinanceTransactionDto> CreateTransactionAsync(Guid schoolId, CreateFinanceTransactionDto dto, Guid userId);
        Task<FinanceTransactionDto> AddIncomeAsync(Guid schoolId, AddIncomeDto dto, Guid userId);
        Task<FinanceTransactionDto> AddExpenseAsync(Guid schoolId, AddExpenseDto dto, Guid userId);
        Task<FinanceTransactionDto> AddStoreIncomeAsync(Guid schoolId, AddStoreIncomeDto dto, Guid userId);
        
        // Categories
        Task<List<FinanceCategoryDto>> GetCategoriesAsync(Guid schoolId, string? type = null);
        Task<FinanceCategoryDto> CreateCategoryAsync(Guid schoolId, CreateFinanceCategoryDto dto);
        
        // Petty Cash
        Task<PaginatedResponse<PettyCashEntryDto>> GetPettyCashEntriesAsync(Guid schoolId, int page, int pageSize);
        Task<PettyCashEntryDto> CreatePettyCashEntryAsync(Guid schoolId, CreatePettyCashEntryDto dto, Guid staffId);
        Task<PettyCashEntryDto> ApprovePettyCashAsync(Guid schoolId, Guid entryId, ApprovePettyCashDto dto, Guid staffId);
        
        // Store Sales
        Task<PaginatedResponse<StoreSaleDto>> GetStoreSalesAsync(Guid schoolId, int page, int pageSize);
        Task<StoreSaleDto> CreateStoreSaleAsync(Guid schoolId, CreateStoreSaleDto dto, Guid staffId);
        
        // Stats
        Task<FinanceStatsDto> GetStatsAsync(Guid schoolId, FinanceFiltersDto filters);
        Task<FinanceReportDto> GetReportAsync(Guid schoolId, DateTime dateFrom, DateTime dateTo);
        Task<FinanceCategoryDto> UpdateCategoryAsync(Guid schoolId, Guid categoryId, UpdateFinanceCategoryDto dto);
        
        // Aggregated Income Sources
        Task<AggregatedIncomeDto> GetAggregatedIncomeSourcesAsync(Guid schoolId);
    }

    public class FinanceService : IFinanceService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<FinanceService> _logger;

        public FinanceService(AppDbContext context, ILogger<FinanceService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // ========== ACCOUNTS ==========

        public async Task<List<FinanceAccountDto>> GetAccountsAsync(Guid schoolId)
        {
            try
            {
                return await _context.FinanceAccounts
                    .Where(a => a.SchoolId == schoolId && a.IsActive)
                    .Select(a => new FinanceAccountDto
                    {
                        Id = a.Id,
                        Name = a.Name,
                        Type = a.Type,
                        ParentAccountId = a.ParentAccountId,
                        Balance = a.Balance,
                        IsActive = a.IsActive
                    })
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting accounts for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<FinanceAccountDto> CreateAccountAsync(Guid schoolId, CreateFinanceAccountDto dto)
        {
            try
            {
                // VALIDATION 1: Account type must be valid
                var validTypes = new[] { "ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE" };
                if (!validTypes.Contains(dto.Type.ToUpper()))
                    throw new InvalidOperationException("Invalid account type");

                // VALIDATION 2: Parent account must exist and be same type
                if (dto.ParentAccountId.HasValue)
                {
                    var parent = await _context.FinanceAccounts
                        .FirstOrDefaultAsync(a => a.Id == dto.ParentAccountId.Value && a.SchoolId == schoolId);
                    if (parent == null)
                        throw new InvalidOperationException("Parent account not found");
                    if (parent.Type != dto.Type.ToUpper())
                        throw new InvalidOperationException("Parent account must be of same type");
                }

                // VALIDATION 3: Duplicate account name check
                var duplicateName = await _context.FinanceAccounts
                    .AnyAsync(a => a.SchoolId == schoolId && a.Name.ToLower() == dto.Name.ToLower() && a.IsActive);
                if (duplicateName)
                    throw new InvalidOperationException("Account with this name already exists");

                var account = new FinanceAccount
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    Name = dto.Name,
                    Type = dto.Type.ToUpper(),
                    ParentAccountId = dto.ParentAccountId,
                    Balance = 0,
                    IsActive = true,
                    Description = dto.Description,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.FinanceAccounts.Add(account);
                await _context.SaveChangesAsync();

                return new FinanceAccountDto
                {
                    Id = account.Id,
                    Name = account.Name,
                    Type = account.Type,
                    ParentAccountId = account.ParentAccountId,
                    Balance = account.Balance,
                    IsActive = account.IsActive
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating account for school {SchoolId}", schoolId);
                throw;
            }
        }

        // ========== TRANSACTIONS ==========

        public async Task<PaginatedResponse<FinanceTransactionDto>> GetTransactionsAsync(
            Guid schoolId, TransactionFiltersDto filters, int page, int pageSize)
        {
            // Pagination normalization
            page = Math.Max(1, page);
            pageSize = Math.Min(100, Math.Max(1, pageSize));

            try
            {
                var query = from t in _context.FinanceTransactions
                            join a in _context.FinanceAccounts on t.AccountId equals a.Id
                            join c in _context.FinanceCategories on t.CategoryId equals c.Id
                            where t.SchoolId == schoolId
                            select new { t, a, c };

                if (filters.AccountId.HasValue)
                    query = query.Where(x => x.t.AccountId == filters.AccountId.Value);

                if (filters.CategoryId.HasValue)
                    query = query.Where(x => x.t.CategoryId == filters.CategoryId.Value);

                if (!string.IsNullOrEmpty(filters.Type))
                    query = query.Where(x => x.t.Type == filters.Type.ToUpper());

                if (!string.IsNullOrEmpty(filters.Source))
                    query = query.Where(x => x.t.Source == filters.Source.ToUpper());

                if (filters.DateFrom.HasValue)
                    query = query.Where(x => x.t.Date >= filters.DateFrom.Value);

                if (filters.DateTo.HasValue)
                    query = query.Where(x => x.t.Date <= filters.DateTo.Value);

                if (!string.IsNullOrEmpty(filters.SearchQuery))
                {
                    var search = filters.SearchQuery.ToLower();
                    query = query.Where(x =>
                        x.a.Name.ToLower().Contains(search) ||
                        x.c.Name.ToLower().Contains(search) ||
                        x.t.Description.ToLower().Contains(search));
                }

                var totalCount = await query.CountAsync();

                var items = await query
                    .OrderByDescending(x => x.t.Date)
                    .ThenByDescending(x => x.t.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(x => new FinanceTransactionDto
                    {
                        Id = x.t.Id,
                        AccountId = x.t.AccountId,
                        AccountName = x.a.Name,
                        Amount = x.t.Amount,
                        Type = x.t.Type,
                        CategoryId = x.t.CategoryId,
                        CategoryName = x.c.Name,
                        Date = x.t.Date,
                        Description = x.t.Description,
                        Source = x.t.Source,
                        ReceiptUrl = x.t.ReceiptUrl,
                        CreatedAt = x.t.CreatedAt
                    })
                    .ToListAsync();

                return new PaginatedResponse<FinanceTransactionDto>
                {
                    Items = items,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting transactions for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<FinanceTransactionDto> CreateTransactionAsync(
            Guid schoolId, CreateFinanceTransactionDto dto, Guid userId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // VALIDATION 1: Account must exist and be active
                var account = await _context.FinanceAccounts
                    .FirstOrDefaultAsync(a => a.Id == dto.AccountId && a.SchoolId == schoolId);
                if (account == null || !account.IsActive)
                    throw new InvalidOperationException("Account not found or inactive");

                // VALIDATION 2: Category must exist and be active
                var category = await _context.FinanceCategories
                    .FirstOrDefaultAsync(c => c.Id == dto.CategoryId && c.SchoolId == schoolId);
                if (category == null || !category.IsActive)
                    throw new InvalidOperationException("Category not found or inactive");

                // VALIDATION 3: Amount must be positive
                if (dto.Amount <= 0)
                    throw new InvalidOperationException("Amount must be greater than zero");

                // VALIDATION 4: Transaction type and account type compatibility
                var validCombination = ValidateAccountTransaction(account.Type, dto.Type, category.Type);
                if (!validCombination)
                    throw new InvalidOperationException($"Invalid transaction: Cannot {dto.Type} an {account.Type} account for {category.Type}");

                // VALIDATION 5: Category budget check for expenses
                if (category.Type == "EXPENSE" && category.Budget.HasValue && dto.Type == "DEBIT")
                {
                    var totalSpent = await _context.FinanceTransactions
                        .Where(t => t.SchoolId == schoolId && t.CategoryId == dto.CategoryId && t.Type == "DEBIT")
                        .SumAsync(t => t.Amount);
                    
                    if (totalSpent + dto.Amount > category.Budget.Value)
                    {
                        _logger.LogWarning("Budget exceeded for category {CategoryId}. Budget: {Budget}, Spent: {Spent}, New: {New}",
                            dto.CategoryId, category.Budget.Value, totalSpent, dto.Amount);
                        // Don't throw, just log warning
                    }
                }

                var financeTransaction = new FinanceTransaction
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    AccountId = dto.AccountId,
                    Amount = dto.Amount,
                    Type = dto.Type.ToUpper(),
                    CategoryId = dto.CategoryId,
                    Date = dto.Date,
                    Description = dto.Description,
                    Source = dto.Source.ToUpper(),
                    ReceiptUrl = dto.ReceiptUrl,
                    ProcessedByStaffId = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Update account balance
                if (dto.Type.ToUpper() == "CREDIT")
                    account.Balance += dto.Amount;
                else if (dto.Type.ToUpper() == "DEBIT")
                    account.Balance -= dto.Amount;

                account.UpdatedAt = DateTime.UtcNow;

                _context.FinanceTransactions.Add(financeTransaction);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return new FinanceTransactionDto
                {
                    Id = financeTransaction.Id,
                    AccountId = financeTransaction.AccountId,
                    AccountName = account.Name,
                    Amount = financeTransaction.Amount,
                    Type = financeTransaction.Type,
                    CategoryId = financeTransaction.CategoryId,
                    CategoryName = category.Name,
                    Date = financeTransaction.Date,
                    Description = financeTransaction.Description,
                    Source = financeTransaction.Source,
                    ReceiptUrl = financeTransaction.ReceiptUrl,
                    CreatedAt = financeTransaction.CreatedAt
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error creating transaction for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<FinanceTransactionDto> AddIncomeAsync(Guid schoolId, AddIncomeDto dto, Guid userId)
        {
            var transactionDto = new CreateFinanceTransactionDto
            {
                AccountId = dto.AccountId,
                Amount = dto.Amount,
                Type = "CREDIT",
                CategoryId = dto.CategoryId,
                Date = dto.Date,
                Description = dto.Description,
                Source = dto.Source
            };

            return await CreateTransactionAsync(schoolId, transactionDto, userId);
        }

        public async Task<FinanceTransactionDto> AddExpenseAsync(Guid schoolId, AddExpenseDto dto, Guid userId)
        {
            var transactionDto = new CreateFinanceTransactionDto
            {
                AccountId = dto.AccountId,
                Amount = dto.Amount,
                Type = "DEBIT",
                CategoryId = dto.CategoryId,
                Date = dto.Date,
                Description = dto.Description,
                Source = dto.Source
            };

            return await CreateTransactionAsync(schoolId, transactionDto, userId);
        }

        public async Task<FinanceTransactionDto> AddStoreIncomeAsync(Guid schoolId, AddStoreIncomeDto dto, Guid userId)
        {
            var transactionDto = new CreateFinanceTransactionDto
            {
                AccountId = dto.AccountId,
                Amount = dto.Amount,
                Type = "CREDIT",
                CategoryId = dto.CategoryId,
                Date = dto.Date,
                Description = dto.Description,
                Source = "STORE"
            };

            return await CreateTransactionAsync(schoolId, transactionDto, userId);
        }

        // ========== CATEGORIES ==========

        public async Task<List<FinanceCategoryDto>> GetCategoriesAsync(Guid schoolId, string? type = null)
        {
            try
            {
                var query = _context.FinanceCategories
                    .Where(c => c.SchoolId == schoolId && c.IsActive);

                if (!string.IsNullOrEmpty(type))
                    query = query.Where(c => c.Type == type.ToUpper());

                var categories = await query.ToListAsync();

                var result = new List<FinanceCategoryDto>();
                foreach (var cat in categories)
                {
                    var actualAmount = await _context.FinanceTransactions
                        .Where(t => t.SchoolId == schoolId && t.CategoryId == cat.Id)
                        .SumAsync(t => cat.Type == "INCOME" && t.Type == "CREDIT" ? t.Amount :
                                      cat.Type == "EXPENSE" && t.Type == "DEBIT" ? t.Amount : 0);

                    result.Add(new FinanceCategoryDto
                    {
                        Id = cat.Id,
                        Name = cat.Name,
                        Type = cat.Type,
                        Budget = cat.Budget,
                        ActualAmount = actualAmount,
                        IsActive = cat.IsActive
                    });
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting categories for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<FinanceCategoryDto> CreateCategoryAsync(Guid schoolId, CreateFinanceCategoryDto dto)
        {
            try
            {
                // VALIDATION 1: Type must be valid
                if (dto.Type.ToUpper() != "INCOME" && dto.Type.ToUpper() != "EXPENSE")
                    throw new InvalidOperationException("Category type must be INCOME or EXPENSE");

                // VALIDATION 2: Duplicate name check
                var duplicateName = await _context.FinanceCategories
                    .AnyAsync(c => c.SchoolId == schoolId && c.Name.ToLower() == dto.Name.ToLower() && c.IsActive);
                if (duplicateName)
                    throw new InvalidOperationException("Category with this name already exists");

                // VALIDATION 3: Budget must be positive if specified
                if (dto.Budget.HasValue && dto.Budget.Value < 0)
                    throw new InvalidOperationException("Budget cannot be negative");

                var category = new FinanceCategory
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    Name = dto.Name,
                    Type = dto.Type.ToUpper(),
                    Budget = dto.Budget,
                    IsActive = true,
                    Description = dto.Description,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.FinanceCategories.Add(category);
                await _context.SaveChangesAsync();

                return new FinanceCategoryDto
                {
                    Id = category.Id,
                    Name = category.Name,
                    Type = category.Type,
                    Budget = category.Budget,
                    ActualAmount = 0,
                    IsActive = category.IsActive
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating category for school {SchoolId}", schoolId);
                throw;
            }
        }

        // ========== PETTY CASH ==========

        public async Task<PaginatedResponse<PettyCashEntryDto>> GetPettyCashEntriesAsync(
            Guid schoolId, int page, int pageSize)
        {
            // Pagination normalization
            page = Math.Max(1, page);
            pageSize = Math.Min(100, Math.Max(1, pageSize));

            try
            {
                var query = from pc in _context.PettyCashEntries
                            join req in _context.StaffMembers on pc.RequestedByStaffId equals req.Id
                            join app in _context.StaffMembers on pc.ApprovedByStaffId equals app.Id into appGroup
                            from approver in appGroup.DefaultIfEmpty()
                            where pc.SchoolId == schoolId
                            select new { pc, req, approver };

                var totalCount = await query.CountAsync();

                var items = await query
                    .OrderByDescending(x => x.pc.Date)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(x => new PettyCashEntryDto
                    {
                        Id = x.pc.Id,
                        Date = x.pc.Date,
                        Amount = x.pc.Amount,
                        Purpose = x.pc.Purpose,
                        RequestedByName = $"{x.req.FirstName} {x.req.LastName}",
                        ApprovedByName = x.approver != null ? $"{x.approver.FirstName} {x.approver.LastName}" : null,
                        Status = x.pc.Status,
                        ReceiptUrl = x.pc.ReceiptUrl,
                        ApprovalRemarks = x.pc.ApprovalRemarks,
                        ApprovedAt = x.pc.ApprovedAt,
                        CreatedAt = x.pc.CreatedAt
                    })
                    .ToListAsync();

                return new PaginatedResponse<PettyCashEntryDto>
                {
                    Items = items,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting petty cash entries for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<PettyCashEntryDto> CreatePettyCashEntryAsync(
            Guid schoolId, CreatePettyCashEntryDto dto, Guid staffId)
        {
            try
            {
                // VALIDATION 1: Amount must be within petty cash limits
                if (dto.Amount <= 0 || dto.Amount > 50000)
                    throw new InvalidOperationException("Petty cash amount must be between 0.01 and 50000");

                // VALIDATION 2: Staff member must exist
                var staff = await _context.StaffMembers
                    .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId);
                if (staff == null)
                    throw new InvalidOperationException("Staff member not found");

                var entry = new PettyCashEntry
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    Date = dto.Date,
                    Amount = dto.Amount,
                    Purpose = dto.Purpose,
                    RequestedByStaffId = staffId,
                    Status = "PENDING",
                    ReceiptUrl = dto.ReceiptUrl,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.PettyCashEntries.Add(entry);
                await _context.SaveChangesAsync();

                return new PettyCashEntryDto
                {
                    Id = entry.Id,
                    Date = entry.Date,
                    Amount = entry.Amount,
                    Purpose = entry.Purpose,
                    RequestedByName = $"{staff.FirstName} {staff.LastName}",
                    ApprovedByName = null,
                    Status = entry.Status,
                    ReceiptUrl = entry.ReceiptUrl,
                    ApprovalRemarks = null,
                    ApprovedAt = null,
                    CreatedAt = entry.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating petty cash entry for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<PettyCashEntryDto> ApprovePettyCashAsync(
            Guid schoolId, Guid entryId, ApprovePettyCashDto dto, Guid staffId)
        {
            try
            {
                // VALIDATION 1: Entry must exist and be pending
                var entry = await _context.PettyCashEntries
                    .FirstOrDefaultAsync(pc => pc.Id == entryId && pc.SchoolId == schoolId);
                if (entry == null)
                    throw new KeyNotFoundException("Petty cash entry not found");

                if (entry.Status != "PENDING")
                    throw new InvalidOperationException("Only pending entries can be approved/rejected");

                // VALIDATION 2: Approver must be different from requester
                if (entry.RequestedByStaffId == staffId)
                    throw new InvalidOperationException("Cannot approve your own petty cash request");

                // VALIDATION 3: Staff member must exist
                var staff = await _context.StaffMembers
                    .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId);
                if (staff == null)
                    throw new InvalidOperationException("Staff member not found");

                entry.Status = dto.Status.ToUpper();
                entry.ApprovedByStaffId = staffId;
                entry.ApprovalRemarks = dto.ApprovalRemarks;
                entry.ApprovedAt = DateTime.UtcNow;
                entry.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                var requester = await _context.StaffMembers.FindAsync(entry.RequestedByStaffId);

                return new PettyCashEntryDto
                {
                    Id = entry.Id,
                    Date = entry.Date,
                    Amount = entry.Amount,
                    Purpose = entry.Purpose,
                    RequestedByName = requester != null ? $"{requester.FirstName} {requester.LastName}" : "Unknown",
                    ApprovedByName = $"{staff.FirstName} {staff.LastName}",
                    Status = entry.Status,
                    ReceiptUrl = entry.ReceiptUrl,
                    ApprovalRemarks = entry.ApprovalRemarks,
                    ApprovedAt = entry.ApprovedAt,
                    CreatedAt = entry.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving petty cash entry {EntryId} for school {SchoolId}", 
                    entryId, schoolId);
                throw;
            }
        }

        // ========== STORE SALES ==========

        public async Task<PaginatedResponse<StoreSaleDto>> GetStoreSalesAsync(Guid schoolId, int page, int pageSize)
        {
            // Pagination normalization
            page = Math.Max(1, page);
            pageSize = Math.Min(100, Math.Max(1, pageSize));

            try
            {
                var query = from ss in _context.StoreSales
                            join staff in _context.StaffMembers on ss.ProcessedByStaffId equals staff.Id into staffGroup
                            from s in staffGroup.DefaultIfEmpty()
                            where ss.SchoolId == schoolId
                            select new { ss, s };

                var totalCount = await query.CountAsync();

                var items = await query
                    .OrderByDescending(x => x.ss.Date)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(x => new StoreSaleDto
                    {
                        Id = x.ss.Id,
                        Date = x.ss.Date,
                        Amount = x.ss.Amount,
                        ItemsCount = x.ss.ItemsCount,
                        PaymentMethod = x.ss.PaymentMethod,
                        InvoiceNumber = x.ss.InvoiceNumber,
                        ProcessedByName = x.s != null ? $"{x.s.FirstName} {x.s.LastName}" : null,
                        CreatedAt = x.ss.CreatedAt
                    })
                    .ToListAsync();

                return new PaginatedResponse<StoreSaleDto>
                {
                    Items = items,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting store sales for school {SchoolId}", schoolId);
                throw;
            }
        }

        public async Task<StoreSaleDto> CreateStoreSaleAsync(Guid schoolId, CreateStoreSaleDto dto, Guid staffId)
        {
            try
            {
                // VALIDATION 1: Amount and items must be positive
                if (dto.Amount <= 0 || dto.ItemsCount <= 0)
                    throw new InvalidOperationException("Amount and items count must be greater than zero");

                // VALIDATION 2: Payment method must be valid
                var validPaymentMethods = new[] { "Cash", "Card", "UPI", "Other" };
                if (!validPaymentMethods.Contains(dto.PaymentMethod))
                    throw new InvalidOperationException("Invalid payment method");

                var sale = new StoreSale
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    Date = dto.Date,
                    Amount = dto.Amount,
                    ItemsCount = dto.ItemsCount,
                    PaymentMethod = dto.PaymentMethod,
                    InvoiceNumber = dto.InvoiceNumber ?? GenerateInvoiceNumber(),
                    Notes = dto.Notes,
                    ProcessedByStaffId = staffId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.StoreSales.Add(sale);
                await _context.SaveChangesAsync();

                var staff = await _context.StaffMembers.FindAsync(staffId);

                return new StoreSaleDto
                {
                    Id = sale.Id,
                    Date = sale.Date,
                    Amount = sale.Amount,
                    ItemsCount = sale.ItemsCount,
                    PaymentMethod = sale.PaymentMethod,
                    InvoiceNumber = sale.InvoiceNumber,
                    ProcessedByName = staff != null ? $"{staff.FirstName} {staff.LastName}" : null,
                    CreatedAt = sale.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating store sale for school {SchoolId}", schoolId);
                throw;
            }
        }

        // ========== STATS ==========

        public async Task<FinanceStatsDto> GetStatsAsync(Guid schoolId, FinanceFiltersDto filters)
        {
            try
            {
                // Get asset accounts balance (cash on hand from Finance accounts)
                var cashAccounts = await _context.FinanceAccounts
                    .Where(a => a.SchoolId == schoolId && a.Type == "ASSET" && a.IsActive)
                    .SumAsync(a => a.Balance);

                // Get Finance module transactions with filters
                var query = _context.FinanceTransactions.Where(t => t.SchoolId == schoolId);

                if (filters.DateFrom.HasValue)
                    query = query.Where(t => t.Date >= filters.DateFrom.Value);

                if (filters.DateTo.HasValue)
                    query = query.Where(t => t.Date <= filters.DateTo.Value);

                var transactions = await query.ToListAsync();

                var financeIncome = transactions.Where(t => t.Type == "CREDIT").Sum(t => t.Amount);
                var totalExpenses = transactions.Where(t => t.Type == "DEBIT").Sum(t => t.Amount);

                var today = DateTime.UtcNow.Date;
                var finTodayIncome = transactions.Where(t => t.Type == "CREDIT" && t.Date.Date == today).Sum(t => t.Amount);
                var todayExpenses = transactions.Where(t => t.Type == "DEBIT" && t.Date.Date == today).Sum(t => t.Amount);

                // ── Cross-module: bridge fee payments from PaymentTransactions ──────────
                var feePayQuery = _context.PaymentTransactions
                    .Where(pt => pt.SchoolId == schoolId && pt.Status == "success");

                if (filters.DateFrom.HasValue)
                    feePayQuery = feePayQuery.Where(pt => pt.Date >= filters.DateFrom.Value);
                if (filters.DateTo.HasValue)
                    feePayQuery = feePayQuery.Where(pt => pt.Date <= filters.DateTo.Value);

                var collectedFees = await feePayQuery.SumAsync(pt => pt.Amount);
                var feeTodayIncome = await feePayQuery
                    .Where(pt => pt.Date.Date == today)
                    .SumAsync(pt => pt.Amount);

                // Pending + overdue fees from FeeRecords
                var pendingFees = await _context.FeeRecords
                    .Where(fr => fr.SchoolId == schoolId
                        && (fr.Status == "pending" || fr.Status == "partial" || fr.Status == "overdue"))
                    .SumAsync(fr => fr.PendingAmount);

                var overdueFees = await _context.FeeRecords
                    .Where(fr => fr.SchoolId == schoolId && fr.Status == "overdue")
                    .SumAsync(fr => fr.PendingAmount);

                var totalFeesBilled = await _context.FeeRecords
                    .Where(fr => fr.SchoolId == schoolId)
                    .SumAsync(fr => fr.TotalAmount);

                // Fee payments grouped by payment method
                var feesByMethod = await _context.PaymentTransactions
                    .Where(pt => pt.SchoolId == schoolId && pt.Status == "success")
                    .GroupBy(pt => pt.Method)
                    .Select(g => new { Method = g.Key, Total = g.Sum(pt => pt.Amount) })
                    .ToDictionaryAsync(x => x.Method, x => x.Total);

                // ── Combined totals ───────────────────────────────────────────────────
                var totalIncome = financeIncome + collectedFees;
                var todayIncome = finTodayIncome + feeTodayIncome;

                var pendingPettyCash = await _context.PettyCashEntries
                    .CountAsync(pc => pc.SchoolId == schoolId && pc.Status == "PENDING");

                // Group by category (Finance module)
                var incomeByCategory = await (from t in _context.FinanceTransactions
                                             join c in _context.FinanceCategories on t.CategoryId equals c.Id
                                             where t.SchoolId == schoolId && t.Type == "CREDIT" && c.Type == "INCOME"
                                             group t by c.Name into g
                                             select new { Category = g.Key, Amount = g.Sum(t => t.Amount) })
                                             .ToDictionaryAsync(x => x.Category, x => x.Amount);

                // Always include fee collections in IncomeByCategory from PaymentTransactions
                if (collectedFees > 0)
                {
                    incomeByCategory.Remove("fee Collections");
                    incomeByCategory["Fee Collections"] = collectedFees;
                }

                var expenseByCategory = await (from t in _context.FinanceTransactions
                                              join c in _context.FinanceCategories on t.CategoryId equals c.Id
                                              where t.SchoolId == schoolId && t.Type == "DEBIT" && c.Type == "EXPENSE"
                                              group t by c.Name into g
                                              select new { Category = g.Key, Amount = g.Sum(t => t.Amount) })
                                              .ToDictionaryAsync(x => x.Category, x => x.Amount);

                var feeCollectionRate = totalFeesBilled > 0
                    ? Math.Round((collectedFees / totalFeesBilled) * 100, 1)
                    : 0m;

                // CashOnHand: Finance ASSET accounts + cash fee payments
                var cashFeePayments = await _context.PaymentTransactions
                    .Where(pt => pt.SchoolId == schoolId && pt.Status == "success" && pt.Method == "cash")
                    .SumAsync(pt => pt.Amount);

                return new FinanceStatsDto
                {
                    CashOnHand = cashAccounts + cashFeePayments,
                    TotalIncome = totalIncome,
                    TotalExpenses = totalExpenses,
                    NetIncome = totalIncome - totalExpenses,
                    TodayIncome = todayIncome,
                    TodayExpenses = todayExpenses,
                    PendingPettyCash = pendingPettyCash,
                    CollectedFees = collectedFees,
                    PendingFees = pendingFees,
                    TotalFeesBilled = totalFeesBilled,
                    OverdueFees = overdueFees,
                    FeeCollectionRate = feeCollectionRate,
                    IncomeByCategory = incomeByCategory,
                    ExpenseByCategory = expenseByCategory,
                    FeesByPaymentMethod = feesByMethod
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting stats for school {SchoolId}", schoolId);
                throw;
            }
        }

        // ========== HELPER METHODS ==========

        public async Task<FinanceReportDto> GetReportAsync(Guid schoolId, DateTime dateFrom, DateTime dateTo)
        {
            try
            {
                var transactions = await _context.FinanceTransactions
                    .Where(t => t.SchoolId == schoolId && t.Date >= dateFrom && t.Date <= dateTo)
                    .ToListAsync();

                var financeIncome = transactions.Where(t => t.Type == "CREDIT").Sum(t => t.Amount);
                var totalExpenses = transactions.Where(t => t.Type == "DEBIT").Sum(t => t.Amount);
                var storeSalesTotal = transactions.Where(t => t.Source == "STORE").Sum(t => t.Amount);
                var pettyCashTotal = await _context.PettyCashEntries
                    .Where(pc => pc.SchoolId == schoolId && pc.Status == "APPROVED"
                        && pc.Date >= dateFrom && pc.Date <= dateTo)
                    .SumAsync(pc => pc.Amount);

                // ── Cross-module: fee collections from PaymentTransactions ─────────────
                var feePayments = await _context.PaymentTransactions
                    .Where(pt => pt.SchoolId == schoolId && pt.Status == "success"
                        && pt.Date >= dateFrom && pt.Date <= dateTo)
                    .ToListAsync();

                var feeCollections = feePayments.Sum(pt => pt.Amount);
                var totalIncome = financeIncome + feeCollections;

                // Monthly trend: merge Finance transactions + fee payments by month
                var financeMonths = transactions
                    .GroupBy(t => new { t.Date.Year, t.Date.Month })
                    .Select(g => new
                    {
                        g.Key.Year, g.Key.Month,
                        Inc = g.Where(t => t.Type == "CREDIT").Sum(t => t.Amount),
                        Exp = g.Where(t => t.Type == "DEBIT").Sum(t => t.Amount)
                    });

                var feeMonths = feePayments
                    .GroupBy(pt => new { pt.Date.Year, pt.Date.Month })
                    .Select(g => new { g.Key.Year, g.Key.Month, FeeInc = g.Sum(pt => pt.Amount) });

                var allMonths = financeMonths
                    .Select(f => new { f.Year, f.Month, f.Inc, f.Exp })
                    .Concat(feeMonths.Select(f => new { f.Year, f.Month, Inc = f.FeeInc, Exp = 0m }))
                    .GroupBy(x => new { x.Year, x.Month })
                    .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
                    .Select(g =>
                    {
                        var inc = g.Sum(x => x.Inc);
                        var exp = g.Sum(x => x.Exp);
                        return new MonthlyTrendDto
                        {
                            Month = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy"),
                            Year = g.Key.Year,
                            MonthNumber = g.Key.Month,
                            Income = inc,
                            Expenses = exp,
                            Net = inc - exp
                        };
                    })
                    .ToList();

                // Budget summary
                var categories = await _context.FinanceCategories
                    .Where(c => c.SchoolId == schoolId && c.IsActive && c.Budget.HasValue)
                    .ToListAsync();

                var budgetSummary = new List<BudgetSummaryDto>();
                foreach (var cat in categories)
                {
                    var actual = transactions
                        .Where(t => t.CategoryId == cat.Id)
                        .Sum(t => t.Amount);
                    var utilPct = cat.Budget!.Value > 0 ? (actual / cat.Budget.Value) * 100 : 0;
                    budgetSummary.Add(new BudgetSummaryDto
                    {
                        CategoryName = cat.Name,
                        CategoryType = cat.Type,
                        Budget = cat.Budget.Value,
                        Actual = actual,
                        Variance = actual - cat.Budget.Value,
                        UtilizationPct = Math.Round(utilPct, 1)
                    });
                }

                return new FinanceReportDto
                {
                    DateFrom = dateFrom,
                    DateTo = dateTo,
                    TotalIncome = totalIncome,
                    TotalExpenses = totalExpenses,
                    NetSurplus = totalIncome - totalExpenses,
                    StoreSalesTotal = storeSalesTotal,
                    PettyCashTotal = pettyCashTotal,
                    FeeCollections = feeCollections,
                    MonthlyTrend = allMonths,
                    BudgetSummary = budgetSummary
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting report for school {SchoolId}", schoolId);
                throw;
            }
        }
        public async Task<FinanceCategoryDto> UpdateCategoryAsync(Guid schoolId, Guid categoryId, UpdateFinanceCategoryDto dto)
        {
            try
            {
                var cat = await _context.FinanceCategories
                    .FirstOrDefaultAsync(c => c.Id == categoryId && c.SchoolId == schoolId);
                if (cat == null) throw new KeyNotFoundException("Category not found");

                if (!string.IsNullOrEmpty(dto.Name)) cat.Name = dto.Name;
                if (dto.Budget.HasValue) cat.Budget = dto.Budget.Value;
                cat.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                var actual = await _context.FinanceTransactions
                    .Where(t => t.SchoolId == schoolId && t.CategoryId == categoryId)
                    .SumAsync(t => t.Amount);

                return new FinanceCategoryDto
                {
                    Id = cat.Id,
                    Name = cat.Name,
                    Type = cat.Type,
                    Budget = cat.Budget,
                    ActualAmount = actual,
                    IsActive = cat.IsActive
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating category {CategoryId}", categoryId);
                throw;
            }
        }

        // ========== AGGREGATED INCOME SOURCES ==========

        public async Task<AggregatedIncomeDto> GetAggregatedIncomeSourcesAsync(Guid schoolId)
        {
            try
            {
                var now = DateTime.UtcNow;
                var thisMonthStart = new DateTime(now.Year, now.Month, 1);
                var lastMonthStart = thisMonthStart.AddMonths(-1);
                var lastMonthEnd = thisMonthStart.AddDays(-1);
                var yearStart = new DateTime(now.Year, 1, 1);

                var sources = new List<IncomeSourceDto>();

                // 1. FEE COLLECTIONS (direct from PaymentTransactions — the authoritative source)
                try
                {
                    var feeThisMonth = await _context.PaymentTransactions
                        .Where(pt => pt.SchoolId == schoolId && pt.Status == "success"
                            && pt.Date >= thisMonthStart && pt.Date < thisMonthStart.AddMonths(1))
                        .SumAsync(pt => pt.Amount);

                    var feeLastMonth = await _context.PaymentTransactions
                        .Where(pt => pt.SchoolId == schoolId && pt.Status == "success"
                            && pt.Date >= lastMonthStart && pt.Date < lastMonthEnd.AddDays(1))
                        .SumAsync(pt => pt.Amount);

                    var feeYTD = await _context.PaymentTransactions
                        .Where(pt => pt.SchoolId == schoolId && pt.Status == "success"
                            && pt.Date >= yearStart)
                        .SumAsync(pt => pt.Amount);

                    var feePending = await _context.FeeRecords
                        .Where(fr => fr.SchoolId == schoolId
                            && (fr.Status == "pending" || fr.Status == "partial" || fr.Status == "overdue"))
                        .SumAsync(fr => fr.PendingAmount);

                    var feeCount = await _context.PaymentTransactions
                        .Where(pt => pt.SchoolId == schoolId && pt.Status == "success")
                        .CountAsync();

                    var lastFeeDate = await _context.PaymentTransactions
                        .Where(pt => pt.SchoolId == schoolId && pt.Status == "success")
                        .OrderByDescending(pt => pt.Date)
                        .Select(pt => pt.Date)
                        .FirstOrDefaultAsync();

                    sources.Add(new IncomeSourceDto
                    {
                        SourceName = "Fee Collections",
                        SourceCategory = "FEE",
                        ThisMonth = feeThisMonth,
                        LastMonth = feeLastMonth,
                        YearToDate = feeYTD,
                        Pending = feePending,
                        TransactionCount = feeCount,
                        LastTransactionDate = lastFeeDate == default ? null : lastFeeDate
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error aggregating fee collections");
                }

                // 2. LIBRARY FINES
                try
                {
                    var libraryThisMonth = await _context.Database.SqlQueryRaw<decimal>(
                        @"SELECT COALESCE(SUM(ft.Amount), 0) FROM FinanceTransactions ft 
                          WHERE ft.SchoolId = {0} AND ft.Source = 'LIBRARY' AND ft.Type = 'CREDIT' 
                          AND ft.Date >= {1} AND ft.Date < {2}",
                        schoolId, thisMonthStart, thisMonthStart.AddMonths(1)
                    ).FirstOrDefaultAsync();

                    var libraryLastMonth = await _context.Database.SqlQueryRaw<decimal>(
                        @"SELECT COALESCE(SUM(ft.Amount), 0) FROM FinanceTransactions ft 
                          WHERE ft.SchoolId = {0} AND ft.Source = 'LIBRARY' AND ft.Type = 'CREDIT' 
                          AND ft.Date >= {1} AND ft.Date < {2}",
                        schoolId, lastMonthStart, lastMonthEnd.AddDays(1)
                    ).FirstOrDefaultAsync();

                    var libraryYTD = await _context.Database.SqlQueryRaw<decimal>(
                        @"SELECT COALESCE(SUM(ft.Amount), 0) FROM FinanceTransactions ft 
                          WHERE ft.SchoolId = {0} AND ft.Source = 'LIBRARY' AND ft.Type = 'CREDIT' 
                          AND ft.Date >= {1}",
                        schoolId, yearStart
                    ).FirstOrDefaultAsync();

                    var libraryCount = await _context.FinanceTransactions
                        .Where(t => t.SchoolId == schoolId && t.Source == "LIBRARY" && t.Type == "CREDIT")
                        .CountAsync();

                    var lastLibraryDate = await _context.FinanceTransactions
                        .Where(t => t.SchoolId == schoolId && t.Source == "LIBRARY" && t.Type == "CREDIT")
                        .OrderByDescending(t => t.Date)
                        .Select(t => t.Date)
                        .FirstOrDefaultAsync();

                    sources.Add(new IncomeSourceDto
                    {
                        SourceName = "Library Fines",
                        SourceCategory = "LIBRARY",
                        ThisMonth = libraryThisMonth,
                        LastMonth = libraryLastMonth,
                        YearToDate = libraryYTD,
                        Pending = 0,
                        TransactionCount = libraryCount,
                        LastTransactionDate = lastLibraryDate == default ? null : lastLibraryDate
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error aggregating library fines");
                }

                // 3. STORE SALES
                try
                {
                    var storeThisMonth = await _context.StoreSales
                        .Where(s => s.SchoolId == schoolId && s.Date >= thisMonthStart && s.Date < thisMonthStart.AddMonths(1))
                        .SumAsync(s => s.Amount);

                    var storeLastMonth = await _context.StoreSales
                        .Where(s => s.SchoolId == schoolId && s.Date >= lastMonthStart && s.Date < lastMonthEnd.AddDays(1))
                        .SumAsync(s => s.Amount);

                    var storeYTD = await _context.StoreSales
                        .Where(s => s.SchoolId == schoolId && s.Date >= yearStart)
                        .SumAsync(s => s.Amount);

                    var storeCount = await _context.StoreSales
                        .Where(s => s.SchoolId == schoolId)
                        .CountAsync();

                    var lastStoreDate = await _context.StoreSales
                        .Where(s => s.SchoolId == schoolId)
                        .OrderByDescending(s => s.Date)
                        .Select(s => s.Date)
                        .FirstOrDefaultAsync();

                    sources.Add(new IncomeSourceDto
                    {
                        SourceName = "Store Income",
                        SourceCategory = "STORE",
                        ThisMonth = storeThisMonth,
                        LastMonth = storeLastMonth,
                        YearToDate = storeYTD,
                        Pending = 0,
                        TransactionCount = storeCount,
                        LastTransactionDate = lastStoreDate == default ? null : lastStoreDate
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error aggregating store sales");
                }

                // 4. DONATIONS (Alumni + General)
                try
                {
                    var donationThisMonth = await _context.Database.SqlQueryRaw<decimal>(
                        @"SELECT COALESCE(SUM(ft.Amount), 0) FROM FinanceTransactions ft 
                          WHERE ft.SchoolId = {0} AND ft.Source = 'DONATION' AND ft.Type = 'CREDIT' 
                          AND ft.Date >= {1} AND ft.Date < {2}",
                        schoolId, thisMonthStart, thisMonthStart.AddMonths(1)
                    ).FirstOrDefaultAsync();

                    var donationLastMonth = await _context.Database.SqlQueryRaw<decimal>(
                        @"SELECT COALESCE(SUM(ft.Amount), 0) FROM FinanceTransactions ft 
                          WHERE ft.SchoolId = {0} AND ft.Source = 'DONATION' AND ft.Type = 'CREDIT' 
                          AND ft.Date >= {1} AND ft.Date < {2}",
                        schoolId, lastMonthStart, lastMonthEnd.AddDays(1)
                    ).FirstOrDefaultAsync();

                    var donationYTD = await _context.Database.SqlQueryRaw<decimal>(
                        @"SELECT COALESCE(SUM(ft.Amount), 0) FROM FinanceTransactions ft 
                          WHERE ft.SchoolId = {0} AND ft.Source = 'DONATION' AND ft.Type = 'CREDIT' 
                          AND ft.Date >= {1}",
                        schoolId, yearStart
                    ).FirstOrDefaultAsync();

                    var donationCount = await _context.FinanceTransactions
                        .Where(t => t.SchoolId == schoolId && t.Source == "DONATION" && t.Type == "CREDIT")
                        .CountAsync();

                    var lastDonationDate = await _context.FinanceTransactions
                        .Where(t => t.SchoolId == schoolId && t.Source == "DONATION" && t.Type == "CREDIT")
                        .OrderByDescending(t => t.Date)
                        .Select(t => t.Date)
                        .FirstOrDefaultAsync();

                    sources.Add(new IncomeSourceDto
                    {
                        SourceName = "Donations & Contributions",
                        SourceCategory = "DONATION",
                        ThisMonth = donationThisMonth,
                        LastMonth = donationLastMonth,
                        YearToDate = donationYTD,
                        Pending = 0,
                        TransactionCount = donationCount,
                        LastTransactionDate = lastDonationDate == default ? null : lastDonationDate
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error aggregating donations");
                }

                // 5. PETTY CASH APPROVED (Cash income)
                try
                {
                    var pettyCashThisMonth = await _context.PettyCashEntries
                        .Where(p => p.SchoolId == schoolId && p.Status == "APPROVED"
                            && p.Date >= thisMonthStart && p.Date < thisMonthStart.AddMonths(1))
                        .SumAsync(p => p.Amount);

                    var pettyCashLastMonth = await _context.PettyCashEntries
                        .Where(p => p.SchoolId == schoolId && p.Status == "APPROVED"
                            && p.Date >= lastMonthStart && p.Date < lastMonthEnd.AddDays(1))
                        .SumAsync(p => p.Amount);

                    var pettyCashYTD = await _context.PettyCashEntries
                        .Where(p => p.SchoolId == schoolId && p.Status == "APPROVED" && p.Date >= yearStart)
                        .SumAsync(p => p.Amount);

                    var pettyCashCount = await _context.PettyCashEntries
                        .Where(p => p.SchoolId == schoolId && p.Status == "APPROVED")
                        .CountAsync();

                    var pettyCashPending = await _context.PettyCashEntries
                        .Where(p => p.SchoolId == schoolId && p.Status == "PENDING")
                        .SumAsync(p => p.Amount);

                    var lastPettyCashDate = await _context.PettyCashEntries
                        .Where(p => p.SchoolId == schoolId && p.Status == "APPROVED")
                        .OrderByDescending(p => p.Date)
                        .Select(p => p.Date)
                        .FirstOrDefaultAsync();

                    sources.Add(new IncomeSourceDto
                    {
                        SourceName = "Petty Cash Approvals",
                        SourceCategory = "PETTY_CASH",
                        ThisMonth = pettyCashThisMonth,
                        LastMonth = pettyCashLastMonth,
                        YearToDate = pettyCashYTD,
                        Pending = pettyCashPending,
                        TransactionCount = pettyCashCount,
                        LastTransactionDate = lastPettyCashDate == default ? null : lastPettyCashDate
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error aggregating petty cash");
                }

                // Calculate totals
                var result = new AggregatedIncomeDto
                {
                    Sources = sources,
                    TotalThisMonth = sources.Sum(s => s.ThisMonth),
                    TotalLastMonth = sources.Sum(s => s.LastMonth),
                    TotalYearToDate = sources.Sum(s => s.YearToDate),
                    TotalPending = sources.Sum(s => s.Pending),
                    TotalTransactions = sources.Sum(s => s.TransactionCount),
                    GeneratedAt = DateTime.UtcNow
                };

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting aggregated income sources for school {SchoolId}", schoolId);
                throw;
            }
        }

        private bool ValidateAccountTransaction(string accountType, string transactionType, string categoryType)
        {
            // INCOME accounts: CREDIT increases, DEBIT decreases
            // EXPENSE accounts: DEBIT increases, CREDIT decreases
            // ASSET accounts: DEBIT increases, CREDIT decreases
            // LIABILITY accounts: CREDIT increases, DEBIT decreases

            if (categoryType == "INCOME")
            {
                // Income should CREDIT income accounts or DEBIT asset accounts (receiving money)
                return (accountType == "INCOME" && transactionType == "CREDIT") ||
                       (accountType == "ASSET" && transactionType == "DEBIT");
            }
            else if (categoryType == "EXPENSE")
            {
                // Expense should DEBIT expense accounts or CREDIT asset accounts (spending money)
                return (accountType == "EXPENSE" && transactionType == "DEBIT") ||
                       (accountType == "ASSET" && transactionType == "CREDIT");
            }

            return true; // Allow other combinations
        }

        private string GenerateInvoiceNumber()
        {
            var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            var random = new Random().Next(100, 999);
            return $"INV-{timestamp}-{random}";
        }
    }
}
