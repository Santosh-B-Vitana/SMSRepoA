"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidPhone = isValidPhone;
exports.isValidEmail = isValidEmail;
exports.isValidAadhaar = isValidAadhaar;
exports.isValidPAN = isValidPAN;
exports.isValidPincode = isValidPincode;
exports.isValidIFSC = isValidIFSC;
exports.isValidBankAccount = isValidBankAccount;
function isValidPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length === 12) {
        return /^[6-9]\d{9}$/.test(digits.slice(2));
    }
    return /^[6-9]\d{9}$/.test(digits);
}
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
function isValidAadhaar(aadhaarNumber) {
    const digits = aadhaarNumber.replace(/\D/g, '');
    if (digits.length !== 12)
        return false;
    if (/^0/.test(digits) || /^1/.test(digits))
        return false;
    return /^\d{12}$/.test(digits);
}
function isValidPAN(pan) {
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase());
}
function isValidPincode(pincode) {
    return /^[1-9][0-9]{5}$/.test(pincode.trim());
}
function isValidIFSC(ifsc) {
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase());
}
function isValidBankAccount(account) {
    const digits = account.replace(/\D/g, '');
    return digits.length >= 9 && digits.length <= 18;
}
//# sourceMappingURL=validators.js.map