import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './axe';

test.describe('text controls and rules page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Text controls and rules' })).toBeVisible();
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    await expectNoAxeViolations(page);
  });

  test('has no violations with errors shown and every field visible', async ({ page }) => {
    await page.getByLabel('Company').fill('ACME');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText("must have required property 'name'")).toBeVisible();
    await expect(page.getByLabel('VAT number')).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('writes typed values to the data, without empty ones', async ({ page }) => {
    await page.getByLabel('Name').fill('Ann');
    await page.getByLabel('Email').fill('ann@example.org');
    await expect(page.locator('pre')).toContainText('"name": "Ann"');
    await page.getByLabel('Name').fill('');
    await expect(page.locator('pre')).not.toContainText('"name"');
  });

  test('enables a field when its rule condition holds', async ({ page }) => {
    const referral = page.getByLabel('How did you hear about us?');
    await expect(referral).toBeDisabled();
    await page.getByLabel('Name').fill('Ann');
    await expect(referral).toBeEnabled();
  });

  test('shows a field when its rule condition holds', async ({ page }) => {
    await expect(page.getByLabel('VAT number')).toHaveCount(0);
    await page.getByLabel('Company').fill('ACME');
    await expect(page.getByLabel('VAT number')).toBeVisible();
  });

  test('shows an error after leaving an invalid field, linked to the input', async ({ page }) => {
    const email = page.getByLabel('Email');
    await email.fill('not-an-email');
    await email.blur();
    const error = page.getByText('must match format "email"');
    await expect(error).toBeVisible();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    const errorId = await page.locator('hlm-field-error:visible').first().getAttribute('id');
    const describedBy = (await email.getAttribute('aria-describedby'))?.split(' ') ?? [];
    expect(describedBy).toContain(errorId);
  });

  test('saves only valid data', async ({ page }) => {
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveCount(0);
    await page.getByLabel('Name').fill('Ann');
    await page.getByLabel('Email').fill('ann@example.org');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveText('Saved.');
  });

  test('is operable with the keyboard in document order', async ({ page }) => {
    await page.getByLabel('Name').focus();
    await page.keyboard.type('Ann');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Email')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('How did you hear about us?')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Company')).toBeFocused();
  });
});
