const { optimizeSearchQuery, looksLikeNewsQuery } = require('./electron/services/search.cjs');
const axios = require('axios');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (compatible; AgentX/1.0)';

async function testNews(query) {
  const optimized = optimizeSearchQuery(query);
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(optimized)}&hl=es&gl=ES&ceid=ES:es`;
  const { data } = await axios.get(rssUrl, { timeout: 12000, headers: { 'User-Agent': UA } });
  const $ = cheerio.load(data, { xmlMode: true });
  console.log('\n[NEWS]', query, '->', optimized);
  $('item').slice(0, 2).each((_, el) => console.log('-', $(el).find('title').text().trim()));
}

async function testWeb(query) {
  const optimized = optimizeSearchQuery(query);
  const { data } = await axios.post(
    'https://html.duckduckgo.com/html/',
    new URLSearchParams({ q: optimized }),
    { timeout: 12000, headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  const $ = cheerio.load(data);
  console.log('\n[WEB]', query, '->', optimized);
  $('.result').slice(0, 2).each((_, el) => console.log('-', $(el).find('.result__a').text().trim()));
}

async function main() {
  const newsQ = 'quien gano las elecciones 2026 en andalucia';
  const webQ = 'como funciona el protocolo MQTT';
  console.log('news?', looksLikeNewsQuery(newsQ));
  console.log('news?', looksLikeNewsQuery(webQ));
  await testNews(newsQ);
  await testWeb(webQ);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
