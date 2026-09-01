import { chromium } from 'playwright';
import fs from 'fs';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const url = 'https://www.grandprixinternacional.com.ar/archivo/2024';
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const html = await page.content();
  fs.writeFileSync('cerrato_2024_dump.html', html);
  
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => a.innerText.trim() + ' -> ' + a.href).filter(t => t.toLowerCase().includes('result') || t.toLowerCase().includes('optimist'));
  });
  console.log('Results links:', links);
  await browser.close();
}

main().catch(console.error);
