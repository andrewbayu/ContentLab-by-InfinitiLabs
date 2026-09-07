import { test, expect } from '@playwright/test';
for (const width of [1440, 375]) {
  test(`focus queue works at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    // This visual fixture uses synthetic data only; external requests are blocked.
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/tests/browser/preview.html');
    const panel = page.getByRole('region', { name: 'Less noise. More progress.' });
    await expect(panel).toBeVisible();
    await expect(panel.locator('.focus-row')).toHaveCount(5);
    const create = page.getByRole('button', { name: 'Create Task' });
    const bounds = await create.boundingBox();
    expect(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width).toBe(true);
    await page.screenshot({ path: `test-results/focus-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await panel.getByRole('button', { name: /^Overdue/ }).click();
    await expect(panel.locator('.focus-row')).toHaveCount(1);
    const row = panel.locator('.focus-row').first();
    await row.focus(); await page.keyboard.press('Enter');
    await expect(page.getByText('Opened: The story behind your next transformation')).toBeVisible();
    await panel.getByRole('searchbox').fill('does not exist');
    await expect(panel.getByText('No tasks match this view.')).toBeVisible();
    await panel.getByRole('button', { name: 'Reset filters' }).click();
    await expect(panel.locator('.focus-row')).toHaveCount(5);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await row.evaluate(el => parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThanOrEqual(0.001);
    expect(errors).toEqual([]);
  });
}
