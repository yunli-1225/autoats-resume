import React, { useState, useCallback } from "react";
import Head from "next/head";
import JDAnalyzer from "../components/JDAnalyzer";
import MaterialPanel from "../components/MaterialPanel";
import ScorePanel from "../components/ScorePanel";
import AnnotationPanel from "../components/AnnotationPanel";
import PDFExport from "../components/PDFExport";
import ResumePreview from "../components/ResumePreview";
import { callDeepSeek } from "../lib/ai/factory";
import { cleanLLMResponse } from "../lib/cleanResponse";
import { calculateAllScores, type ScoringResult } from "../lib/scoring";
import type { ResumeParseResult, SkillExtraction, HighlightAnnotation, RewriteSection } from "../lib/schema";

export default function Home() {
  const [jdText, setJdText] = useState("");
  const [extraction, setExtraction] = useState<SkillExtraction | null>(null);
  const [resume, setResume] = useState<ResumeParseResult | null>(null);
  const [score, setScore] = useState<ScoringResult | null>(null);
  const [annotations, setAnnotations] = useState<HighlightAnnotation[]>([]);
  const [rewrites, setRewrites] = useState<RewriteSection[]>([]);
  const [optimizedText, setOptimizedText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingOptimized, setGeneratingOptimized] = useState(false);

  const handleJDSubmit = useCallback((text: string, ext: SkillExtraction) => {
    setJdText(text);
    setExtraction(ext);
    setScore(null);
  }, []);

  const handleResumeParsed = useCallback((result: ResumeParseResult) => {
    setResume(result);
    setScore(null);
  }, []);

  const handleStartAnalysis = useCallback(async () => {
    if (!resume || !extraction) return;
    setAnalyzing(true);
    try {
      const scoringResult = calculateAllScores(resume, extraction);
      setScore(scoringResult);
      try {
        const resumeText = JSON.stringify(resume, null, 2);
        const prompt = `你是一位专业的简历优化顾问。分析以下简历JSON，找出所有需要改进的问题点。

简历数据：
${resumeText.slice(0, 5000)}

请以JSON格式返回，不要包含任何其他文字和Markdown标记：
{
  "annotations": [
    {
      "type": "missing|weak|mismatch|format",
      "severity": "high|medium|low",
      "originalText": "问题原文",
      "reason": "原因说明",
      "suggestion": "改进建议"
    }
  ],
  "rewrites": [
    {
      "originalText": "原文",
      "suggestedText": "改写后文本",
      "reason": "改写原因",
      "dimension": "所属维度"
    }
  ]
}
至少找出3-5个问题点。`;
        const result = await callDeepSeek(
          [{ role: "system", content: "你是一位专业的简历优化顾问，只输出JSON。" }, { role: "user", content: prompt }],
          4000, 30000
        );
        console.log('=== DeepSeek 匹配分析 成功 ===', { chars: typeof result.content === 'string' ? result.content.length : 0 });
        const cleaned = cleanLLMResponse(result.content);
        const parsed = JSON.parse(cleaned);
        setAnnotations(parsed.annotations || []);
        setRewrites(parsed.rewrites || []);
      } catch (e) { console.error("Annotation analysis failed:", e); }
    } catch (err: any) { console.error("Analysis error:", err); }
    finally { setAnalyzing(false); }
  }, [resume, extraction]);

  const handleGenerateOptimized = useCallback(async () => {
    if (!resume || !extraction) return;
    setGeneratingOptimized(true);
    try {
      const prompt = `你是一位简历优化专家。基于以下简历数据和JD技能要求，生成一份优化后的简历文本。

简历数据：
${JSON.stringify(resume, null, 2).slice(0, 4000)}

JD要求：
硬技能：${extraction.hardSkills.map(s => s.name).join("、")}
软技能：${extraction.softSkills.join("、")}
关键词：${extraction.keywords.join("、")}

请生成一份完整、专业的简历文本，使用STAR原则重写经历部分，融入JD关键词，突出匹配度。返回纯文本格式，不要使用Markdown。`;
      const result = await callDeepSeek(
        [{ role: "system", content: "你是一位专业的简历优化专家。" }, { role: "user", content: prompt }],
        4000, 60000
      );
      console.log('=== DeepSeek 简历优化 成功 ===', { chars: typeof result.content === 'string' ? result.content.length : 0 });
      setOptimizedText(result.content);
    } catch (err: any) { console.error("Optimization error:", err); }
    finally { setGeneratingOptimized(false); }
  }, [resume, extraction]);

  return (
    <>
      <Head>
        <title>AutoATS — 智能简历匹配分析</title>
        <meta name="description" content="AI-powered resume analysis and optimization" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="page-container" style={{ maxWidth: 1200 }}>
        <div className="grid-4zone" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>
          <div><JDAnalyzer onJDSubmit={handleJDSubmit} /></div>
          <div><MaterialPanel onResumeParsed={handleResumeParsed} /></div>
          <div>
            <ScorePanel score={score} onStartAnalysis={handleStartAnalysis} loading={analyzing} />
            {resume && extraction && !score && !analyzing && (
              <div className="card" style={{ textAlign: "center", padding: 20, background: "linear-gradient(135deg, #f0f4ff, #eef2ff)" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>🎯</div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--navy)", marginBottom: 4 }}>JD 和简历已就绪</div>
                <p className="hint-text" style={{ marginBottom: 12, fontStyle: "normal" }}>点击下方按钮进行6维匹配分析</p>
                <button onClick={handleStartAnalysis} className="btn btn-gold" style={{ width: "auto", padding: "12px 32px" }}>🚀 开始全维度匹配分析</button>
              </div>
            )}
            <AnnotationPanel resume={resume} onAnnotationsReady={(anns, rws) => { setAnnotations(anns); setRewrites(rws); }} />
          </div>
          <div>
            {score && !optimizedText && (
              <div className="card">
                <div className="card-label"><span className="section-icon">✨</span><span>简历优化</span></div>
                <div style={{ textAlign: "center", padding: 12 }}>
                  <p className="hint-text" style={{ marginBottom: 10, fontStyle: "normal" }}>基于匹配分析结果生成优化版简历</p>
                  <button onClick={handleGenerateOptimized} disabled={generatingOptimized} className="btn btn-gold" style={{ width: "auto", padding: "10px 24px" }}>
                    {generatingOptimized ? (<><span className="spinner" /> 生成中...</>) : ("✨ 生成优化简历")}
                  </button>
                </div>
              </div>
            )}
            {optimizedText && (
              <ResumePreview
                resume={resume}
                optimizedText={optimizedText}
                onRegenerate={handleGenerateOptimized}
                loading={generatingOptimized}
              />
            )}
            <PDFExport resume={resume} optimizedText={optimizedText} />
          </div>
        </div>
      </div>
      <style jsx>{`@media (max-width: 768px) { .grid-4zone { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
