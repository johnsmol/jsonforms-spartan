import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './axe';

test.describe('enum controls page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/enums');
    await expect(page.getByRole('heading', { name: 'Enum controls' })).toBeVisible();
  });

  const country = (page: import('@playwright/test').Page) =>
    page.getByRole('combobox', { name: /Country/ });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    await expectNoAxeViolations(page);
  });

  test('has no violations with the error shown', async ({ page }) => {
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText("must have required property 'country'")).toBeVisible();
    await expect(country(page)).toHaveAttribute('aria-invalid', 'true');
    await expectNoAxeViolations(page);
  });

  test('writes the chosen values to the data, keeping their types', async ({ page }) => {
    await country(page).selectOption({ label: 'France' });
    await page.getByRole('combobox', { name: 'Plan' }).selectOption({ label: 'Pro' });
    await page.getByRole('combobox', { name: 'Priority' }).selectOption({ label: '2' });
    await page.locator('label', { hasText: 'large' }).click();
    const data = page.locator('pre');
    await expect(data).toContainText('"country": "France"');
    await expect(data).toContainText('"plan": "pro"');
    await expect(data).toContainText('"priority": 2');
    await expect(data).toContainText('"size": "large"');
  });

  test('is operable with the keyboard', async ({ page }) => {
    await country(page).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('pre')).toContainText('"country": "Italy"');
    await page.getByRole('radio', { name: 'small' }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: 'medium' })).toBeChecked();
    await expect(page.locator('pre')).toContainText('"size": "medium"');
  });

  test('keeps a read-only select focusable but not changeable', async ({ page }) => {
    const region = page.getByRole('combobox', { name: 'Region' });
    await expect(region).toHaveAttribute('aria-readonly', 'true');
    await region.focus();
    await expect(region).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(region).toHaveValue('0');
    await expect(page.locator('pre')).toContainText('"region": "eu"');
  });

  test('saves once the required country is chosen', async ({ page }) => {
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveCount(0);
    await country(page).selectOption({ label: 'Spain' });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveText('Saved.');
  });
});
