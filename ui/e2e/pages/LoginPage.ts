/**
 * LoginPage — Page Object Model
 * Encapsulates all interactions with the Login page (/login).
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
    this.passwordInput = page.locator('input[type="password"]').first();
    this.submitButton = page.getByRole('button', { name: /sign in|log in|login/i }).first();
    this.errorMessage = page.locator('[role="alert"], .text-destructive, .text-red-500').first();
  }

  async goto() {
    await this.page.goto('/login');
    await this.emailInput.waitFor({ state: 'visible', timeout: 15_000 });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async loginAndWaitForDashboard(email: string, password: string) {
    await this.login(email, password);
    await this.page.waitForURL(/dashboard|admin/, { timeout: 20_000 });
  }
}
