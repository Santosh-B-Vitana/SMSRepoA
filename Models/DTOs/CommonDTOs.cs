using System;
using System.Collections.Generic;

namespace SmsApi.Models.DTOs
{
    /// <summary>
    /// Common paginated response wrapper for list endpoints
    /// </summary>
    /// <typeparam name="T">The type of items in the list</typeparam>
    public class PaginatedResponse<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }
}
