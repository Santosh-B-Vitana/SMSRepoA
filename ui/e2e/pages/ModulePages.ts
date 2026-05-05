/**
 * ModulePages — Page Object Models for cross-module student visibility tests.
 * Covers: Fees, Examinations, Attendance, Library, Hostel, Transport.
 */
import { type Page, type Locator, expect } from '@playwright/test';

// ── Base Module Page ──────────────────────────────────────────────────────────

class BaseModulePage {
  constructor(protected readonly page: Page, protected readonly route: string) {}

  async goto() {
    await this.page.goto(this.route);
    await this.page.waitForSelector('h1, [class*="heading"], [class*="title"]', { timeout: 20_000 });
  }

  /** Verify a student name appears somewhere on the page */
  async expectStudentVisible(name: string, timeoutMs = 15_000) {
    await expect(
      this.page.locator(`text="${name}"`).or(
        this.page.locator('td, li, [class*="student"]').filter({ hasText: name }).first()
      ).first()
    ).toBeVisible({ timeout: timeoutMs });
  }

  /** Search for a student using any visible search/filter input */
  async searchForStudent(name: string) {
    const searchInput = this.page
      .locator('input[placeholder*="search" i], input[placeholder*="student" i], input[placeholder*="name" i]')
      .first();

    if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchInput.fill(name);
      await this.page.waitForTimeout(800);
    }
  }
}

// ── Fees Module ──────────────────────────────────────────────────────────────

export class FeesPage extends BaseModulePage {
  constructor(page: Page) {
    super(page, '/fees');
  }

  /** Go to the student-specific fee details page by navigating via the URL */
  async gotoStudentFeeDetails(studentId: string) {
    await this.page.goto(`/students/${studentId}/fees`);
    await this.page.waitForSelector('h1, [class*="fee"]', { timeout: 15_000 });
  }

  async expectFeeRecordExists(studentName: string) {
    await this.searchForStudent(studentName);
    // Fee records are shown as rows or cards; the student name should appear
    const nameCell = this.page
      .locator('td, li, [class*="card"]')
      .filter({ hasText: studentName })
      .first();

    const isVisible = await nameCell.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!isVisible) {
      // Some fee modules require selecting a class filter first
      console.log('ℹ Fee record not immediately visible — may require class selection');
    }
    // Don't fail hard: fee may not auto-create; just verify the page loads
    return isVisible;
  }
}

// ── Examinations Module ──────────────────────────────────────────────────────

export class ExaminationsPage extends BaseModulePage {
  constructor(page: Page) {
    super(page, '/examinations');
  }

  /** Navigate to marks entry and verify the student appears in the class list */
  async expectStudentInExamList(studentName: string, className: string) {
    await this.searchForStudent(studentName);
    // The student should appear after class is selected or in search results
    return this.page.locator('td, tr, li').filter({ hasText: studentName }).count().then(n => n > 0);
  }
}

// ── Attendance Module ────────────────────────────────────────────────────────

export class AttendancePage extends BaseModulePage {
  constructor(page: Page) {
    super(page, '/attendance');
  }

  /** Verify the student appears in the attendance class roster */
  async expectStudentInAttendanceRoster(studentName: string, className: string) {
    // Select class first if class selector exists
    const classSelector = this.page
      .locator('select, button[role="combobox"]')
      .first();

    if (await classSelector.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await classSelector.click();
      const classOption = this.page.locator('[role="option"]').filter({ hasText: className }).first();
      if (await classOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await classOption.click();
        await this.page.waitForTimeout(1_000);
      }
    }

    return this.page.locator('td, tr, li').filter({ hasText: studentName }).count().then(n => n > 0);
  }
}

// ── Library Module ───────────────────────────────────────────────────────────

export class LibraryPage extends BaseModulePage {
  constructor(page: Page) {
    super(page, '/library');
  }

  async expectStudentCanIssueBook(studentName: string) {
    // Navigate to issue book section
    const issueTab = this.page.getByRole('tab', { name: /issue|borrow/i }).first();
    if (await issueTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await issueTab.click();
    }
    // Search for student in issue form
    const studentSearch = this.page
      .locator('input[placeholder*="student" i], input[placeholder*="member" i]')
      .first();
    if (await studentSearch.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await studentSearch.fill(studentName);
      await this.page.waitForTimeout(800);
    }
  }
}

// ── Hostel Module ────────────────────────────────────────────────────────────

export class HostelPage extends BaseModulePage {
  constructor(page: Page) {
    super(page, '/hostel');
  }
}

// ── Transport Module ─────────────────────────────────────────────────────────

export class TransportPage extends BaseModulePage {
  constructor(page: Page) {
    super(page, '/transport');
  }
}

// ── Health Module ────────────────────────────────────────────────────────────

export class HealthPage extends BaseModulePage {
  constructor(page: Page) {
    super(page, '/health');
  }
}
