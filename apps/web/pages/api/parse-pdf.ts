import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";

export const config = { api: { bodyParser: false } };

/** 清洗 PDF 提取的文本：删除控制字符和替换字符 */
function cleanText(text: string): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")  // 删除控制字符
    .replace(/�/g, "")                               // 删除替换字符
    .replace(/\r\n/g, "\n")                               // 统一换行符
    .trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    const uploadedFile = files.file?.[0];
    if (!uploadedFile) return res.status(400).json({ error: "No file uploaded" });

    const filePath = uploadedFile.filepath;
    const fileBuffer = fs.readFileSync(filePath);

    // Try pdf-parse v2
    let text = "";
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse(new Uint8Array(fileBuffer));
      await parser.load();
      text = await parser.getText();
      parser.destroy();
    } catch (e: any) { console.warn("pdf-parse:", e.message); }

    // Fallback if pdf-parse returned empty
    if (typeof text !== "string" || !text.trim()) {
      text = extractRawText(fileBuffer);
    }

    // Clean the extracted text
    text = cleanText(text);

    try { fs.unlinkSync(filePath); } catch {}

    if (!text) {
      return res.status(422).json({ error: "未能从PDF中提取到文字内容" });
    }
    return res.status(200).json({ text });
  } catch (err: any) {
    console.error("PDF error:", err);
    return res.status(500).json({ error: err.message || "PDF解析失败" });
  }
}

function extractRawText(buffer: Buffer): string {
  try {
    const raw = buffer.toString("utf-8");
    const results: string[] = [];
    let idx = 0;
    while (true) {
      const a = raw.indexOf("(", idx);
      const b = raw.indexOf(")", a + 1);
      if (a === -1 || b === -1) break;
      const t = raw.substring(a + 1, b);
      if (t.length >= 2 && /[a-zA-Z]/.test(t)) results.push(t);
      idx = b + 1;
    }
    return results.join(" ");
  } catch { return ""; }
}
