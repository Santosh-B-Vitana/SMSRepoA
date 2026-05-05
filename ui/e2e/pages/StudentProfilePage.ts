/**
 * StudentProfilePage — Page Object Model
 * The /students/:id full profile page with all tabs.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class StudentProfilePage {
  readonly page: Page;
  readonly tabs: {
    attendance: Locator;
    academic: Locator;
    siblings: Locator;
    fee: Locator;
    transport: Locator;
    hostel: Locator;
    health: Locator;
    visitors: Locator;
    communication: Locator;
    documents: Locator;
  };

  constructor(page: Page) {
    this.page = page;
    this.tabs = {
      attendance: page.getByRole('tab', { name: /attendance/i }),
      academic: page.getByRole('tab', { name: /academic/i }),
      siblings: page.getByRole('tab', { name: /sibling/i }),
      fee: page.getByRole('tab', { name: /fee/i }),
      transport: page.getByRole('tab', { name: /transport/i }),
      hostel: page.getByRole('tab', { name: /hostel/i }),
      health: page.getByRole('tab', { name: /health/i }),
      visitors: page.getByRole('tab', { name: /visitor/i }),
      communication: page.getByRole('tab', { name: /communication/i }),
      documents: page.getByRole('tab', { name: /document/i }),
    };
  }

  /** Wait for the profile page to finish loading */
  async waitForLoad() {
    await this.page.waitForSelector('h1, [class*="heading"]', { timeout: 15_000 });
    // The profile card with student name should be visible
    await this.page.waitForSelector('[class*="card"], .card', { timeout: 10_000 });
  }

  /** Verify the page shows the correct student name */
  async expectStudentName(name: string) {
    await expect(
      this.page.getByText(name, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });
  }

  /** Expect the student's class/section to be visible */
  async expectClassSection(cls: string, section: string) {
    await expect(
      this.page.locator('text=' + cls + '-' + section)
        .or(this.page.locator(`text=${cls}/${section}`))
        .first()
    ).toBeVisible({ timeout: 5_000 });
  }

  /** Click a profile tab and wait for content to render */
  async openTab(tabName: keyof typeof this.tabs) {
    const tab = this.tabs[tabName];
    await tab.waitFor({ state: 'visible', timeout: 10_000 });
    await tab.click();
    await this.page.waitForTimeout(600); // content animation
  }

  /** Expect tab content panel to be visible (non-empty) */
  async expectTabContentVisible(panelLabel?: string) {
    if (panelLabel) {
      await expect(
        this.page.locator('[role="tabpanel"]').filter({ hasText: panelLabel }).first()
      ).toBeVisible({ timeout: 8_000 });
    } else {
      await expect(
        // Radix sets data-state="active" on the visible tabpanel
        this.page.locator('[role="tabpanel"][data-state="active"]').first()
      ).toBeVisible({ timeout: 8_000 });
    }
  }

  /** Navigate back to students list */
  async goBack() {
    const backBtn = this.page.getByRole('button', { name: /back/i }).first();
    await backBtn.click();
    await this.page.waitForURL('/students', { timeout: 10_000 });
  }

  /** Get the student's current URL id */
  async getStudentId(): Promise<string> {
    const url = this.page.url();
    const match = url.match(/\/students\/([^/]+)/);
    return match?.[1] ?? '';
  }
}
