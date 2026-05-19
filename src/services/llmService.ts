import { getActiveModel } from './configService';
import { readActiveSkillTexts } from './skillsService';
import type { AppConfig, InvokeLLMResponse, Message, ModelConfig, SearchResult } from '../shared/types';

const SEARCH_KEYWORDS = [
  'noticias', 'news', 'última hora', 'breaking', 'actualidad',
  'hoy', 'today', 'ayer', 'ahora', 'now', 'actual', 'reciente', 'recent',
  'elecciones', 'electoral', 'votación', 'votos', 'ganó', 'gano', 'ganador', 'ganadora',
  'resultado', 'resultados', 'campaña', 'referendum', 'referéndum',
  'presidente', 'ministro', 'gobierno', 'parlamento', 'congreso', 'senado',
  'precio', 'cotización', 'bolsa', 'stock', 'crypto', 'bitcoin',
  'partido', 'clasificación', 'tabla', 'marcador', 'score',
  'anunció', 'anuncio', 'confirma', 'confirman', 'reporta', 'reportan',
  '2024', '2025', '2026', '2027',
];

const SEARCH_PATTERNS = [
  /\bqu[ií]en\s+(gan[oó]|ha\s+ganado|gana)\b/i,
  /\bqu[eé]\s+pas[oó]\b/i,
  /\bultim[ao]s?\s+noticias\b/i,
  /\bresultado(s)?\s+de\b/i,
  /\b(elecciones?|referendum)\b/i,
  /\b(noticia|suceso|acontecimiento)\b/i,
  /\b(20\d{2})\b/,
  /\b(qu[eé]\s+es|qu[eé]\s+son|qui[eé]n\s+es|qui[eé]n\s+era)\b/i,
  /\b(c[oó]mo\s+funciona|c[oó]mo\s+se\s+|definici[oó]n\s+de|significado\s+de)\b/i,
  /\b(documentaci[oó]n|tutorial|ejemplo\s+de|comparar|mejor\s+(forma|herramienta))\b/i,
  /\b(precio\s+de|cu[aá]nto\s+cuesta|horario\s+de|d[oó]nde\s+(est[aá]|comprar))\b/i,
];

export function needsWebSearch(query: string): boolean {
  const normalized = query.toLowerCase();
  if (SEARCH_KEYWORDS.some(keyword => normalized.includes(keyword))) return true;
  return SEARCH_PATTERNS.some(pattern => pattern.test(query));
}

export function buildSearchContext(results: SearchResult[]): Message | null {
  const usefulResults = results.filter(result => result.title !== 'Error de búsqueda' && result.title !== 'Sin resultados');
  if (usefulResults.length === 0) return null;

  const content = usefulResults.map(result => {
    const origin = result.source ? ` [${result.source}]` : '';
    const link = result.url ? ` (${result.url})` : '';
    return `- ${result.title}${origin}${link}: ${result.snippet}`;
  }).join('\n');

  return {
    role: 'system',
    content: [
      'Resultados de búsqueda web (noticias recientes o web general):',
      content,
      '',
      'Instrucciones:',
      '- Usa estos resultados como fuente principal para datos actuales o hechos verificables.',
      '- Si la pregunta es conceptual, combina los resultados con tu conocimiento sin contradecirlos.',
      '- Si los resultados no responden con claridad, dilo y no inventes datos.',
      '- Cita titular, fuente o fecha cuando sea relevante.',
    ].join('\n'),
  };
}

async function buildSystemMessage(config: AppConfig): Promise<Message> {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const skillTexts = await readActiveSkillTexts(config.activeSkills || []);
  const activeModel = getActiveModel(config);
  const basePrompt = activeModel?.systemPrompt || 'Eres un asistente de IA útil, inteligente y creativo. Responde siempre en español con claridad, proporcionando ejemplos cuando sea necesario.';

  let content = [
    basePrompt,
    `FECHA Y HORA ACTUAL: ${dateStr}, ${timeStr}.`,
    'Cuando se te proporcionen resultados de búsqueda web, úsalos como fuente principal.',
  ].join('\n\n');

  if (skillTexts.length > 0) {
    content += `\n\nSkills:\n${skillTexts.join('\n\n---\n\n')}`;
  }

  return { role: 'system', content };
}

export async function requestAssistantReply(
  config: AppConfig,
  messages: Message[],
  searchContext?: Message | null,
): Promise<string> {
  const activeModel = getActiveModel(config);
  if (!activeModel?.apiKey) throw new Error('API Key no configurada.');

  const maxTokens = activeModel.maxTokens || 1500;
  const temperature = activeModel.temperature ?? 0.7;
  const baseUrl = activeModel.baseUrl.replace(/\/+$/, '');
  const apiMessages = [
    await buildSystemMessage(config),
    ...(searchContext ? [searchContext] : []),
    ...messages,
  ];

  let content: string;
  if (window.electronAPI) {
    const response = await window.electronAPI.invokeLLM(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeModel.apiKey}`,
      },
      body: JSON.stringify({
        model: activeModel.modelName || 'gpt-4o-mini',
        messages: apiMessages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(response.error || `API Error: ${response.status || 'desconocido'}`);
    }
    content = response.data?.choices?.[0]?.message?.content || '';
  } else {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeModel.apiKey}`,
      },
      body: JSON.stringify({
        model: activeModel.modelName || 'gpt-4o-mini',
        messages: apiMessages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`API Error: ${response.status} - ${errText || 'desconocido'}`);
    }
    const data = await response.json();
    content = data?.choices?.[0]?.message?.content || '';
  }

  if (!content) throw new Error('El modelo no devolvió contenido.');
  return content;
}

export async function testModelConnection(model: ModelConfig): Promise<InvokeLLMResponse> {
  const baseUrl = model.baseUrl.trim().replace(/\/+$/, '');
  if (!baseUrl) {
    return { ok: false, status: 400, error: 'Base URL no configurada.' };
  }

  if (!model.modelName.trim()) {
    return { ok: false, status: 400, error: 'Model Name no configurado.' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (model.apiKey.trim()) {
    headers.Authorization = `Bearer ${model.apiKey.trim()}`;
  }

  const body = JSON.stringify({
    model: model.modelName,
    messages: [{ role: 'user', content: 'Ping' }],
    max_tokens: 1,
    temperature: 0,
  });

  if (window.electronAPI) {
    return window.electronAPI.invokeLLM(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body,
    });
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: await response.text(),
      };
    }

    return {
      ok: true,
      data: await response.json(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de red desconocido.';
    const corsHint = message.toLowerCase().includes('fetch')
      ? 'No se pudo conectar desde el navegador. Si usas OpenAI u otro proveedor cloud, puede ser un bloqueo CORS; prueba la app en Electron o usa un endpoint local compatible.'
      : message;
    return { ok: false, status: 0, error: corsHint };
  }
}
