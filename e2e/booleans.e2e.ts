import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './axe';

test.describe('boolean controls page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/booleans');
    await expect(page.getByRole('heading', { name: 'Boolean controls' })).toBeVisible();
  });

  const terms = (page: import('@playwright/test').Page) =>
    page.getByRole('checkbox', { name: /I accept the terms/ });
  const newsletter = (page: import('@playwright/test').Page) =>
    page.getByRole('switch', { name: 'Newsletter' });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    await expectNoAxeViolations(page);
  });

  test('has no violations with the error shown', async ({ page }) => {
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText("must have required property 'terms'")).toBeVisible();
    await expect(terms(page)).toHaveAttribute('aria-invalid', 'true');
    await expectNoAxeViolations(page);
  });

  test('writes booleans to the data', async ({ page }) => {
    await terms(page).click();
    await expect(terms(page)).toBeChecked();
    await newsletter(page).click();
    await expect(page.locator('pre')).toContainText('"terms": true');
    await expect(page.locator('pre')).toContainText('"newsletter": true');
  });

  test('is operable with the keyboard', async ({ page }) => {
    await terms(page).focus();
    await page.keyboard.press('Space');
    await expect(terms(page)).toBeChecked();
    await page.keyboard.press('Tab');
    await expect(newsletter(page)).toBeFocused();
    await page.keyboard.press('Space');
    await expect(newsletter(page)).toBeChecked();
  });

  test('enables a control when its rule condition holds', async ({ page }) => {
    const beta = page.getByRole('checkbox', { name: 'Beta features' });
    await expect(beta).toBeDisabled();
    await newsletter(page).click();
    await expect(beta).toBeEnabled();
  });

  test('keeps a read-only checkbox focusable but not changeable', async ({ page }) => {
    const confirmed = page.getByRole('checkbox', { name: 'Confirmed' });
    await expect(confirmed).toHaveAttribute('aria-readonly', 'true');
    await confirmed.focus();
    await expect(confirmed).toBeFocused();
    await page.keyboard.press('Space');
    await confirmed.click({ force: true });
    await expect(confirmed).toBeChecked();
    await expect(page.locator('pre')).toContainText('"confirmed": true');
  });

  test('saves once the terms are accepted', async ({ page }) => {
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveCount(0);
    await terms(page).click();
    await expect(terms(page)).toBeChecked();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveText('Saved.');
  });
});
