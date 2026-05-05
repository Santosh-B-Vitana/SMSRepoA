/**
 * StudentsPage — Page Object Model
 * Encapsulates the /students route and the Add Student dialog/form.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class StudentsPage {
  readonly page: Page;
  readonly addStudentButton: Locator;
  readonly studentListRows: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    // "Add Student" or "Add" button — tries multiple selectors
    this.addStudentButton = page
      .getByRole('button', { name: /add student|add new student/i })
      .or(page.locator('button').filter({ hasText: /^add$/i }))
      .first();
    this.studentListRows = page.locator('[data-testid="student-row"], table tbody tr, .student-row');
    // Target the local filter input in the Filters & Search card, not the global top-bar search
    this.searchInput = page.locator('input[placeholder*="name or roll" i], input[placeholder*="name" i][placeholder*="roll" i]').first();
  }

  async goto() {
    await this.page.goto('/students');
    // Wait for page heading
    await this.page.waitForSelector('h1, [class*="heading"]', { timeout: 15_000 });
  }

  /** Open the Add Student dialog */
  async openAddStudentDialog() {
    await this.addStudentButton.waitFor({ state: 'visible', timeout: 10_000 });
    await this.addStudentButton.click();
    // Wait for dialog to appear
    await this.page.waitForSelector('[role="dialog"]', { timeout: 10_000 });
  }

  /** Search for a student by name and return matching rows */
  async searchStudent(name: string) {
    if (await this.searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.searchInput.fill(name);
      await this.page.waitForTimeout(800); // debounce
    }
  }

  /** Click on a student row by name and navigate to their profile */
  async clickStudentByName(name: string) {
    const row = this.page
      .locator('tr, li, [data-testid*="student"]')
      .filter({ hasText: name })
      .first();
    await row.waitFor({ state: 'visible', timeout: 10_000 });
    // Some implementations have a "View" link, others click the row itself
    const viewLink = row.getByRole('link', { name: /view|profile/i }).or(
      row.locator('a[href*="/students/"]')
    ).first();

    if (await viewLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewLink.click();
    } else {
      await row.click();
    }
  }

  /** Verify the student appears in the list */
  async expectStudentInList(name: string) {
    // StudentList renders a <table><tbody><tr> — match any element containing the name
    await expect(
      this.page.locator('tr, td, [role="row"], [role="cell"]').filter({ hasText: name }).first()
    ).toBeVisible({ timeout: 15_000 });
  }
}
