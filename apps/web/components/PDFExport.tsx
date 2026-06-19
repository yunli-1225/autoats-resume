import React, { useState, useRef, useMemo } from "react";
import { useI18n } from "../lib/i18n/context";
import type { ResumeParseResult } from "../lib/schema";

interface Props { resume: ResumeParseResult | null; optimizedText?: string; }

type ModuleKey = "work" | "project" | "education" | "skills";
const ALL_MODULES: { key: ModuleKey; label: string; icon: string }[] = [
  { key: "work", label: "工作经历", icon: "💼" },
  { key: "project", label: "项目经历", icon: "🏆" },
  { key: "education", label: "教育背景", icon: "🎓" },
  { key: "skills", label: "技能与工具", icon: "🔧" },
];

/** 加粗标题 + 深蓝分割线 */
function SectionH({ label }: { label: string }) {
  return (
    <div style={{fontSize:11,fontWeight:700,color:"#1e3a5f",borderBottom:"2px solid #1e3a5f",paddingBottom:2,marginTop:8,marginBottom:5,letterSpacing:0.5}}>
      {label}
    </div>
  );
}

/** 把优化文本按常见标题拆分，给每个模块加分割线+加粗 */
function parseOptimizedText(text: string) {
  // 匹配任何包含常见标题关键词的行（无论前缀格式）
  const sectionWords = "教育经历|工作经历|实习经历|项目经历|专业技能|技能与工具|荣誉奖项|荣誉|自我评价|个人总结|个人简介|教育背景|证书资质|证书|基本信息";
  const re = new RegExp("(?:^|^[#*•●╌\\-\\s]*)(?:" + sectionWords + ")", "");
  const out: React.ReactNode[] = [];
  let buf: string[] = [], key = 0;
  const flush = () => {
    if (!buf.length) return;
    out.push(<div key={key++} style={{fontSize:10,lineHeight:1.6,marginBottom:4,whiteSpace:"pre-wrap"}}>{buf.join("\n")}</div>);
    buf = [];
  };
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const m = trimmed.match(re);
    if (m && m[0].length >= 4) {
      flush();
      out.push(<SectionH key={`h${key++}`} label={m[0].replace(/^[#*•●╌\-\s]+/, "")} />);
    } else if (trimmed) {
      buf.push(line);
    } else if (buf.length) {
      buf.push("");
    }
  }
  flush();
  return out;
}

export default function PDFExport({ resume, optimizedText }: Props) {
  const { t } = useI18n();
  const previewRef = useRef<HTMLDivElement>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [moduleOrder, setModuleOrder] = useState<ModuleKey[]>(["work","project","education","skills"]);
  const dragRef = useRef<ModuleKey | null>(null);
  const [dragKey, setDragKey] = useState<ModuleKey | null>(null);
  const hasData = !!(resume || optimizedText);

  // 拖拽：用 ref 避免 stale closure
  const handleDragStart = (e: React.DragEvent, key: ModuleKey) => {
    e.dataTransfer.setData("text/plain", key);
    e.dataTransfer.effectAllowed = "move";
    dragRef.current = key;
    setDragKey(key);
  };
  const handleDragOver = (e: React.DragEvent, key: ModuleKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const src = dragRef.current;
    if (!src || src === key) return;
    setModuleOrder(prev => {
      const from = prev.indexOf(src), to = prev.indexOf(key);
      if (from === -1 || to === -1) return prev;
      const nx = [...prev];
      nx.splice(from, 1);
      nx.splice(to, 0, src);
      return nx;
    });
  };
  const handleDragEnd = () => { dragRef.current = null; setDragKey(null); };

  // 模块渲染器
  const renderModule = (key: ModuleKey) => {
    switch (key) {
      case "education":
        if (!resume?.education?.length) return null;
        return (<div key={key}><SectionH label="🎓 教育背景" />{resume.education.map((e,i)=>(
          <div key={i} style={{fontSize:10,marginBottom:3}}><strong>{e.school}</strong>{e.major?" · "+e.major:""}{e.degree?" · "+e.degree:""}
          <div style={{fontSize:9,color:"#888"}}>{e.startDate}-{e.endDate}{e.gpa?" | GPA: "+e.gpa:""}</div></div>
        ))}</div>);
      case "work":
        if (!resume?.experience?.length) return null;
        return (<div key={key}><SectionH label="💼 工作经历" />{resume.experience.slice(0,4).map((e,i)=>(
          <div key={i} style={{fontSize:10,marginBottom:4}}><strong>{e.company}</strong>{" · "}{e.position}
          <span style={{float:"right",fontSize:9,color:"#888"}}>{e.startDate}-{e.endDate||"至今"}</span>
          {e.description?<div style={{fontSize:9,marginTop:1,color:"#444"}}>{e.description}</div>:null}</div>
        ))}</div>);
      case "project":
        if (!resume?.projects?.length) return null;
        return (<div key={key}><SectionH label="🏆 项目经历" />{resume.projects.slice(0,4).map((p,i)=>(
          <div key={i} style={{fontSize:10,marginBottom:4}}><strong>{p.name}</strong>{" · "}{p.role}
          <span style={{float:"right",fontSize:9,color:"#888"}}>{p.startDate}-{p.endDate||"至今"}</span>
          {p.description?<div style={{fontSize:9,marginTop:1,color:"#444"}}>{p.description}</div>:null}</div>
        ))}</div>);
      case "skills":
        if (!resume?.skills?.length && !resume?.honors?.length) return null;
        return (<div key={key}><SectionH label="🔧 技能与工具" />
          {resume.skills?.length?<p style={{fontSize:10,marginBottom:3}}>{resume.skills.map(s=>s.name).join(" · ")}</p>:null}
          {resume.honors?.length?<div style={{fontSize:10,marginTop:2,color:"#444"}}><strong>荣誉：</strong>{resume.honors.map((h,i)=><span key={i}>{h.name}{h.level?" ("+h.level+")":""}{i<resume.honors.length-1?" · ":""}</span>)}</div>:null}
        </div>);
    }
  };
  const renderedModules = useMemo(() => moduleOrder.map(k=>renderModule(k)).filter(Boolean), [moduleOrder, resume]);

  // ===== PDF 导出：全部使用 html2canvas（中文正确、不分截图/文本两条路径）=====
  const handleExportPDF = async () => {
    setGenerating(true);
    try {
      const [{ default: jsPDF }, { default: h2c }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const el = previewRef.current;
      if (!el) { alert("预览区域未就绪"); setGenerating(false); return; }

      const mh = el.style.maxHeight;
      const ov = el.style.overflow;
      el.style.maxHeight = "none";
      el.style.overflow = "visible";
      await new Promise(r => setTimeout(r, 200));

      const cv = await h2c(el, { scale: 2, useCORS: true, logging: false });

      el.style.maxHeight = mh;
      el.style.overflow = ov;

      const imgData = cv.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ih = (cv.height * pw) / cv.width;
      pdf.addImage(imgData, "PNG", 0, 0, pw, Math.min(ih, ph));

      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      const a = document.createElement("a");
      a.href = url;
      a.download = "resume.pdf";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 5000);
    } catch (err: any) {
      console.error("PDF export error:", err);
      alert("PDF导出失败: " + (err.message || "未知错误"));
    } finally { setGenerating(false); }
  };

  return (
    <div className="card">
      <div className="card-label"><span className="section-icon">📥</span><span>PDF 导出</span><span className="badge">{pdfUrl?"就绪":"拖拽排序"}</span></div>

      {/* 拖拽排序 — 只在结构化模块展示时有效 */}
      {hasData && !optimizedText && (
        <div style={{display:"flex",gap:4,marginBottom:6,flexWrap:"wrap",justifyContent:"center"}}>
          {moduleOrder.map(key=>{
            const d=ALL_MODULES.find(m=>m.key===key)!;
            return (<div key={key} draggable
              onDragStart={e=>handleDragStart(e,key)}
              onDragOver={e=>handleDragOver(e,key)}
              onDragEnd={handleDragEnd}
              style={{padding:"4px 10px",borderRadius:14,fontSize:"0.7rem",fontWeight:dragKey===key?700:500,cursor:"grab",userSelect:"none",whiteSpace:"nowrap",
                background:dragKey===key?"var(--primary-lighter)":"#f1f5f9",border:"1.5px solid",
                borderColor:dragKey===key?"var(--navy-light)":"var(--border)",color:dragKey===key?"var(--navy)":"var(--text-secondary)"}}>
              ⠿ {d.icon} {d.label}</div>);
          })}
          <span style={{fontSize:"0.65rem",color:"var(--text-muted)",alignSelf:"center"}}>↕ 拖拽排序</span>
        </div>
      )}

      {/* 预览区域 */}
      <div ref={previewRef} style={{padding:14,fontFamily:"'Noto Sans SC','Microsoft YaHei','PingFang SC',sans-serif",fontSize:10.5,lineHeight:1.5,color:"#000",background:"#fff",maxHeight:260,overflow:"auto",border:"1px solid var(--border)",borderRadius:"var(--radius-xs)",marginBottom:10}}>
        {optimizedText ? (
          <div>
            {resume?.personal?.name && (<div style={{textAlign:"center",marginBottom:8}}><h3 style={{fontSize:16,fontWeight:700,marginBottom:1}}>{resume.personal.name}</h3><p style={{fontSize:9,color:"#666"}}>{[resume.personal.title,resume.personal.phone,resume.personal.email,resume.personal.location].filter(Boolean).join("  |  ")}</p></div>)}
            {parseOptimizedText(optimizedText)}
          </div>
        ) : (
          <>{resume?.personal?.name && (<div style={{textAlign:"center",marginBottom:8}}><h3 style={{fontSize:16,fontWeight:700,marginBottom:1}}>{resume.personal.name}</h3><p style={{fontSize:9,color:"#666"}}>{[resume.personal.title,resume.personal.phone,resume.personal.email,resume.personal.location].filter(Boolean).join("  |  ")}</p></div>)}
          {renderedModules}</>
        )}
      </div>

      {/* 按钮 */}
      <div style={{textAlign:"center",padding:8}}>
        {!hasData?(<div className="generate-empty" style={{padding:"10px"}}><div className="ge-icon" style={{fontSize:"2rem"}}>📄</div><div className="ge-desc">完成后可导出 PDF</div></div>):(<>
          {pdfUrl&&(<div className="resume-preview-wrapper" style={{minHeight:200,marginBottom:8}}><iframe src={pdfUrl} style={{width:"100%",height:"40vh",border:"none"}} title="预览"/></div>)}
          <button onClick={handleExportPDF} disabled={generating} className="btn btn-gold" style={{width:"auto",padding:"14px 44px",fontSize:"0.95rem"}}>
            {generating?<><span className="spinner"/> 生成中...</>:"📥 下载简历 PDF"}
          </button>
          {pdfUrl&&(<div style={{marginTop:8}}><a href={pdfUrl} download="resume.pdf" className="btn btn-sm btn-secondary" style={{textDecoration:"none"}}>🔄 重新下载</a></div>)}
        </>)}
      </div>
    </div>
  );
}
