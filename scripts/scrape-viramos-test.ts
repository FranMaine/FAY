import { chromium } from 'playwright';
import fs from 'fs';

async function main() {
  console.log('Starting Playwright...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const url = process.argv[2] || 'https://viramos.com/championship/semana-de-buenos-aires-2023';
  console.log('Navigating to', url);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  const buttons = await page.$$('button, a, div[role="tab"]');
  for (const btn of buttons) {
    const text = await btn.innerText();
    if (text && text.toLowerCase().includes('result')) {
      console.log('Clicking on:', text);
      await btn.click();
      await page.waitForTimeout(4000);
      break;
    }
  }

  const html = await page.content();
  fs.writeFileSync('viramos_results_dump.html', html);
  console.log('Dumped HTML to viramos_results_dump.html');
  await browser.close();
}

main().catch(console.error);
