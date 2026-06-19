import { logger } from '../logger';

const MODULE = 'AI';

export interface AIResult {
  content: string;
  latencyMs: number;
  tokens: number;
  error?: string;
}

/** 临时 API Key 覆盖（仅客户端备用） */
let overrideApiKey: string | null = null;

export function setTempApiKey(key: string): void {
  overrideApiKey = key;
}

/**
 * 通过服务端代理 API 调用 DeepSeek。
 * 避免在浏览器端暴露 API Key。
 */
export async function callDeepSeek(
  messages: { role: string; content: string }[],
  maxTokens: number,
  timeoutMs: number,
): Promise<AIResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    console.log('=== DeepSeek 请求参数 ===', JSON.stringify({ msgCount: messages.length, lastChar: (messages[messages.length-1]?.content || '').slice(-50), maxTokens }));

    const response = await fetch('/api/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, maxTokens, temperature: 0.3 }),
      signal: controller.signal,
    });

    const elapsed = Date.now() - start;
    console.log('=== DeepSeek 响应状态 ===', response.status, `${elapsed}ms`);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const errMsg = typeof data.error === 'string' ? data.error : `API 调用失败 (${response.status})`;
      logger.error(MODULE, errMsg, { latency: elapsed });
      console.log('=== DeepSeek 错误详情 ===', errMsg);
      if (response.status === 401) throw new Error(data.error || 'DeepSeek API 密钥无效或已过期');
      if (response.status === 402 || response.status === 429) throw new Error('DeepSeek_QUOTA_EXHAUSTED');
      throw new Error(errMsg);
    }

    const data = await response.json();
    if (typeof data.content !== 'string') {
      console.log('=== DeepSeek 返回格式异常 ===', JSON.stringify(data).slice(0, 200));
      throw new Error('AI 返回格式异常');
    }

    logger.info(MODULE, `DeepSeek 调用成功`, { latency: `${elapsed}ms`, tokens: data.tokens || 0 });
    return { content: data.content, latencyMs: elapsed, tokens: data.tokens || 0 };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    console.log('=== DeepSeek 错误详情 ===', err.message);
    if (err.name === 'AbortError') {
      logger.warn(MODULE, 'DeepSeek 超时', { latency: elapsed });
      throw new Error('AI响应超时，请简化素材后重试');
    }
    if (err.message === 'DeepSeek_QUOTA_EXHAUSTED') throw err;
    logger.error(MODULE, 'DeepSeek 调用异常', { latency: elapsed, error: err.message });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 通过服务端代理调用 DeepSeek Vision（图片识别）。
 */
export async function callDeepSeekVision(
  imageBase64: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  timeoutMs: number,
): Promise<AIResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const response = await fetch('/api/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: imageBase64 } },
            ],
          },
        ],
        maxTokens,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    const elapsed = Date.now() - start;

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Vision API 调用失败 (${response.status})`);
    }

    const data = await response.json();
    if (!data.content) throw new Error('Vision 返回为空');

    logger.info(MODULE, 'Vision 调用成功', { latency: `${elapsed}ms`, tokens: data.tokens || 0 });
    return { content: data.content, latencyMs: elapsed, tokens: data.tokens || 0 };
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('AI 识别超时');
    if (err.message === 'DeepSeek_QUOTA_EXHAUSTED') throw err;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 流式调用 DeepSeek（通过服务端代理）。
 */
export async function callDeepSeekStream(
  messages: { role: string; content: string }[],
  maxTokens: number,
  timeoutMs: number,
  onChunk: (text: string) => void,
): Promise<{ content: string; tokens: number }> {
  const start = Date.now();
  let fullContent = '';
  let totalTokens = 0;

  try {
    const response = await fetch('/api/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, maxTokens, temperature: 0.3, stream: true }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `流式 API 调用失败 (${response.status})`);
    }

    // If proxy returns non-streaming (fallback), handle as regular JSON
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (data.content) {
        onChunk(data.content);
        return { content: data.content, tokens: data.tokens || 0 };
      }
      throw new Error('流式 API 返回格式异常');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('流式响应无 body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = typeof line === 'string' ? line.trim() : '';
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = typeof trimmed === 'string' ? trimmed.slice(5).trim() : '';
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) { fullContent += delta; onChunk(delta); }
        } catch { /* skip */ }
      }
    }

    logger.info(MODULE, '流式调用完成', { latency: `${Date.now() - start}ms` });
    return { content: fullContent, tokens: totalTokens };
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('AI响应超时');
    throw err;
  }
}
