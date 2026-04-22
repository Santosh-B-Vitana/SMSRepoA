using System;
using SmsApi.Data;

namespace SmsApi.Services
{
    /// <summary>
    /// Base service class with logging capabilities
    /// All services should inherit from this to get automatic logging
    /// </summary>
    public abstract class BaseService
    {
        protected readonly ILogger _logger;
        protected readonly AppDbContext _context;

        protected BaseService(AppDbContext context, ILogger logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Log operation start with parameters
        /// </summary>
        protected void LogOperationStart(string operationName, object? parameters = null)
        {
            if (parameters != null)
                _logger.LogInformation("Starting operation: {Operation} | Parameters: {@Parameters}", 
                    operationName, parameters);
            else
                _logger.LogInformation("Starting operation: {Operation}", operationName);
        }

        /// <summary>
        /// Log successful operation completion
        /// </summary>
        protected void LogOperationSuccess(string operationName, object? result = null)
        {
            if (result != null)
                _logger.LogInformation("Operation completed successfully: {Operation} | Result: {@Result}", 
                    operationName, result);
            else
                _logger.LogInformation("Operation completed successfully: {Operation}", operationName);
        }

        /// <summary>
        /// Log operation with warning (e.g., duplicate found)
        /// </summary>
        protected void LogOperationWarning(string operationName, string warning)
        {
            _logger.LogWarning("Operation warning: {Operation} | Warning: {Warning}", 
                operationName, warning);
        }

        /// <summary>
        /// Log operation error
        /// </summary>
        protected void LogOperationError(string operationName, Exception ex, object? context = null)
        {
            if (context != null)
                _logger.LogError(ex, "Operation failed: {Operation} | Context: {@Context} | Error: {Error}", 
                    operationName, context, ex.Message);
            else
                _logger.LogError(ex, "Operation failed: {Operation} | Error: {Error}", 
                    operationName, ex.Message);
        }

        /// <summary>
        /// Log audit event (create, update, delete)
        /// </summary>
        protected void LogAudit(string action, string entityType, Guid entityId, Guid userId)
        {
            _logger.LogInformation("Audit: {Action} {EntityType} {EntityId} by User {UserId}", 
                action, entityType, entityId, userId);
        }
    }
}
