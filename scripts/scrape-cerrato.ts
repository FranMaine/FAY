import { chromium } from 'playwright';
import fs from 'fs';

async function main() {
  console.log('Starting Playwright...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const url = 'https://www.grandprixinternacional.com.ar/';
  console.log('Navigating to', url);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  const html = await page.content();
  fs.writeFileSync('cerrato_dump.html', html);
  console.log('Dumped HTML to cerrato_dump.html');
  
  // Let's dump texts of buttons or links
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a, button')).map(el => el.innerText.trim()).filter(t => t.length > 0);
  });
  console.log('Available buttons/links:', [...new Set(links)]);

  await browser.close();
}

main().catch(console.error);
