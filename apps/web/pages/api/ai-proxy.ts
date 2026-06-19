import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  content?: string;
  tokens?: number;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, maxTokens = 4000, temperature = 0.3, stream = false } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages is required" });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1";

  if (!apiKey) {
    return res.status(500).json({ error: "DEEPSEEK_API_KEY not configured" });
  }

  // Auto-detect if this is a vision request (messages contain image content)
  const hasImage = messages.some((m: any) =>
    Array.isArray(m.content) && m.content.some((c: any) => c.type === "image_url")
  );
  const model = hasImage ? "deepseek-vision" : "deepseek-chat";

  try {
    console.log('=== ai-proxy 请求 ===', { model, maxTokens, hasImage });

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens || 4000,
        stream: false,
      }),
    });

    console.log('=== ai-proxy 响应 ===', { status: response.status });

    if (!response.ok) {
      const text = await response.text();
      const status = response.status;
      console.error(`DeepSeek API error (${status}):`, text.slice(0, 300));
      if (status === 401) {
        return res.status(401).json({ error: "DeepSeek API 密钥无效或已过期，请在 .env.local 中更新 DEEPSEEK_API_KEY" });
      }
      return res.status(status).json({ error: `DeepSeek API 调用失败: ${status}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const tokens = data.usage?.total_tokens || 0;

    if (!content) {
      return res.status(500).json({ error: "DeepSeek 返回为空" });
    }

    return res.status(200).json({ content, tokens });
  } catch (err: any) {
    console.error("DeepSeek proxy error:", err.message);
    return res.status(500).json({ error: err.message || "DeepSeek 调用异常" });
  }
}
