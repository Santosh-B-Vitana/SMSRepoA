"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatINR = formatINR;
exports.formatDate = formatDate;
exports.formatDateIST = formatDateIST;
exports.formatAttendancePercent = formatAttendancePercent;
exports.maskAadhaar = maskAadhaar;
exports.formatAcademicYear = formatAcademicYear;
exports.formatPhoneIN = formatPhoneIN;
exports.formatFileSize = formatFileSize;
exports.formatRelativeTime = formatRelativeTime;
exports.semverLt = semverLt;
const constants_1 = require("./constants");
function formatINR(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}
function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: constants_1.IST_TIMEZONE,
    });
}
function formatDateIST(iso) {
    return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: constants_1.IST_TIMEZONE,
    });
}
function formatAttendancePercent(present, total) {
    if (total === 0)
        return '0%';
    const percent = (present / total) * 100;
    return `${percent.toFixed(1)}%`;
}
function maskAadhaar(aadhaarNumber) {
    const digits = aadhaarNumber.replace(/\D/g, '');
    if (digits.length !== 12)
        return aadhaarNumber;
    return `XXXX-XXXX-${digits.slice(-4)}`;
}
function formatAcademicYear(year) {
    const parts = year.split('-');
    if (parts.length === 2) {
        return `${parts[0]}-${parts[1].slice(-2)}`;
    }
    return year;
}
function formatPhoneIN(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
        return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return phone;
}
function formatFileSize(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function formatRelativeTime(iso) {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffSec < 60)
        return 'just now';
    if (diffMin < 60)
        return `${diffMin}m ago`;
    if (diffHour < 24)
        return `${diffHour}h ago`;
    if (diffDay < 7)
        return `${diffDay}d ago`;
    return formatDate(iso);
}
/**
 * Returns true if semantic version `a` is strictly less than `b`.
 * Supports MAJOR.MINOR.PATCH format (e.g. "1.2.3").
 */
function semverLt(a, b) {
    const parse = (v) => {
        const parts = v.split('.').map(Number);
        return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
    };
    const [aMaj, aMin, aPatch] = parse(a);
    const [bMaj, bMin, bPatch] = parse(b);
    if (aMaj !== bMaj)
        return aMaj < bMaj;
    if (aMin !== bMin)
        return aMin < bMin;
    return aPatch < bPatch;
}
//# sourceMappingURL=formatters.js.map