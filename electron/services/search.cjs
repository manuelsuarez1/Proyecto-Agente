const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuración básica de logging
let logFilePath = path.join(__dirname, '../../logs/search.log');


function logToFile(level, message, error = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;
  
  // En entorno de desarrollo, también imprimir en consola
  if (process.env.NODE_ENV === 'development') {
    console.log(logEntry);
  }
  
  // Guardar en archivo de log
  try {
    fs.appendFileSync(logFilePath, logEntry);
    if (error) {
      fs.appendFileSync(logFilePath, `Error: ${error.stack}\n`);
    }
  } catch (err) {
    console.error('Error escribiendo en archivo de log:', err);
  }
}
const cheerio = require('cheerio');

const SEARCH_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const MAX_RESULTS = 8;

const WEATHER_KEYWORDS = [
  'tiempo', 'weather', 'temperatura', 'lluvia', 'clima', 'pronóstico',
  'pronostico', 'forecast', 'calor', 'frio', 'frío', 'nieve', 'viento',
  'tormenta', 'paraguas', 'grados', '°c', '°f',
];

const NEWS_SIGNALS = [
  'noticia', 'noticias', 'última hora', 'ultima hora', 'breaking', 'actualidad',
  'eleccion', 'elecciones', 'votacion', 'votación', 'referendum', 'referéndum',
  'ganó', 'gano', 'ganador', 'ganadora', 'resultado', 'resultados',
  'presidente', 'gobierno', 'ministro', 'parlamento', 'congreso',
  'anunció', 'anuncio', 'confirma', 'reporta',
  'hoy', 'ayer', 'ahora', 'reciente',
  'precio', 'cotización', 'cotizacion', 'bolsa', 'crypto', 'bitcoin',
  'marcador', 'clasificación', 'clasificacion',
];

const QUERY_STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'a',
  'en', 'y', 'o', 'que', 'qué', 'como', 'cómo', 'es', 'son', 'fue', 'fueron',
  'ha', 'han', 'se', 'me', 'te', 'por', 'para', 'con', 'sin', 'sobre', 'este',
  'esta', 'estos', 'estas', 'mi', 'tu', 'su', 'sus', 'yo', 'usted',
  'quien', 'quién', 'cual', 'cuál', 'cuando', 'cuándo', 'donde', 'dónde',
  'sabes', 'sabe', 'dime', 'decir', 'explica', 'explicar', 'busca', 'buscar',
]);

function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function looksLikeWeatherQuery(query) {
  const normalized = normalizeText(query);
  return WEATHER_KEYWORDS.some(keyword => normalized.includes(keyword));
}

function looksLikeNewsQuery(query) {
  const normalized = normalizeText(query);
  if (NEWS_SIGNALS.some(signal => normalized.includes(signal))) return true;
  if (/\bqu[ií]en\s+(gan[oó]|ha\s+ganado|gana)\b/i.test(query)) return true;
  if (/\bqu[eé]\s+pas[oó]\b/i.test(query)) return true;
  if (/\b(20\d{2})\b/.test(query)) return true;
  return false;
}

function extractWeatherLocation(query) {
  const stopWords = /\b(el|la|los|las|tiempo|qué|que|hará|hara|habrá|habra|hoy|mañana|manana|esta|semana|próxima|proxima|en|de|del|para|clima|temperatura|grados|pronóstico|pronostico|weather|forecast|lluvia|nieve)\b/gi;
  return query.replace(stopWords, ' ').replace(/\s+/g, ' ').trim() || 'Madrid';
}

function optimizeSearchQuery(query) {
  const normalized = normalizeText(query);

  const tokens = normalized
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !QUERY_STOP_WORDS.has(token));

  const unique = [...new Set(tokens)];
  const compact = unique.join(' ').trim();

  return compact.length >= 2 ? compact : query.trim();
}

function decodeRedirectUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl, 'https://duckduckgo.com');
    const uddg = parsed.searchParams.get('uddg');
    if (uddg) return decodeURIComponent(uddg);
    const googleNews = parsed.searchParams.get('url');
    if (googleNews) return googleNews;
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

function dedupeResults(results) {
  const seen = new Set();
  return results.filter(item => {
    const key = `${item.title}|${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchWeather(query) {
  const location = extractWeatherLocation(query);
  const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1&lang=es`;
  const { data } = await axios.get(url, {
    timeout: 8000,
    headers: { 'User-Agent': 'curl/7.68.0', Accept: 'application/json' },
  });

  const area = data.nearest_area[0].areaName[0].value;
  const country = data.nearest_area[0].country[0].value;
  const current = data.current_condition[0];
  const today = data.weather[0];
  const tomorrow = data.weather[1];
  const descToday = today.hourly[4].weatherDesc[0].value;
  const descTomorrow = tomorrow.hourly[4].weatherDesc[0].value;

  const summary = [
    `Tiempo en ${area}, ${country}:`,
    `- Ahora: ${current.temp_C}°C, ${current.weatherDesc[0].value}, humedad ${current.humidity}%`,
    `- Hoy: ${descToday}, max ${today.maxtempC}°C / min ${today.mintempC}°C`,
    `- Mañana: ${descTomorrow}, max ${tomorrow.maxtempC}°C / min ${tomorrow.mintempC}°C`,
    `- Precipitación mañana: ${tomorrow.hourly[4].chanceofrain}%`,
  ].join('\n');

  return [{ title: `Tiempo en ${area}`, snippet: summary, url: `https://wttr.in/${encodeURIComponent(location)}`, source: 'wttr.in' }];
}

async function searchGoogleNews(query) {
  const optimizedQuery = optimizeSearchQuery(query);
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(optimizedQuery)}&hl=es&gl=ES&ceid=ES:es`;

  const { data } = await axios.get(rssUrl, {
    timeout: 12_000,
    headers: { 'User-Agent': SEARCH_USER_AGENT, Accept: 'application/rss+xml' },
  });

  const $ = cheerio.load(data, { xmlMode: true });
  const results = [];

  $('item').each((index, element) => {
    if (index >= MAX_RESULTS + 3) return false;

    const title = $(element).find('title').text().trim();
    if (!title) return undefined;

    const rawSnippet = $(element).find('description').text();
    const snippet = rawSnippet.replace(/<[^>]+>/g, '').trim().substring(0, 280);
    const pubDate = $(element).find('pubDate').text().trim();
    const url = decodeRedirectUrl($(element).find('link').text().trim());

    results.push({
      title,
      snippet: pubDate ? `${snippet || title} [${pubDate}]` : (snippet || title),
      url,
      source: 'Google Noticias',
    });

    return undefined;
  });

  return results.slice(0, MAX_RESULTS);
}

async function searchDuckDuckGoWeb(query) {
  const optimizedQuery = optimizeSearchQuery(query);

  const { data } = await axios.post(
    'https://html.duckduckgo.com/html/',
    new URLSearchParams({ q: optimizedQuery, kp: '-1' }),
    {
      timeout: 12_000,
      headers: {
        'User-Agent': SEARCH_USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'text/html',
      },
    },
  );

  const $ = cheerio.load(data);
  const results = [];

  $('.result').each((index, element) => {
    if (index >= MAX_RESULTS + 2) return false;

    const titleEl = $(element).find('.result__a').first();
    const title = titleEl.text().trim();
    const snippet = $(element).find('.result__snippet').text().trim();
    const url = decodeRedirectUrl(titleEl.attr('href') || '');

    if (title) {
      results.push({
        title,
        snippet: snippet || title,
        url,
        source: 'DuckDuckGo',
      });
    }

    return undefined;
  });

  return results.slice(0, MAX_RESULTS);
}

async function runWebSearch(query) {
  const preferNews = looksLikeNewsQuery(query);

  if (preferNews) {
    try {
      const newsResults = await searchGoogleNews(query);
      if (newsResults.length >= 2) return newsResults;
    } catch (err) {
      logToFile('error', '[SEARCH] Google News error', err);
    }
  }

  try {
    const webResults = await searchDuckDuckGoWeb(query);
    if (webResults.length > 0) return webResults;
  } catch (err) {
    logToFile('error', '[SEARCH] DuckDuckGo error', err);
  }

  if (preferNews) {
    try {
      const newsResults = await searchGoogleNews(query);
      if (newsResults.length > 0) return newsResults;
    } catch (err) {
      logToFile('error', '[SEARCH] Google News fallback error', err);
    }
  }

  return [];
}

function registerSearchHandlers({ app, ipcMain }) {
  if (app) {
    try {
      const userData = app.getPath('userData');
      const logDir = path.join(userData, 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      logFilePath = path.join(logDir, 'search.log');
    } catch (err) {
      console.error('Error al configurar ruta de log de búsqueda:', err);
    }
  }

  ipcMain.handle('perform-search', async (_event, query) => {
    const trimmed = String(query || '').trim();
    if (!trimmed) {
      return [{ title: 'Sin resultados', snippet: 'Consulta vacía.', url: '', source: '' }];
    }

    if (looksLikeWeatherQuery(trimmed)) {
      try {
        return await searchWeather(trimmed);
      } catch (err) {
        logToFile('error', '[SEARCH] wttr.in error', err);
      }
    }

    const results = await runWebSearch(trimmed);
    if (results.length > 0) return results;

    return [{
      title: 'Sin resultados',
      snippet: 'No se encontró información web. Prueba a ser más específico (tema, lugar, fecha).',
      url: '',
      source: '',
    }];
  });
}

module.exports = {
  registerSearchHandlers,
  optimizeSearchQuery,
  looksLikeNewsQuery,
  looksLikeWeatherQuery,
};
