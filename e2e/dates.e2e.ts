import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations } from './axe';

test.describe('date controls page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dates');
    await expect(page.getByRole('heading', { name: 'Date controls' })).toBeVisible();
  });

  const birth = (page: Page) => page.getByRole('button', { name: /Birth date/ });
  const pickDay = (page: Page, day: string) =>
    page.getByRole('dialog').getByRole('gridcell', { name: day, exact: true }).first().click();

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    await expectNoAxeViolations(page);
  });

  test('has no violations with the error shown', async ({ page }) => {
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText("must have required property 'birth'")).toBeVisible();
    await expect(birth(page)).toHaveAttribute('aria-invalid', 'true');
    await expectNoAxeViolations(page);
  });

  test('has no violations with the calendar open, and no error yet', async ({ page }) => {
    await birth(page).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText("must have required property 'birth'")).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test('writes the picked day as a YYYY-MM-DD string and closes', async ({ page }) => {
    await birth(page).click();
    await pickDay(page, '15');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('pre')).toContainText(/"birth": "\d{4}-\d{2}-15"/);
  });

  test('is operable with the keyboard', async ({ page }) => {
    await birth(page).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    // Focus starts on "previous month"; "next month" and the focused day follow.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(birth(page)).toBeFocused();
    await expect(page.locator('pre')).toContainText(/"birth": "\d{4}-\d{2}-\d{2}"/);
  });

  test('removes the date when cleared', async ({ page }) => {
    await birth(page).click();
    await pickDay(page, '15');
    await birth(page).click();
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.locator('pre')).not.toContainText('"birth"');
  });

  test('shows a read-only date that cannot be edited', async ({ page }) => {
    const signed = page.getByRole('textbox', { name: 'Signed on' });
    await expect(signed).toHaveAttribute('readonly', '');
    await expect(signed).toHaveValue(/2026/);
  });

  test('saves once the date is chosen', async ({ page }) => {
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveCount(0);
    await birth(page).click();
    await pickDay(page, '15');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveText('Saved.');
  });
});
