import React, { useState, useRef } from "react";
import { useI18n } from "../lib/i18n/context";
import { callDeepSeek, callDeepSeekVision } from "../lib/ai/factory";
import { cleanLLMResponse } from "../lib/cleanResponse";
import type { SkillExtraction } from "../lib/schema";
import Tesseract from "tesseract.js";

interface Props {
  onJDSubmit: (text: string, extraction: SkillExtraction) => void;
}

export default function JDAnalyzer({ onJDSubmit }: Props) {
  const { t } = useI18n();
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMethod, setOcrMethod] = useState<string>("");
  const [extraction, setExtraction] = useState<SkillExtraction | null>(null);
  const [error, setError] = useState("");
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    if (typeof jdText !== 'string' || !jdText.trim()) return;
    setLoading(true);
    setError("");

    try {
      const prompt = `你是一位专业的JD（职位描述）分析专家。分析以下职位描述，提取关键信息。

职位描述：
${jdText}

请以JSON格式返回以下结构，不要包含任何其他文字和Markdown标记：
{
  "hardSkills": [{"name": "技能名称", "importance": "required|preferred|plus", "mentioned": false}],
  "softSkills": ["沟通能力", "团队协作"],
  "implicitRequirements": ["隐性要求1", "隐性要求2"],
  "keywords": ["关键词1", "关键词2"]
}

要求：
1. hardSkills 是硬技能/技术要求，每项标注重要性（required=必备, preferred=优先, plus=加分）
2. softSkills 是软技能/素质要求
3. implicitRequirements 是JD中隐含但没有明确写出的要求（如行业认知、特定工具经验等）
4. keywords 提取所有重要关键词（技术、行业、业务术语）
5. hardSkills 至少列出5项，softSkills 至少3项`;

      const result = await callDeepSeek(
        [{ role: "system", content: "你是一位专业的JD分析专家，只输出JSON。" }, { role: "user", content: prompt }],
        4000,
        30000
      );
      console.log('=== DeepSeek JD分析 成功 ===', { chars: result.content?.length });

      const cleaned = cleanLLMResponse(result.content);
      const parsed: SkillExtraction = JSON.parse(cleaned);
      setExtraction(parsed);
      onJDSubmit(jdText, parsed);
    } catch (err: any) {
      setError(err.message || "分析失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  /** 处理粘贴事件：检测图片并自动 OCR */
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        setOcrLoading(true);
        setError("");
        setPastedImage(URL.createObjectURL(file));

        try {
          // Convert image to base64
          const base64 = await fileToBase64(file);

          // Call DeepSeek Vision for OCR
          const result = await callDeepSeekVision(
            base64,
            "你是一位专业的OCR文字识别专家。请准确提取图片中的所有文字内容，保持原格式和排版。",
            "请提取这张JD（职位描述）截图中的全部文字，不要遗漏任何内容，保持段落结构。",
            4000,
            30000
          );
          console.log('=== DeepSeek OCR 成功 ===', { chars: result.content?.length });

          // Append extracted text to textarea
          setJdText((prev) => {
            const newText = prev ? prev + "\n\n" + result.content : result.content;
            return newText;
          });
        } catch (err: any) {
          setError(err.message || "图片文字识别失败");
        } finally {
          setOcrLoading(false);
        }
        break;
      }
    }
  };

  /** 上传图片 OCR：先 Tesseract.js（免费），降级到 DeepSeek Vision */
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("请选择图片格式的文件");
      return;
    }

    setOcrLoading(true);
    setOcrMethod("Tesseract.js");
    setError("");
    setPastedImage(URL.createObjectURL(file));

    try {
      // Try Tesseract.js first (free, client-side)
      let extractedText = "";
      try {
        const result = await Tesseract.recognize(file, "chi_sim+eng", {
          logger: (m: any) => {
            if (m.status === "recognizing text") {
              setOcrMethod(`Tesseract ${Math.round(m.progress * 100)}%`);
            }
          },
        });
        extractedText = result.data.text.trim();
        console.log("=== Tesseract OCR ===", { chars: extractedText.length });
      } catch (tessErr: any) {
        console.warn("Tesseract failed:", tessErr.message);
      }

      // If Tesseract returned too little, fallback to DeepSeek Vision
      if (!extractedText || extractedText.length < 10) {
        setOcrMethod("DeepSeek Vision");
        const base64 = await fileToBase64(file);
        const result = await callDeepSeekVision(
          base64,
          "你是一位专业的OCR文字识别专家。请准确提取图片中的所有文字内容，保持原格式和排版。",
          "请提取这张JD（职位描述）截图中的全部文字，不要遗漏任何内容，保持段落结构。",
          4000,
          30000
        );
        extractedText = result.content.trim();
        console.log("=== DeepSeek Vision OCR ===", { chars: extractedText.length });
      }

      if (!extractedText) {
        throw new Error("未能从图片中识别到文字");
      }

      // Append to textarea
      setJdText((prev) => {
        const newText = prev ? prev + "\n\n" + extractedText : extractedText;
        return newText;
      });
    } catch (err: any) {
      setError(err.message || "图片文字识别失败");
    } finally {
      setOcrLoading(false);
      setOcrMethod("");
    }
  };

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const SkillTag = ({ name, importance }: { name: string; importance: string }) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 14,
        fontSize: "0.72rem",
        fontWeight: 500,
        background:
          importance === "required"
            ? "var(--primary-lighter)"
            : importance === "preferred"
            ? "#fef3c7"
            : "#f1f5f9",
        color:
          importance === "required"
            ? "var(--navy)"
            : importance === "preferred"
            ? "#92400e"
            : "var(--text-secondary)",
        border: "1px solid",
        borderColor:
          importance === "required"
            ? "var(--border)"
            : importance === "preferred"
            ? "#fde68a"
            : "var(--border-light)",
      }}
    >
      {name}
      {importance === "required" && (
        <span style={{ fontSize: "0.6rem", color: "var(--error)" }}>*</span>
      )}
    </span>
  );

  return (
    <div className="card">
      <div className="card-label">
        <span className="section-icon">📝</span>
        <span>{t("jd.title")}</span>
        <span className="badge">{extraction ? `${extraction.hardSkills.length} skills` : "JD"}</span>
      </div>

      <textarea
        ref={textareaRef}
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        onPaste={handlePaste}
        rows={10}
        placeholder={t("jd.placeholder") + "（支持 Ctrl+V 粘贴截图）"}
        style={{ marginBottom: 10 }}
      />

      {/* OCR loading */}
      {ocrLoading && (
        <div className="entry-block" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <div className="spinner-dark" style={{ width: 16, height: 16 }} />
          <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            {ocrMethod ? `正在识别 (${ocrMethod})...` : "正在识别图片中的文字..."}
          </span>
        </div>
      )}

      {/* Image thumbnail (paste or upload) */}
      {pastedImage && !ocrLoading && (
        <div className="upload-preview" style={{ marginBottom: 8 }}>
          <img src={pastedImage} alt="JD截图" style={{ maxHeight: 60 }} />
          <div className="upload-preview-info">
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>已识别图片文字</span>
          </div>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => { setPastedImage(null); }}
            style={{ padding: "2px 8px", fontSize: "0.65rem" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Image upload button (hidden file input) */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
          e.target.value = "";
        }}
      />

      {/* Toolbar: upload image + analyze */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <button
          className="btn btn-sm btn-outline"
          onClick={() => imageInputRef.current?.click()}
          disabled={ocrLoading}
          style={{ padding: "6px 14px" }}
        >
          📷 上传图片
        </button>
        <button
          onClick={handleAnalyze}
          disabled={loading || !jdText.trim()}
          className="btn btn-gold"
          style={{ width: "auto", padding: "10px 24px", flex: 1 }}
        >
          {loading ? (
            <>
              <span className="spinner" /> {t("project.analyzing")}
            </>
          ) : (
            "🔍 解析JD"
          )}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {extraction && (
        <div>
          {/* Hard Skills */}
          {extraction.hardSkills.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, letterSpacing: "0.5px" }}>
                🔧 硬技能 / 技术要求 ({extraction.hardSkills.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {extraction.hardSkills.map((s, i) => (
                  <SkillTag key={i} name={s.name} importance={s.importance} />
                ))}
              </div>
            </div>
          )}

          {/* Soft Skills */}
          {extraction.softSkills.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, letterSpacing: "0.5px" }}>
                🤝 软技能 ({extraction.softSkills.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {extraction.softSkills.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 14,
                      fontSize: "0.72rem",
                      fontWeight: 500,
                      background: "#f0fdf4",
                      color: "var(--success)",
                      border: "1px solid #bbf7d0",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Implicit Requirements */}
          {extraction.implicitRequirements.length > 0 && (
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, letterSpacing: "0.5px" }}>
                🎯 隐性要求 ({extraction.implicitRequirements.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {extraction.implicitRequirements.map((r, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 14,
                      fontSize: "0.72rem",
                      fontWeight: 500,
                      background: "#fdf2f8",
                      color: "#be185d",
                      border: "1px solid #fbcfe8",
                    }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
