import type { NextApiRequest, NextApiResponse } from "next";

export const config = { api: { bodyParser: false } };

function cleanText(text: string): string {
  if (typeof text !== "string") return "";
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").replace(/\r\n/g, "\n").trim();
}

function extractRawText(raw: string): string {
  const results: string[] = [];
  let idx = 0;
  while (true) {
    const a = raw.indexOf("(", idx);
    const b = raw.indexOf(")", a + 1);
    if (a === -1 || b === -1) break;
    const t = raw.substring(a + 1, b);
    if (t.length >= 2 && /[a-zA-Z一-鿿]/.test(t)) results.push(t);
    idx = b + 1;
  }
  if (results.length > 3) return results.join(" ");
  const readable = raw.replace(/[^a-zA-Z0-9一-鿿@.\-_\s]/g, " ").replace(/\s+/g, " ").trim();
  const words = readable.split(/\s+/).filter((w: string) => w.length > 2);
  return words.length > 5 ? words.join(" ") : results.join(" ");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const chunks: Buffer[] = [];
    for await (const c of req as any) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf-8");

    if (!raw.includes("filename=")) return res.status(400).json({ error: "No file in upload" });

    const start = raw.indexOf("\r\n\r\n") + 4;
    const boundary = raw.match(/^--([^\r\n]+)/m)?.[1];
    let end = boundary ? raw.lastIndexOf("--" + boundary) : raw.length;
    if (end <= start || end > raw.length) end = raw.length;
    const rawText = raw.substring(start, end).trim();

    if (!rawText) return res.status(422).json({ error: "无法读取PDF内容" });

    let text = "";
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse(new TextEncoder().encode(rawText));
      await parser.load();
      text = await parser.getText();
      parser.destroy();
    } catch (e: any) { console.warn("pdf-parse:", e.message); }

    if (!text || !text.trim()) text = extractRawText(rawText);
    text = cleanText(text);
    if (!text) return res.status(422).json({ error: "未能从PDF中提取到文字内容" });
    return res.status(200).json({ text });
  } catch (err: any) {
    console.error("PDF error:", err);
    return res.status(500).json({ error: err.message || "PDF解析失败" });
  }
}
