import React, { useState, useRef, useCallback, useEffect } from "react";
import { useI18n } from "../lib/i18n/context";
import { callDeepSeek } from "../lib/ai/factory";
import { cleanLLMResponse } from "../lib/cleanResponse";
import type { ResumeParseResult } from "../lib/schema";
import { ResumeParseResultSchema } from "../lib/schema";

interface Props {
  onResumeParsed: (result: ResumeParseResult) => void;
}

// ===== Default empty data =====
const DEFAULT_RESUME: ResumeParseResult = {
  personal: { name: "", phone: "", email: "", location: "", title: "" },
  education: [],
  experience: [],
  projects: [],
  skills: [],
  honors: [],
  rawText: "",
};

const STORAGE_KEY = "autoats-material-data";

function loadSavedData(): ResumeParseResult {
  if (typeof window === "undefined") return DEFAULT_RESUME;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_RESUME;
}

function saveData(data: ResumeParseResult) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ===== Collapsible Card =====
function CollapsibleCard({ title, icon, count, children, defaultOpen = true }: {
  title: string; icon: string; count?: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: "#fff", borderRadius: "var(--radius-sm)", marginBottom: 12,
      border: "2px solid #f59e0b", boxShadow: "var(--shadow)", overflow: "hidden",
    }}>
      <div onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
        cursor: "pointer", userSelect: "none",
        borderBottom: open ? "1.5px solid #fef3c7" : "none",
      }}>
        <span style={{ fontSize: "1rem" }}>{icon}</span>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)", flex: 1, letterSpacing: "1px" }}>
          {title}
        </span>
        {count !== undefined && (
          <span style={{
            fontFamily: "var(--font-accent)", fontSize: "0.62rem", fontWeight: 600,
            background: "#fef3c7", color: "#d97706", padding: "2px 10px", borderRadius: 20,
            border: "1px solid rgba(217,119,6,0.15)",
          }}>{count}项</span>
        )}
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", transition: "transform 0.3s", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}>▼</span>
      </div>
      {open && <div style={{ padding: "10px 14px" }}>{children}</div>}
    </div>
  );
}

// ===== Personal Info =====
function PersonalSection({ data, onChange }: { data: ResumeParseResult; onChange: (d: ResumeParseResult) => void }) {
  const set = (field: string, val: string) => onChange({ ...data, personal: { ...data.personal, [field]: val } });
  return (
    <CollapsibleCard icon="👤" title="个人信息">
      <div className="field-grid">
        <input placeholder="姓名" value={data.personal.name} onChange={e => set("name", e.target.value)} />
        <input placeholder="电话" value={data.personal.phone} onChange={e => set("phone", e.target.value)} />
        <input placeholder="邮箱" value={data.personal.email} onChange={e => set("email", e.target.value)} />
        <input placeholder="目标岗位" value={data.personal.title} onChange={e => set("title", e.target.value)} />
        <input placeholder="目标城市" value={data.personal.location} onChange={e => set("location", e.target.value)} style={{ gridColumn: "1 / -1" }} />
      </div>
    </CollapsibleCard>
  );
}

// ===== Education =====
function EducationSection({ data, onChange }: { data: ResumeParseResult; onChange: (d: ResumeParseResult) => void }) {
  const add = () => onChange({ ...data, education: [...data.education, { school: "", major: "", degree: "", gpa: "", startDate: "", endDate: "" }] });
  const remove = (i: number) => onChange({ ...data, education: data.education.filter((_, idx) => idx !== i) });
  const set = (i: number, field: string, val: string) => {
    const a = [...data.education]; a[i] = { ...a[i], [field]: val }; onChange({ ...data, education: a });
  };
  return (
    <CollapsibleCard icon="🎓" title="教育背景" count={data.education.length}>
      {data.education.map((edu, i) => (
        <div key={i} className="entry-block">
          <div className="field-grid" style={{ marginBottom: 4 }}>
            <input placeholder="学校名称" value={edu.school} onChange={e => set(i, "school", e.target.value)} />
            <input placeholder="专业" value={edu.major} onChange={e => set(i, "major", e.target.value)} />
            <select value={edu.degree} onChange={e => set(i, "degree", e.target.value)}>
              <option value="">学历</option><option value="博士">博士</option><option value="硕士">硕士</option><option value="本科">本科</option><option value="大专">大专</option>
            </select>
            <input placeholder="GPA (如 3.8/4.0)" value={edu.gpa} onChange={e => set(i, "gpa", e.target.value)} />
            <div className="input-group"><label>开始</label><input type="month" value={edu.startDate} onChange={e => set(i, "startDate", e.target.value)} /></div>
            <div className="input-group"><label>结束</label><input type="month" value={edu.endDate} onChange={e => set(i, "endDate", e.target.value)} /></div>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => remove(i)}>🗑️ 删除</button>
        </div>
      ))}
      <div className="add-row"><button className="btn btn-sm btn-outline" onClick={add}>+ 添加教育经历</button></div>
    </CollapsibleCard>
  );
}

// ===== Work Experience =====
function WorkSection({ data, onChange }: { data: ResumeParseResult; onChange: (d: ResumeParseResult) => void }) {
  const add = () => onChange({ ...data, experience: [...data.experience, { company: "", position: "", startDate: "", endDate: "", description: "", highlights: [] }] });
  const remove = (i: number) => onChange({ ...data, experience: data.experience.filter((_, idx) => idx !== i) });
  const set = (i: number, field: string, val: string) => {
    const a = [...data.experience]; a[i] = { ...a[i], [field]: val }; onChange({ ...data, experience: a });
  };
  return (
    <CollapsibleCard icon="💼" title="工作/实习经历" count={data.experience.length}>
      {data.experience.map((w, i) => (
        <div key={i} className="entry-block">
          <div className="field-grid" style={{ marginBottom: 4 }}>
            <input placeholder="公司名称" value={w.company} onChange={e => set(i, "company", e.target.value)} />
            <input placeholder="职位" value={w.position} onChange={e => set(i, "position", e.target.value)} />
            <div className="input-group"><label>开始</label><input type="month" value={w.startDate} onChange={e => set(i, "startDate", e.target.value)} /></div>
            <div className="input-group"><label>结束</label><input type="month" value={w.endDate} onChange={e => set(i, "endDate", e.target.value)} /></div>
          </div>
          <textarea placeholder="描述工作内容和职责" value={w.description} onChange={e => set(i, "description", e.target.value)} rows={3} />
          <button className="btn btn-sm btn-secondary" onClick={() => remove(i)} style={{ marginTop: 4 }}>🗑️ 删除</button>
        </div>
      ))}
      <div className="add-row"><button className="btn btn-sm btn-outline" onClick={add}>+ 添加工作经历</button></div>
    </CollapsibleCard>
  );
}

// ===== Projects =====
function ProjectSection({ data, onChange }: { data: ResumeParseResult; onChange: (d: ResumeParseResult) => void }) {
  const add = () => onChange({ ...data, projects: [...data.projects, { name: "", role: "", startDate: "", endDate: "", description: "", highlights: [] }] });
  const remove = (i: number) => onChange({ ...data, projects: data.projects.filter((_, idx) => idx !== i) });
  const set = (i: number, field: string, val: string) => {
    const a = [...data.projects]; a[i] = { ...a[i], [field]: val }; onChange({ ...data, projects: a });
  };
  return (
    <CollapsibleCard icon="🏆" title="项目经历" count={data.projects.length}>
      {data.projects.map((p, i) => (
        <div key={i} className="entry-block">
          <div className="field-grid" style={{ marginBottom: 4 }}>
            <input placeholder="项目名称" value={p.name} onChange={e => set(i, "name", e.target.value)} />
            <input placeholder="角色" value={p.role} onChange={e => set(i, "role", e.target.value)} />
            <div className="input-group"><label>开始</label><input type="month" value={p.startDate} onChange={e => set(i, "startDate", e.target.value)} /></div>
            <div className="input-group"><label>结束</label><input type="month" value={p.endDate} onChange={e => set(i, "endDate", e.target.value)} /></div>
          </div>
          <textarea placeholder="描述项目内容和技术实现" value={p.description} onChange={e => set(i, "description", e.target.value)} rows={3} />
          <button className="btn btn-sm btn-secondary" onClick={() => remove(i)} style={{ marginTop: 4 }}>🗑️ 删除</button>
        </div>
      ))}
      <div className="add-row"><button className="btn btn-sm btn-outline" onClick={add}>+ 添加项目经历</button></div>
    </CollapsibleCard>
  );
}

// ===== Skills =====
const PROFICIENCIES = ["了解", "熟练", "精通", "掌握"];
function SkillSection({ data, onChange }: { data: ResumeParseResult; onChange: (d: ResumeParseResult) => void }) {
  const [newName, setNewName] = useState("");
  const [newProf, setNewProf] = useState("熟练");
  const addSkill = () => {
    const n = typeof newName === 'string' ? newName.trim() : '';
    if (!n || data.skills.some(s => s.name === n)) return;
    onChange({ ...data, skills: [...data.skills, { name: n, proficiency: newProf, category: "hard" as const }] });
    setNewName("");
  };
  const removeSkill = (i: number) => onChange({ ...data, skills: data.skills.filter((_, idx) => idx !== i) });

  return (
    <CollapsibleCard icon="🔧" title="技能列表" count={data.skills.length}>
      {data.skills.length === 0 && <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: 8 }}>还没有添加技能</span>}
      <div className="skill-chips">
        {data.skills.map((skill, i) => (
          <div key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 12px 4px 14px", borderRadius: 20,
            border: "2px solid #f59e0b", background: "#fffbeb",
            fontSize: "0.78rem", fontWeight: 500, color: "#92400e",
          }}>
            <span>{skill.name}</span>
            <span style={{ fontSize: "0.65rem", background: "#fde68a", padding: "1px 7px", borderRadius: 10, color: "#92400e", fontWeight: 600 }}>{skill.proficiency}</span>
            <button onClick={() => removeSkill(i)} style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 16, height: 16, borderRadius: "50%", border: "none",
              background: "rgba(146,64,14,0.12)", color: "#92400e",
              fontSize: "0.6rem", cursor: "pointer", padding: 0, lineHeight: 1,
            }}>✕</button>
          </div>
        ))}
      </div>
      <div className="skill-add-form">
        <input placeholder="输入技能名称" value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); }}} />
        <select value={newProf} onChange={e => setNewProf(e.target.value)}>
          {PROFICIENCIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="btn btn-sm btn-outline" onClick={addSkill}>添加</button>
      </div>
    </CollapsibleCard>
  );
}

// ===== Honors =====
function HonorSection({ data, onChange }: { data: ResumeParseResult; onChange: (d: ResumeParseResult) => void }) {
  const add = () => onChange({ ...data, honors: [...data.honors, { name: "", level: "", date: "" }] });
  const remove = (i: number) => onChange({ ...data, honors: data.honors.filter((_, idx) => idx !== i) });
  const set = (i: number, field: string, val: string) => {
    const a = [...data.honors]; a[i] = { ...a[i], [field]: val }; onChange({ ...data, honors: a });
  };
  return (
    <CollapsibleCard icon="🏅" title="荣誉与证书" count={data.honors.length} defaultOpen={false}>
      {data.honors.map((h, i) => (
        <div key={i} className="entry-block">
          <div className="field-grid" style={{ marginBottom: 4 }}>
            <input placeholder="荣誉/证书名称" value={h.name} onChange={e => set(i, "name", e.target.value)} />
            <select value={h.level} onChange={e => set(i, "level", e.target.value)}>
              <option value="">级别</option><option value="校级">校级</option><option value="市级">市级</option><option value="省级">省级</option><option value="国家级">国家级</option><option value="国际级">国际级</option>
            </select>
            <div className="input-group" style={{ gridColumn: "1 / -1" }}><label>获得时间</label><input type="month" value={h.date} onChange={e => set(i, "date", e.target.value)} /></div>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => remove(i)}>🗑️ 删除</button>
        </div>
      ))}
      <div className="add-row"><button className="btn btn-sm btn-outline" onClick={add}>+ 添加荣誉/证书</button></div>
    </CollapsibleCard>
  );
}

// ===== Main MaterialPanel =====
export default function MaterialPanel({ onResumeParsed }: Props) {
  const { t } = useI18n();
  const [data, setData] = useState<ResumeParseResult>(DEFAULT_RESUME);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "upload">("form");
  const fileRef = useRef<HTMLInputElement>(null);

  // Load saved data on mount
  useEffect(() => {
    const saved = loadSavedData();
    if (saved.personal.name || saved.education.length > 0 || saved.experience.length > 0) {
      setData(saved);
      onResumeParsed(saved);
    }
  }, []);

  // Save and emit on change
  const handleChange = useCallback((d: ResumeParseResult) => {
    setData(d);
    saveData(d);
    onResumeParsed(d);
  }, [onResumeParsed]);

  // PDF upload
  const handleFile = async (f: File) => {
    if (f.type !== "application/pdf" && !f.name.endsWith(".pdf")) {
      setError("请上传 PDF 格式的简历文件");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", f);
      const response = await fetch("/api/parse-pdf", {
        method: "POST", body: formData,
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `PDF解析失败 (${response.status})`);
      }
      const { text } = await response.json();
      if (typeof text !== "string" || !text.trim()) {
        setError("未能从PDF中提取到文字内容");
        setLoading(false);
        return;
      }

      // Call DeepSeek to parse the resume text (with retry)
      const prompt = `你是一位简历解析专家。分析以下简历文本，提取结构化信息。

简历文本：
${text.slice(0, 5000)}

JSON格式：
{"personal":{"name":"姓名","phone":"电话","email":"邮箱","location":"地点","title":"职位"},"education":[{"school":"学校","major":"专业","degree":"学历","gpa":"","startDate":"","endDate":""}],"experience":[{"company":"公司","position":"职位","startDate":"","endDate":"","description":"工作描述","highlights":[]}],"projects":[{"name":"项目名","role":"角色","startDate":"","endDate":"","description":"项目描述","highlights":[]}],"skills":[{"name":"技能名","proficiency":"熟练程度","category":"hard"}],"honors":[{"name":"荣誉名称","level":"级别","date":""}],"rawText":""}

返回纯JSON，不要任何其他文字。`;

      // Retry up to 2 times with 90s timeout
      let lastErr: any;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await callDeepSeek(
            [{ role: "system", content: "你是简历解析专家，只输出JSON。" }, { role: "user", content: prompt }],
            5000, 90000
          );
          console.log('=== DeepSeek 简历解析 成功 ===', { attempt: attempt + 1, chars: typeof result.content === 'string' ? result.content.length : 0 });
          const cleaned = cleanLLMResponse(result.content);
          const parsedData: ResumeParseResult = JSON.parse(cleaned);
          parsedData.rawText = text;
          const validated = ResumeParseResultSchema.parse(parsedData);
          handleChange(validated);
          setActiveTab("form");
          setLoading(false);
          return;
        } catch (err: any) {
          lastErr = err;
          if (err.message?.includes("QUOTA_EXHAUSTED")) break;
          // Wait 1s before retry
          if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
        }
      }
      // === Fallback: AI failed, use local rules to extract basic info ===
      console.log("=== DeepSeek 结构化失败，使用本地规则提取 ===");
      const basicInfo = extractBasicInfo(text);
      const fallbackData: ResumeParseResult = {
        personal: { name: basicInfo.name, phone: basicInfo.phone, email: basicInfo.email,
          title: basicInfo.target, location: basicInfo.location },
        education: [], experience: [], projects: [], skills: [], honors: [], rawText: text,
      };
      handleChange(fallbackData);
      setActiveTab("form");
      setError("AI 结构化解析失败，已使用本地规则提取基本信息，请手动补充完善");
      setLoading(false);
      return;

    } catch (err: any) {
      setError(err.message || "AI解析超时，请尝试手动填写简历信息");
    } finally {
      setLoading(false);
    }
  };

  /** 本地规则提取基本信息（DeepSeek 失败时的 fallback） */
  function extractBasicInfo(raw: string) {
    const name = raw.match(/^([A-Za-z一-鿿]{2,4})/)?.[1] || "";
    const phone = raw.match(/(1[3-9]\d{9})/)?.[1] || "";
    const email = raw.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/)?.[1] || "";
    const target = raw.match(/(?:目标|求职|应聘|意向)[岗位职位]?[：:]\s*(.+)/)?.[1] || "";
    const location = raw.match(/(?:城市|地点|base|Base|地点)[：:]\s*(\S+)/)?.[1] || "";
    return { name, phone, email, target, location };
  }

  return (
    <div className="card">
      <div className="card-label">
        <span className="section-icon">📋</span>
        <span>素材上传</span>
        <span className="badge">
          {data.personal.name ? `${data.personal.name}` : "待填写"}
        </span>
      </div>

      {/* Tab toggle */}
      <div className="email-selector" style={{ marginBottom: 10, display: "flex", gap: 4 }}>
        <button
          className={`email-chip ${activeTab === "form" ? "active" : ""}`}
          onClick={() => setActiveTab("form")}
        >
          ✏️ 手动填写
        </button>
        <button
          className={`email-chip ${activeTab === "upload" ? "active" : ""}`}
          onClick={() => setActiveTab("upload")}
        >
          📄 上传 PDF 解析
        </button>
      </div>

      {/* Upload tab */}
      {activeTab === "upload" && (
        <div style={{ marginBottom: 12 }}>
          <div
            className="import-zone"
            style={{
              borderColor: dragOver ? "var(--navy-light)" : undefined,
              background: dragOver ? "linear-gradient(135deg, #f0f4ff 0%, #eef2ff 100%)" : undefined,
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
          >
            <span className="import-icon">📄</span>
            <div className="import-text">
              <div className="import-title">点击上传或拖拽 PDF 简历到这里</div>
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
          {loading && (
            <div className="text-center" style={{ padding: 12 }}>
              <div className="spinner-dark" style={{ width: 24, height: 24, margin: "0 auto 8px" }} />
              <span className="text-sm text-secondary">正在解析简历...</span>
            </div>
          )}
          {error && <div className="error-banner">{error}</div>}
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "center", marginTop: 6 }}>
            PDF 上传后自动解析并填充到下方表单，可手动修改
          </div>
        </div>
      )}

      {/* Form sections */}
      <PersonalSection data={data} onChange={handleChange} />
      <EducationSection data={data} onChange={handleChange} />
      <WorkSection data={data} onChange={handleChange} />
      <ProjectSection data={data} onChange={handleChange} />
      <SkillSection data={data} onChange={handleChange} />
      <HonorSection data={data} onChange={handleChange} />

      {/* Data summary */}
      {data.personal.name && (
        <div style={{
          fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "center",
          padding: "6px", borderTop: "1px solid var(--border-light)", marginTop: 4,
        }}>
          ✅ 共 {data.education.length} 条教育、{data.experience.length} 条工作、{data.projects.length} 条项目、{data.skills.length} 项技能
        </div>
      )}
    </div>
  );
}
