import { middleware } from '../../sdk/nynosdk.js';
import { JSDOM } from 'jsdom';

export async function nyno_scrape(args, context) {
  let loop_args = [];
  let setName = context['set_context'] ?? 'prev';
  context[setName] = [];

  const START_PAGE = Number(context.START_PAGE || 1);
  const END_PAGE = Number(context.END_PAGE || 1);
  const URL_TEMPLATE = context.LOOP_URL_STRUCTURE;
  const QUERY_SELECTOR = context.QUERY_SELECTOR;

  const delay = (ms) => new Promise(res => setTimeout(res, ms));
  const log = (...msg) => console.log(`[nyno_scrape]`, ...msg);

  // Fetch + middleware wrapper
  const doSearch = async (QUERY, url) => {
    try {
      log(`Fetching: ${QUERY} → ${url}`);

      const response = await fetch(url, {
        method: "GET",
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const html = await response.text();

      context['last_result'] = { key: QUERY, data: html };

      log(`Saving result for: ${QUERY}`);
      await middleware([QUERY], context);

      return html;
    } catch (err) {
      const msg = `Error for "${QUERY}": ${err.message}`;
      log(msg);
      context['error_nyno_scraper'] = msg;
      return null;
    }
  };


  // -------------------------------------------------
  // Main loop
  // -------------------------------------------------
  for (let i = START_PAGE; i <= END_PAGE; i++) {
    const pageUrl = URL_TEMPLATE.replace(':index', i);
    const pageKey = `page_${i}`;

    log(`\n--- Scraping page ${i}/${END_PAGE} ---`);

    // Scrape page
    const pageHtml = await doSearch(pageKey, pageUrl);
    await delay(2000);

    if (!pageHtml) continue;

    // Parse HTML using JSDOM
    let dom;
    try {
      dom = new JSDOM(pageHtml);
    } catch (e) {
      log(`DOM parsing failed on page ${i}: ${e.message}`);
      continue;
    }

    const document = dom.window.document;

    // Extract links
    const links = Array.from(document.querySelectorAll(QUERY_SELECTOR))
      .map(el => el.href)
      .filter(Boolean);

    log(`Extracted ${links.length} links on page ${i}`);

    context[setName].push({ page: i, links });

    // Scrape each link with delay
    for (let link of links) {
      const linkKey = `page_${i}_link_${link}`;
      log(`Scraping link: ${link}`);
      await doSearch(linkKey, link);
      await delay(2000);
    }
  }

  log(`\n✅ Completed scraping from page ${START_PAGE} to ${END_PAGE}`);
  return 0;
}

