import * as cheerio from 'cheerio';

async function main() {
  const html = await fetch('https://fay.org/calendarios/').then(r=>r.text());
  const $ = cheerio.load(html);
  const events: string[] = [];
  // We need to look for typical event rows or lists.
  // FAY uses Elementor / WordPress, so look for h2, h3, or specific classes.
  $('h3, h4, .elementor-heading-title, td').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 10 && (text.toLowerCase().includes('campeonato') || text.toLowerCase().includes('semana') || text.toLowerCase().includes('copa') || text.toLowerCase().includes('gran prix'))) {
      events.push(text);
    }
  });
  console.log(Array.from(new Set(events)).slice(0, 30).join('\n'));
}
main();
