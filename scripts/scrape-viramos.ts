import { chromium } from 'playwright';

async function main() {
  console.log('Starting Playwright...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const url = process.argv[2] || 'https://viramos.com/championship/semana-de-buenos-aires-2023';
  console.log('Navigating to', url);
  
  page.on('response', async (res) => {
    const reqUrl = res.url();
    if (reqUrl.includes('.json') || reqUrl.includes('api') || reqUrl.includes('trpc')) {
      console.log('Intercepted API call:', reqUrl);
    }
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  // Click Results link if found
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({ href: a.href, text: a.innerText }));
  });
  const resultsLink = links.find(l => l.text.toLowerCase().includes('result'));
  if (resultsLink) {
    console.log('Found Results link, clicking:', resultsLink.href);
    await page.goto(resultsLink.href, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
  } else {
    console.log('No results link found.');
  }

  console.log('Done.');
  await browser.close();
}

main().catch(console.error);
