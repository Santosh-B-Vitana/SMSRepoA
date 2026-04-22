using System;

namespace SmsApi.Utils
{
    /// <summary>
    /// Helper class for masking sensitive data in API responses
    /// Ensures PII (Personally Identifiable Information) is protected
    /// </summary>
    public static class SensitiveDataHelper
    {
        /// <summary>
        /// Masks bank account number: XXXX-XXXX-XXXX-1234
        /// </summary>
        public static string? MaskBankAccount(string? accountNumber)
        {
            if (string.IsNullOrEmpty(accountNumber))
                return null;

            if (accountNumber.Length < 4)
                return "XXXX";

            return $"XXXX-XXXX-XXXX-{accountNumber.Substring(accountNumber.Length - 4)}";
        }

        /// <summary>
        /// Masks PAN (Permanent Account Number): XXXX-XXXX-1234
        /// </summary>
        public static string? MaskPan(string? pan)
        {
            if (string.IsNullOrEmpty(pan))
                return null;

            if (pan.Length < 4)
                return "XXXX";

            return $"XXXX-XXXX-{pan.Substring(pan.Length - 4)}";
        }

        /// <summary>
        /// Masks Aadhar number: XXXX-XXXX-XXXX-1234
        /// </summary>
        public static string? MaskAadhar(string? aadhar)
        {
            if (string.IsNullOrEmpty(aadhar))
                return null;

            if (aadhar.Length < 4)
                return "XXXX";

            return $"XXXX-XXXX-XXXX-{aadhar.Substring(aadhar.Length - 4)}";
        }

        /// <summary>
        /// Masks ESI number: XXXX-XXXX-XXXX-1234
        /// </summary>
        public static string? MaskEsi(string? esi)
        {
            if (string.IsNullOrEmpty(esi))
                return null;

            if (esi.Length < 4)
                return "XXXX";

            return $"XXXX-XXXX-XXXX-{esi.Substring(esi.Length - 4)}";
        }

        /// <summary>
        /// Masks phone number: +91-XXXX-XXXXX
        /// </summary>
        public static string? MaskPhone(string? phone)
        {
            if (string.IsNullOrEmpty(phone))
                return null;

            if (phone.Length < 4)
                return "XXXX";

            // If starts with +91
            if (phone.StartsWith("+91"))
                return $"+91-XXXX-{phone.Substring(phone.Length - 5)}";

            // Otherwise last 5 digits
            return $"XXXX-{phone.Substring(phone.Length - 5)}";
        }

        /// <summary>
        /// Masks email: f***@example.com
        /// </summary>
        public static string? MaskEmail(string? email)
        {
            if (string.IsNullOrEmpty(email))
                return null;

            var parts = email.Split('@');
            if (parts.Length != 2)
                return email;

            var name = parts[0];
            var domain = parts[1];

            if (name.Length <= 2)
                return $"*@{domain}";

            return $"{name[0]}***@{domain}";
        }

        /// <summary>
        /// Masks passport number: XXXX-XXXX-1234
        /// </summary>
        public static string? MaskPassport(string? passport)
        {
            if (string.IsNullOrEmpty(passport))
                return null;

            if (passport.Length < 4)
                return "XXXX";

            return $"XXXX-XXXX-{passport.Substring(passport.Length - 4)}";
        }
    }
}
