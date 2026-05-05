/**
 * StudentFormPage — Page Object Model
 * Wraps the multi-tab Add/Edit Student form dialog.
 *
 * The form has 6 tabs: Basic · ID · Contact · Guardian · Academic · Medical
 */
import { type Page, type Locator, expect } from '@playwright/test';

export interface StudentFormData {
  // Basic
  name: string;
  preferredName?: string;
  admissionNumber?: string;
  dateOfBirth: string;
  placeOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  nationality?: string;
  classStandard: string;   // e.g. "10"
  section: string;         // e.g. "A"
  rollNumber: string;
  admissionDate: string;
  category?: 'General' | 'OBC' | 'SC' | 'ST';
  status?: 'active' | 'inactive';

  // Identification (ID tab)
  aadharNumber?: string;
  panNumber?: string;
  passportNumber?: string;

  // Contact tab
  address?: string;
  primaryPhone?: string;
  email?: string;

  // Guardian tab
  guardianName?: string;
  guardianPhone?: string;
  guardianOccupation?: string;
  guardianEmail?: string;

  // Academic tab
  previousSchool?: string;
  previousClass?: string;
  transferReason?: string;

  // Medical tab
  bloodGroup?: string;
  allergies?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export class StudentFormPage {
  readonly page: Page;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('[role="dialog"]').first();
  }

  // ── Tab navigation ────────────────────────────────────────────────────────

  async clickTab(tabName: 'Basic' | 'ID' | 'Contact' | 'Guardian' | 'Academic' | 'Medical') {
    const tab = this.dialog
      .getByRole('tab', { name: new RegExp(tabName, 'i') })
      .first();
    await tab.waitFor({ state: 'visible', timeout: 5_000 });
    await tab.click();
    await this.page.waitForTimeout(300); // animation
  }

  // ── Field helpers ─────────────────────────────────────────────────────────

  private field(id: string) {
    return this.dialog.locator(`#${id}, [name="${id}"]`).first();
  }

  private async fillField(id: string, value: string) {
    const el = this.field(id);
    await el.waitFor({ state: 'visible', timeout: 5_000 });
    await el.clear();
    await el.fill(value);
  }

  private async selectValue(triggerId: string, value: string) {
    // Find the Select trigger by looking near a label or by id on the trigger
    const trigger = this.dialog
      .locator(`[id="${triggerId}"], button[role="combobox"]`)
      .filter({ has: this.page.locator(`[data-for="${triggerId}"]`) })
      .or(
        this.dialog.locator('button[role="combobox"]').nth(
          ['gender', 'class', 'section', 'category', 'status', 'bloodGroup'].indexOf(triggerId)
        )
      )
      .first();

    // Robust: find the SelectTrigger closest to a Label that matches triggerId text
    const labelledTrigger = this.dialog
      .locator(`label[for="${triggerId}"] + div button, label[for="${triggerId}"] ~ div button`)
      .first();

    const btn = (await labelledTrigger.isVisible({ timeout: 2_000 }).catch(() => false))
      ? labelledTrigger
      : this.dialog.locator(`button[role="combobox"]`).filter({ hasText: /.+/ }).nth(
          ['gender', 'class', 'section', 'category', 'bloodGroup', 'status'].indexOf(triggerId)
        );

    await btn.click();
    // Wait for the dropdown content
    await this.page.waitForSelector('[role="listbox"], [data-radix-select-content]', { timeout: 5_000 });
    // Click the matching option
    const option = this.page
      .locator('[role="option"]')
      .filter({ hasText: new RegExp(`^${value}$`, 'i') })
      .first();
    await option.click();
    await this.page.waitForTimeout(200);
  }

  /** Select a Radix UI Select by finding its trigger near a label text */
  async selectByLabel(labelText: string, optionValue: string) {
    // Find label element
    const label = this.dialog.locator('label').filter({ hasText: new RegExp(labelText, 'i') }).first();
    await label.waitFor({ state: 'visible', timeout: 5_000 });

    // Navigate to the nearest select trigger (sibling div contains button[role=combobox])
    const trigger = this.dialog
      .locator('button[role="combobox"]')
      .filter({ has: this.page.locator('span') })
      .nth(
        // Count labels to find which combobox to click
        await this.dialog.locator('label').filter({ hasText: new RegExp(labelText, 'i') }).count() - 1
      );

    // Better: use locator chaining from label to its nearby combobox
    const selectTrigger = label
      .locator('xpath=following-sibling::div//button[@role="combobox"] | xpath=../div//button[@role="combobox"]')
      .first();

    const isVisible = await selectTrigger.isVisible({ timeout: 2_000 }).catch(() => false);

    if (isVisible) {
      await selectTrigger.click();
    } else {
      // Fallback: click the button closest to the label
      const wrapper = this.dialog.locator('div').filter({ has: label }).last();
      const combobox = wrapper.locator('button[role="combobox"]').first();
      await combobox.click();
    }

    await this.page.waitForSelector('[role="listbox"], [data-radix-select-content]', { timeout: 5_000 });
    await this.page
      .locator('[role="option"]')
      .filter({ hasText: new RegExp(`^${optionValue}$`, 'i') })
      .first()
      .click();
    await this.page.waitForTimeout(200);
  }

  // ── BASIC tab ────────────────────────────────────────────────────────────

  async fillBasicTab(data: StudentFormData) {
    await this.fillField('name', data.name);
    if (data.preferredName) await this.fillField('preferredName', data.preferredName);
    if (data.admissionNumber) await this.fillField('admissionNumber', data.admissionNumber);
    await this.fillField('dateOfBirth', data.dateOfBirth);
    if (data.placeOfBirth) await this.fillField('placeOfBirth', data.placeOfBirth);
    if (data.nationality) await this.fillField('nationality', data.nationality);

    // Gender select
    if (data.gender) {
      await this.selectByLabel('Gender', data.gender);
    }

    // Class select — wait for classes to load
    await this.page.waitForTimeout(1_000);
    if (data.classStandard) {
      await this.selectByLabel('Class', data.classStandard);
      await this.page.waitForTimeout(500); // section depends on class
    }

    // Section select
    if (data.section) {
      await this.selectByLabel('Section', data.section);
    }

    await this.fillField('rollNumber', data.rollNumber);
    await this.fillField('admissionDate', data.admissionDate);

    // Category select
    if (data.category) {
      await this.selectByLabel('Category', data.category);
    }
  }

  // ── IDENTIFICATION tab ────────────────────────────────────────────────────

  async fillIdentificationTab(data: StudentFormData) {
    await this.clickTab('ID');
    if (data.aadharNumber) await this.fillField('aadharNumber', data.aadharNumber);
    if (data.panNumber) await this.fillField('panNumber', data.panNumber);
    if (data.passportNumber) await this.fillField('passportNumber', data.passportNumber);
  }

  // ── CONTACT tab ──────────────────────────────────────────────────────────

  async fillContactTab(data: StudentFormData) {
    await this.clickTab('Contact');
    if (data.address) await this.fillField('address', data.address);
    if (data.primaryPhone) await this.fillField('primaryPhone', data.primaryPhone);
    if (data.email) await this.fillField('email', data.email);
  }

  // ── GUARDIAN tab ─────────────────────────────────────────────────────────

  async fillGuardianTab(data: StudentFormData) {
    await this.clickTab('Guardian');
    if (data.guardianName) await this.fillField('guardianName', data.guardianName);
    if (data.guardianPhone) await this.fillField('guardianPhone', data.guardianPhone);
    if (data.guardianOccupation) await this.fillField('guardianOccupation', data.guardianOccupation);
    if (data.guardianEmail) await this.fillField('guardianEmail', data.guardianEmail);
  }

  // ── ACADEMIC tab ─────────────────────────────────────────────────────────

  async fillAcademicTab(data: StudentFormData) {
    await this.clickTab('Academic');
    if (data.previousSchool) await this.fillField('previousSchool', data.previousSchool);
    if (data.previousClass) await this.fillField('previousClass', data.previousClass);
    if (data.transferReason) await this.fillField('transferReason', data.transferReason);
  }

  // ── MEDICAL tab ──────────────────────────────────────────────────────────

  async fillMedicalTab(data: StudentFormData) {
    await this.clickTab('Medical');
    if (data.bloodGroup) {
      await this.selectByLabel('Blood Group', data.bloodGroup);
    }
    if (data.allergies) await this.fillField('allergies', data.allergies);
    if (data.emergencyContact) await this.fillField('emergencyContact', data.emergencyContact);
    if (data.emergencyPhone) await this.fillField('emergencyPhone', data.emergencyPhone);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async submit() {
    const submitBtn = this.dialog
      .getByRole('button', { name: /add student|save|submit|create/i })
      .first();
    await submitBtn.waitFor({ state: 'visible', timeout: 5_000 });
    await submitBtn.click();
  }

  async waitForSuccess() {
    // Toast "Student added successfully" or dialog closes
    await expect(
      this.page.locator('[data-sonner-toast], [role="status"], [class*="toast"]')
        .filter({ hasText: /success|added|saved/i })
        .first()
    ).toBeVisible({ timeout: 15_000 });
  }

  async waitForDialogClose() {
    await expect(this.dialog).not.toBeVisible({ timeout: 15_000 });
  }

  // ── Fill ALL tabs ─────────────────────────────────────────────────────────

  async fillAll(data: StudentFormData) {
    // Basic tab is open by default
    await this.clickTab('Basic');
    await this.fillBasicTab(data);
    await this.fillIdentificationTab(data);
    await this.fillContactTab(data);
    await this.fillGuardianTab(data);
    await this.fillAcademicTab(data);
    await this.fillMedicalTab(data);
    // Return to Basic before submitting
    await this.clickTab('Basic');
  }
}
