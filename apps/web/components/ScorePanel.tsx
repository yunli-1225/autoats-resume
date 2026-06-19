import React from "react";
import { useI18n } from "../lib/i18n/context";
import type { ScoringResult } from "../lib/scoring";
import { getScoreColor, getScoreLabel } from "../lib/scoring";

interface Props {
  score: ScoringResult | null;
  onStartAnalysis?: () => void;
  loading?: boolean;
}

function DonutChart({ score, size = 80 }: { score: number; size?: number }) {
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border-light)"
        strokeWidth={6}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={size * 0.28}
        fontWeight={700}
        fontFamily="var(--font-accent)"
      >
        {score}
      </text>
    </svg>
  );
}

export default function ScorePanel({ score, onStartAnalysis, loading }: Props) {
  const { t } = useI18n();

  return (
    <div className="card">
      <div className="card-label">
        <span className="section-icon">📊</span>
        <span>岗位匹配评分</span>
        <span className="badge">
          {score ? `总分 ${score.totalScore}` : "6维"}
        </span>
      </div>

      {!score && !loading && (
        <div className="generate-empty" style={{ padding: "20px 10px" }}>
          <div className="ge-icon" style={{ fontSize: "2rem" }}>📊</div>
          <div className="ge-title">分析匹配度</div>
          <div className="ge-desc">上传简历并解析JD后，点击下方按钮开始匹配分析</div>
          {onStartAnalysis && (
            <button onClick={onStartAnalysis} className="btn btn-gold" style={{ width: "auto", padding: "10px 24px", marginTop: 12 }}>
              🚀 开始匹配分析
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center" style={{ padding: 24 }}>
          <div className="spinner-dark" style={{ width: 32, height: 32, margin: "0 auto 12px" }} />
          <p className="text-sm text-secondary">AI 正在分析匹配度...</p>
        </div>
      )}

      {score && (
        <div>
          {/* Total Score */}
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <DonutChart score={score.totalScore} size={100} />
            <div
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: getScoreColor(score.totalScore),
                marginTop: 4,
              }}
            >
              {getScoreLabel(score.totalScore, t)}
            </div>
          </div>

          {/* Dimension Breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {score.dimensions.map((dim) => (
              <div
                key={dim.key}
                style={{
                  padding: 10,
                  borderRadius: "var(--radius-xs)",
                  background: "#f8fafc",
                  border: "1px solid var(--border-light)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: "0.78rem", color: "var(--navy)" }}>
                    {dim.name}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      color: getScoreColor(dim.score),
                      fontFamily: "var(--font-accent)",
                    }}
                  >
                    {dim.score}
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: 4,
                    background: "var(--border-light)",
                    borderRadius: 2,
                    overflow: "hidden",
                    marginBottom: dim.deductionReasons.length > 0 ? 6 : 0,
                  }}
                >
                  <div
                    style={{
                      width: `${dim.score}%`,
                      height: "100%",
                      background: getScoreColor(dim.score),
                      borderRadius: 2,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>

                {/* Deduction reasons */}
                {dim.deductionReasons.length > 0 && (
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                    {dim.deductionReasons.map((r, i) => (
                      <div key={i} style={{ display: "flex", gap: 4, marginTop: 2 }}>
                        <span style={{ color: "var(--error)" }}>⚠</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { DonutChart };
