import React, { useState } from "react";
import type { ResumeParseResult } from "../lib/schema";

interface Props {
  resume: ResumeParseResult | null;
  optimizedText: string;
  onRegenerate?: () => void;
  loading?: boolean;
}

export default function ResumePreview({ resume, optimizedText, onRegenerate, loading }: Props) {
  const [viewMode, setViewMode] = useState<"optimized" | "original">("optimized");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(optimizedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = optimizedText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Build original text from parsed resume data
  const originalText = resume
    ? [
        resume.personal.name && `姓名：${resume.personal.name}`,
        resume.personal.phone && `电话：${resume.personal.phone}`,
        resume.personal.email && `邮箱：${resume.personal.email}`,
        "",
        ...resume.education.map(
          (e) => `【教育】${e.school} | ${e.major} | ${e.degree} (${e.startDate}-${e.endDate})`
        ),
        ...resume.experience.map(
          (e) => `【经历】${e.company} | ${e.position} (${e.startDate}-${e.endDate})\n  ${e.description}`
        ),
        ...resume.projects.map(
          (p) => `【项目】${p.name} | ${p.role} (${p.startDate}-${p.endDate})\n  ${p.description}`
        ),
        ...resume.skills.map((s) => `【技能】${s.name} (${s.proficiency || s.category})`),
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const displayText = viewMode === "optimized" ? optimizedText : originalText;

  const sectionBreak = "\n\n";

  return (
    <div className="card">
      <div className="card-label">
        <span className="section-icon">✨</span>
        <span>优化简历</span>
        <span className="badge">{viewMode === "optimized" ? "优化稿" : "原文"}</span>
      </div>

      {/* Mode toggle */}
      <div
        className="email-selector"
        style={{ marginBottom: 10, display: "flex", gap: 4 }}
      >
        <button
          className={`email-chip ${viewMode === "optimized" ? "active" : ""}`}
          onClick={() => setViewMode("optimized")}
        >
          ✨ 优化稿
        </button>
        <button
          className={`email-chip ${viewMode === "original" ? "active" : ""}`}
          onClick={() => setViewMode("original")}
        >
          📄 原文
        </button>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={loading}
            className="btn btn-sm btn-outline"
            style={{ marginLeft: "auto" }}
          >
            {loading ? "⟳ 生成中..." : "🔄 重新生成"}
          </button>
        )}
      </div>

      {/* Content */}
      {optimizedText ? (
        <div
          className="resume-preview-wrapper"
          style={{
            minHeight: 200,
            maxHeight: 400,
            overflow: "auto",
            borderRadius: "var(--radius-xs)",
          }}
        >
          <div
            className="resume-preview-area"
            style={{ minHeight: "auto", padding: 14 }}
          >
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontFamily: "var(--font-body)",
                fontSize: "0.78rem",
                lineHeight: 1.7,
                margin: 0,
                color: viewMode === "optimized" ? "var(--text)" : "var(--text-secondary)",
              }}
            >
              {displayText}
            </pre>
          </div>
        </div>
      ) : (
        <div className="generate-empty" style={{ padding: "20px 10px" }}>
          <div className="ge-icon" style={{ fontSize: "2rem" }}>✨</div>
          <div className="ge-title">等待生成优化简历</div>
          <div className="ge-desc">完成匹配分析后，点击"生成优化简历"查看结果</div>
        </div>
      )}

      {/* Copy button */}
      {optimizedText && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
          <button
            onClick={handleCopy}
            className="btn btn-sm btn-secondary"
          >
            {copied ? "✅ 已复制" : "📋 复制文本"}
          </button>
        </div>
      )}
    </div>
  );
}
