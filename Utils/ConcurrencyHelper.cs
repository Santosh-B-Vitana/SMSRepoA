using Microsoft.EntityFrameworkCore;

namespace SmsApi.Utils
{
    /// <summary>
    /// Utility class for handling optimistic concurrency conflicts with retry logic.
    /// Implements exponential backoff for distributed transactions.
    /// </summary>
    public static class ConcurrencyHelper
    {
        private static readonly int[] RetryDelaysMs = { 100, 200, 500, 1000, 2000 };
        private const int MaxRetries = 5;

        /// <summary>
        /// Executes an operation with automatic retry on concurrency conflicts.
        /// Uses exponential backoff strategy to handle race conditions.
        /// </summary>
        /// <typeparam name="T">Return type of the operation</typeparam>
        /// <param name="operation">Async operation to execute</param>
        /// <param name="operationName">Name of operation for logging</param>
        /// <param name="logger">Logger instance</param>
        /// <returns>Result of the operation</returns>
        /// <exception cref="InvalidOperationException">Thrown if max retries exceeded</exception>
        public static async Task<T> ExecuteWithRetryAsync<T>(
            Func<Task<T>> operation,
            string operationName,
            ILogger<object>? logger = null)
        {
            for (int attempt = 0; attempt < MaxRetries; attempt++)
            {
                try
                {
                    return await operation();
                }
                catch (DbUpdateConcurrencyException ex)
                {
                    if (attempt == MaxRetries - 1)
                    {
                        logger?.LogError(
                            "Concurrency conflict in {OperationName} after {MaxRetries} retries. Details: {ExceptionMessage}",
                            operationName, MaxRetries, ex.Message);
                        throw new InvalidOperationException(
                            $"Operation '{operationName}' failed due to concurrent modifications. Please try again.",
                            ex);
                    }

                    int delayMs = RetryDelaysMs[attempt];
                    logger?.LogWarning(
                        "Concurrency conflict in {OperationName} on attempt {Attempt}. Retrying after {DelayMs}ms. Error: {ExceptionMessage}",
                        operationName, attempt + 1, delayMs, ex.Message);

                    await Task.Delay(delayMs);
                }
            }

            throw new InvalidOperationException($"Operation '{operationName}' exhausted all retry attempts.");
        }

        /// <summary>
        /// Executes a void operation with automatic retry on concurrency conflicts.
        /// </summary>
        /// <param name="operation">Async operation to execute</param>
        /// <param name="operationName">Name of operation for logging</param>
        /// <param name="logger">Logger instance</param>
        public static async Task ExecuteWithRetryAsync(
            Func<Task> operation,
            string operationName,
            ILogger<object>? logger = null)
        {
            for (int attempt = 0; attempt < MaxRetries; attempt++)
            {
                try
                {
                    await operation();
                    return;
                }
                catch (DbUpdateConcurrencyException ex)
                {
                    if (attempt == MaxRetries - 1)
                    {
                        logger?.LogError(
                            "Concurrency conflict in {OperationName} after {MaxRetries} retries. Details: {ExceptionMessage}",
                            operationName, MaxRetries, ex.Message);
                        throw new InvalidOperationException(
                            $"Operation '{operationName}' failed due to concurrent modifications. Please try again.",
                            ex);
                    }

                    int delayMs = RetryDelaysMs[attempt];
                    logger?.LogWarning(
                        "Concurrency conflict in {OperationName} on attempt {Attempt}. Retrying after {DelayMs}ms. Error: {ExceptionMessage}",
                        operationName, attempt + 1, delayMs, ex.Message);

                    await Task.Delay(delayMs);
                }
            }

            throw new InvalidOperationException($"Operation '{operationName}' exhausted all retry attempts.");
        }

        /// <summary>
        /// Handles a DbUpdateConcurrencyException by reloading entity and preserving user changes.
        /// </summary>
        /// <param name="ex">The concurrency exception</param>
        /// <param name="context">The DbContext</param>
        /// <param name="logger">Logger instance</param>
        /// <returns>True if handled successfully, false if manual intervention needed</returns>
        public static async Task<bool> HandleConcurrencyExceptionAsync(
            DbUpdateConcurrencyException ex,
            DbContext context,
            ILogger<object>? logger = null)
        {
            try
            {
                foreach (var entry in ex.Entries)
                {
                    logger?.LogWarning(
                        "Concurrency conflict detected on entity {EntityType} with key {EntityKey}",
                        entry.Entity.GetType().Name,
                        entry.CurrentValues["Id"]);

                    // Reload current values from database
                    await entry.ReloadAsync();

                    // Note: RowVersion will be updated by database
                    // Application should retry with fresh data
                }

                logger?.LogInformation("Successfully reloaded conflicting entities. Application should retry operation.");
                return true;
            }
            catch (Exception reloadEx)
            {
                logger?.LogError(
                    "Failed to handle concurrency exception: {ExceptionMessage}",
                    reloadEx.Message);
                return false;
            }
        }

        /// <summary>
        /// Gets retry delay for a specific attempt number.
        /// </summary>
        /// <param name="attemptNumber">0-based attempt number</param>
        /// <returns>Delay in milliseconds</returns>
        public static int GetRetryDelay(int attemptNumber)
        {
            if (attemptNumber < 0 || attemptNumber >= RetryDelaysMs.Length)
                return RetryDelaysMs[RetryDelaysMs.Length - 1];

            return RetryDelaysMs[attemptNumber];
        }
    }
}
