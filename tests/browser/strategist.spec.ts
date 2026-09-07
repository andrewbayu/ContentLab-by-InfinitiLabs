import { expect, test } from '@playwright/test';
for (const width of [1440, 375]) {
  test(`StrategistAI internal menu and indicators at ${width}px`, async ({page}) => {
    const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    await page.setViewportSize({width,height:1000});
    await page.goto('/tests/browser/preview.html?view=strategist');
    await expect(page.getByRole('heading',{name:'StrategistAI',exact:true}).last()).toBeVisible();
    await expect(page.getByRole('button',{name:'Generate AI insights'})).toBeVisible();
    await page.screenshot({path:`test-results/strategist-${width}.png`,fullPage:true});
    const hero=await page.locator('.strategy-hero').boundingBox();
    expect(hero && hero.x>=0 && hero.x+hero.width<=width).toBe(true);
    await page.getByRole('button',{name:'Card indicators'}).click();
    await expect(page.locator('.strategy-indicators').first()).toContainText('Performance');
    await page.getByRole('button',{name:'The story behind your next transformation',exact:true}).click();
    await expect(page.getByText('Opened: The story behind your next transformation')).toBeVisible();
    await page.getByLabel('Periode publikasi').selectOption('30');
    await page.getByRole('button',{name:'Idea lab',exact:true}).click();
    await expect(page.getByText('Ide dimulai dari bukti.')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
test('client cannot see the menu or use the view directly',async({page})=>{
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.goto('/tests/browser/preview.html?view=strategist&role=client');
  await expect(page.getByRole('button',{name:'StrategistAI',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Generate AI insights'})).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('internal');
});
