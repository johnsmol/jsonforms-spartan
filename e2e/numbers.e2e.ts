import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './axe';

test.describe('number controls and read-only page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/numbers');
    await expect(
      page.getByRole('heading', { name: 'Number controls and read-only' }),
    ).toBeVisible();
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    await expectNoAxeViolations(page);
  });

  test('has no violations with errors shown', async ({ page }) => {
    await page.getByLabel('Price').fill('2000');
    await page.getByLabel('Price').blur();
    await expect(page.getByText('must be <= 1000')).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('writes numbers to the data and removes them when cleared', async ({ page }) => {
    await page.getByLabel('Quantity').fill('3');
    await page.getByLabel('Price').fill('9.5');
    await expect(page.locator('pre')).toContainText('"quantity": 3');
    await expect(page.locator('pre')).toContainText('"price": 9.5');
    await page.getByLabel('Quantity').fill('');
    await expect(page.locator('pre')).not.toContainText('"quantity"');
  });

  test('keeps read-only fields focusable but not editable', async ({ page }) => {
    for (const name of ['Reference', 'Locked count']) {
      const field = page.getByLabel(name);
      await expect(field).toHaveAttribute('readonly', '');
      await expect(field).toBeEnabled();
      await field.focus();
      await expect(field).toBeFocused();
    }
    await page.getByLabel('Reference').press('7');
    await expect(page.getByLabel('Reference')).toHaveValue('42');
  });

  test('makes every field read-only from the form-level switch', async ({ page }) => {
    await page.getByLabel('Make the whole form read-only').check();
    await expect(page.getByLabel('Price')).toHaveAttribute('readonly', '');
    await expect(page.getByLabel('Quantity')).toHaveAttribute('readonly', '');
    await expectNoAxeViolations(page);
  });
});
