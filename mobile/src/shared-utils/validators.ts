export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return /^[6-9]\d{9}$/.test(digits.slice(2));
  }
  return /^[6-9]\d{9}$/.test(digits);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidAadhaar(aadhaarNumber: string): boolean {
  const digits = aadhaarNumber.replace(/\D/g, '');
  if (digits.length !== 12) return false;
  if (/^0/.test(digits) || /^1/.test(digits)) return false;
  return /^\d{12}$/.test(digits);
}

export function isValidPAN(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase());
}

export function isValidPincode(pincode: string): boolean {
  return /^[1-9][0-9]{5}$/.test(pincode.trim());
}

export function isValidIFSC(ifsc: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase());
}

export function isValidBankAccount(account: string): boolean {
  const digits = account.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 18;
}
