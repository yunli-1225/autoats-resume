import React, { useState } from "react";
import { useI18n } from "../lib/i18n/context";
import { callDeepSeek } from "../lib/ai/factory";
import { cleanLLMResponse } from "../lib/cleanResponse";
import type { HighlightAnnotation, RewriteSection, ResumeParseResult } from "../lib/schema";

interface Props {
  resume: ResumeParseResult | null;
  onAnnotationsReady?: (annotations: HighlightAnnotation[], rewrites: RewriteSection[]) => void;
}

export default function AnnotationPanel({ resume, onAnnotationsReady }: Props) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [annotations, setAnnotations] = useState<HighlightAnnotation[]>([]);
  const [rewrites, setRewrites] = useState<RewriteSection[]>([]);
  const [activeAnnotation, setActiveAnnotation] = useState<number | null>(null);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!resume) return;
    setLoading(true);
    setError("");

    try {
      const resumeText = JSON.stringify(resume, null, 2);

      const prompt = `你是一位专业的简历优化顾问。分析以下简历JSON，找出所有需要改进的问题点。

简历数据：
${resumeText.slice(0, 6000)}

请以JSON格式返回，不要包含任何其他文字和Markdown标记：
{
  "annotations": [
    {
      "type": "missing|weak|mismatch|format",
      "severity": "high|medium|low",
      "originalText": "问题原文",
      "reason": "问题的原因说明",
      "suggestion": "如何改进的建议"
    }
  ],
  "rewrites": [
    {
      "originalText": "原文",
      "suggestedText": "改写后的文本",
      "reason": "为什么要改写",
      "dimension": "所属维度"
    }
  ]
}

类型说明：
- missing: 缺少关键信息（如无联系方式、无项目经历等）
- weak: 表达较弱（如缺少量化数据、动词不够强等）
- mismatch: 与JD要求不匹配（技能方向不一致等）
- format: 格式问题（时间格式、结构混乱等）

至少找出3-5个问题点。`;

      const result = await callDeepSeek(
        [{ role: "system", content: "你是一位专业的简历优化顾问，只输出JSON。" }, { role: "user", content: prompt }],
        4000,
        30000
      );
      console.log('=== DeepSeek 标注分析 成功 ===', { chars: typeof result.content === 'string' ? result.content.length : 0 });

      const cleaned = cleanLLMResponse(result.content);
      const parsed = JSON.parse(cleaned);
      const anns = parsed.annotations || [];
      const rws = parsed.rewrites || [];

      setAnnotations(anns);
      setRewrites(rws);
      if (onAnnotationsReady) onAnnotationsReady(anns, rws);
    } catch (err: any) {
      setError(err.message || "分析失败");
    } finally {
      setLoading(false);
    }
  };

  const typeColors: Record<string, { bg: string; text: string; icon: string }> = {
    missing: { bg: "var(--error-bg)", text: "var(--error)", icon: "❌" },
    weak: { bg: "var(--warning-bg)", text: "#92400e", icon: "⚠️" },
    mismatch: { bg: "#fef3c7", text: "#92400e", icon: "🔄" },
    format: { bg: "#eff6ff", text: "var(--navy)", icon: "📐" },
  };

  return (
    <div className="card">
      <div className="card-label">
        <span className="section-icon">🔍</span>
        <span>简历标注 & 优化建议</span>
        <span className="badge">{annotations.length > 0 ? `${annotations.length} issues` : "分析"}</span>
      </div>

      {!resume && (
        <div className="generate-empty" style={{ padding: "20px 10px" }}>
          <div className="ge-icon" style={{ fontSize: "2rem" }}>🔍</div>
          <div className="ge-title">等待简历数据</div>
          <div className="ge-desc">上传简历后将自动分析问题点</div>
        </div>
      )}

      {resume && annotations.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: 12 }}>
          <button onClick={handleAnalyze} className="btn btn-outline" style={{ width: "auto", padding: "8px 20px" }}>
            🔍 分析简历问题
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center" style={{ padding: 16 }}>
          <div className="spinner-dark" style={{ width: 24, height: 24, margin: "0 auto 8px" }} />
          <span className="text-sm text-secondary">AI 正在分析简历问题...</span>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      {/* Annotations */}
      {annotations.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--navy)", marginBottom: 6 }}>
            发现的问题 ({annotations.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {annotations.map((ann, i) => {
              const colors = typeColors[ann.type] || typeColors.format;
              return (
                <div
                  key={i}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "var(--radius-xs)",
                    background: colors.bg,
                    border: "1px solid",
                    borderColor: colors.text + "30",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    outline: activeAnnotation === i ? `2px solid ${colors.text}` : undefined,
                  }}
                  onClick={() => setActiveAnnotation(activeAnnotation === i ? null : i)}
                >
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                    <span>{colors.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.72rem", color: colors.text, marginBottom: 2 }}>
                        {ann.type === "missing" ? "缺失" : ann.type === "weak" ? "表达薄弱" : ann.type === "mismatch" ? "方向不匹配" : "格式问题"}
                        <span style={{ fontWeight: 400, marginLeft: 6 }}>
                          {ann.severity === "high" ? "🔴" : ann.severity === "medium" ? "🟡" : "🟢"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                        {ann.reason}
                      </div>

                      {activeAnnotation === i && (
                        <div
                          style={{
                            marginTop: 6,
                            padding: 6,
                            borderRadius: "var(--radius-xs)",
                            background: "rgba(255,255,255,0.7)",
                            fontSize: "0.7rem",
                            lineHeight: 1.5,
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>💡 建议：</div>
                          <div style={{ color: "var(--text-secondary)" }}>{ann.suggestion}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rewrites */}
      {rewrites.length > 0 && (
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--navy)", marginBottom: 6 }}>
            逐条改写建议 ({rewrites.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rewrites.map((rw, i) => (
              <div
                key={i}
                style={{
                  padding: 8,
                  borderRadius: "var(--radius-xs)",
                  border: "1px solid var(--border-light)",
                  fontSize: "0.7rem",
                  lineHeight: 1.5,
                }}
              >
                <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: "var(--error)" }}>原文：</span>
                  {rw.originalText}
                </div>
                <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: "var(--success)" }}>建议：</span>
                  {rw.suggestedText}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>
                  <span style={{ color: "var(--navy)" }}>原因：</span>{rw.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
