// 6-dimension matching score calculation
import type { ResumeParseResult, SkillExtraction } from "./schema";

export const DIMENSIONS = [
  { key: "skillMatch", name: "技能匹配度", nameEn: "Skill Match", weight: 0.25 },
  { key: "experienceMatch", name: "经验匹配度", nameEn: "Experience Match", weight: 0.25 },
  { key: "educationMatch", name: "教育匹配度", nameEn: "Education Match", weight: 0.15 },
  { key: "certMatch", name: "证书匹配度", nameEn: "Certification Match", weight: 0.10 },
  { key: "softSkillMatch", name: "软技能匹配度", nameEn: "Soft Skill Match", weight: 0.15 },
  { key: "cultureMatch", name: "文化匹配度", nameEn: "Culture Fit", weight: 0.10 },
];

export interface DimensionResult {
  key: string;
  name: string;
  nameEn: string;
  score: number;
  weight: number;
  deductionReasons: string[];
  relatedParagraphs: string[];
}

export interface ScoringResult {
  dimensions: DimensionResult[];
  totalScore: number;
}

export function calculateSkillMatch(
  resumeSkills: string[],
  jdHardSkills: string[],
  jdKeywords: string[]
): DimensionResult {
  const deductions: string[] = [];
  const paragraphs: string[] = [];

  if (jdHardSkills.length === 0) {
    return {
      key: "skillMatch",
      name: "技能匹配度",
      nameEn: "Skill Match",
      score: 50,
      weight: 0.25,
      deductionReasons: [],
      relatedParagraphs: [],
    };
  }

  const matched = jdHardSkills.filter((s) =>
    resumeSkills.some((rs) => rs.toLowerCase().includes(s.toLowerCase()))
  );
  const matchedCount = matched.length;
  const totalCount = jdHardSkills.length;
  const ratio = totalCount > 0 ? matchedCount / totalCount : 0;
  const score = Math.round(ratio * 100);

  // Deduction reasons for missing skills
  const missing = jdHardSkills.filter(
    (s) => !resumeSkills.some((rs) => rs.toLowerCase().includes(s.toLowerCase()))
  );
  if (missing.length > 0) {
    deductions.push(`缺少以下硬技能：${missing.slice(0, 5).join("、")}${missing.length > 5 ? `等${missing.length}项` : ""}`);
  }

  // Check for low overlap
  if (ratio < 0.3) {
    deductions.push("技能覆盖率低于30%，与岗位要求差距较大");
  } else if (ratio < 0.6) {
    deductions.push("技能覆盖率不足，建议补充岗位所需核心技术栈");
  }

  return {
    key: "skillMatch",
    name: "技能匹配度",
    nameEn: "Skill Match",
    score,
    weight: 0.25,
    deductionReasons: deductions,
    relatedParagraphs: paragraphs,
  };
}

export function calculateExperienceMatch(
  resume: ResumeParseResult,
  jdKeywords: string[]
): DimensionResult {
  const deductions: string[] = [];
  const allExpText = [
    ...resume.experience.map((e) => `${e.position} ${e.description}`),
    ...resume.projects.map((p) => `${p.role} ${p.description}`),
  ].join(" ");

  if (typeof allExpText !== 'string' || !allExpText.trim()) {
    return {
      key: "experienceMatch",
      name: "经验匹配度",
      nameEn: "Experience Match",
      score: 0,
      weight: 0.25,
      deductionReasons: ["未提供工作或项目经历"],
      relatedParagraphs: [],
    };
  }

  // Count experience years roughly
  const expCount = resume.experience.length;
  const projCount = resume.projects.length;

  // Score based on keyword mentions in experience
  const jdLower = jdKeywords.join(" ").toLowerCase();
  const matchedKeywords = jdKeywords.filter((kw) =>
    allExpText.toLowerCase().includes(kw.toLowerCase())
  );
  const keywordRatio =
    jdKeywords.length > 0 ? matchedKeywords.length / jdKeywords.length : 0;

  let score = Math.round(keywordRatio * 60) + Math.min(expCount * 10, 20) + Math.min(projCount * 5, 20);
  score = Math.min(score, 100);

  if (score < 30) {
    deductions.push("经历与岗位要求关键词匹配度低");
  }
  if (expCount === 0) {
    deductions.push("缺少正式工作经历");
  }
  if (keywordRatio < 0.2) {
    deductions.push("经历描述中缺少行业相关术语，建议加入JD关键词");
  }

  return {
    key: "experienceMatch",
    name: "经验匹配度",
    nameEn: "Experience Match",
    score,
    weight: 0.25,
    deductionReasons: deductions,
    relatedParagraphs: [],
  };
}

export function calculateEducationMatch(
  resume: ResumeParseResult,
  jdKeywords: string[]
): DimensionResult {
  const deductions: string[] = [];
  const edu = resume.education;

  if (edu.length === 0) {
    return {
      key: "educationMatch",
      name: "教育匹配度",
      nameEn: "Education Match",
      score: 0,
      weight: 0.15,
      deductionReasons: ["未提供教育经历"],
      relatedParagraphs: [],
    };
  }

  // Check if education is relevant: major matches JD keywords
  const majorText = edu.map((e) => e.major).join(" ");
  const hasRelevantMajor = jdKeywords.some((kw) =>
    majorText.toLowerCase().includes(kw.toLowerCase())
  );

  let score = hasRelevantMajor ? 80 : 50; // Base score
  if (edu.length >= 2) score += 10; // Multiple educations
  if (edu.some((e) => e.degree.includes("硕士") || e.degree.includes("博士"))) score += 10;
  score = Math.min(score, 100);

  if (!hasRelevantMajor) {
    deductions.push("专业方向与岗位要求不直接相关");
  }
  if (edu[0]?.gpa && parseFloat(edu[0].gpa) < 3.0) {
    deductions.push("GPA较低，建议突出项目经验弥补");
  }

  return {
    key: "educationMatch",
    name: "教育匹配度",
    nameEn: "Education Match",
    score,
    weight: 0.15,
    deductionReasons: deductions,
    relatedParagraphs: [],
  };
}

export function calculateCertMatch(
  resume: ResumeParseResult,
  jdKeywords: string[]
): DimensionResult {
  const deductions: string[] = [];
  const honors = resume.honors.map((h) => h.name).join(" ");
  const allText = [...resume.skills.map((s) => s.name), honors].join(" ");

  const certKeywords = ["证", "证书", "认证", "certification", "资格", "执照", "CPA", "CFA", "PMP", "ACCA", "律师", "建造师"];
  const matchedCerts = certKeywords.filter((ck) => allText.includes(ck));
  const hasJdCertMatch = jdKeywords.some((kw) => allText.toLowerCase().includes(kw.toLowerCase()));

  let score = 0;
  if (matchedCerts.length > 0) score += matchedCerts.length * 20;
  if (hasJdCertMatch) score += 30;
  score = Math.min(score, 100);

  if (score < 40) {
    deductions.push("缺少相关资质证书或认证");
  }
  if (!hasJdCertMatch) {
    deductions.push("未发现JD要求的特定资质");
  }

  return {
    key: "certMatch",
    name: "证书匹配度",
    nameEn: "Certification Match",
    score,
    weight: 0.1,
    deductionReasons: deductions,
    relatedParagraphs: [],
  };
}

export function calculateSoftSkillMatch(
  resume: ResumeParseResult,
  jdSoftSkills: string[]
): DimensionResult {
  const deductions: string[] = [];
  const allResumeText = [
    ...resume.experience.map((e) => e.description),
    ...resume.projects.map((p) => p.description),
    ...resume.skills.filter((s) => s.category === "soft").map((s) => s.name),
  ].join(" ");

  if (jdSoftSkills.length === 0) {
    return {
      key: "softSkillMatch",
      name: "软技能匹配度",
      nameEn: "Soft Skill Match",
      score: 60,
      weight: 0.15,
      deductionReasons: [],
      relatedParagraphs: [],
    };
  }

  const matched = jdSoftSkills.filter((s) =>
    allResumeText.toLowerCase().includes(s.toLowerCase())
  );
  const ratio = matched.length / jdSoftSkills.length;
  let score = Math.round(ratio * 100);

  if (ratio < 0.3) {
    deductions.push("简历中对软技能的体现不足，建议在经历描述中融入团队协作、沟通等关键词");
  }

  return {
    key: "softSkillMatch",
    name: "软技能匹配度",
    nameEn: "Soft Skill Match",
    score,
    weight: 0.15,
    deductionReasons: deductions,
    relatedParagraphs: [],
  };
}

export function calculateCultureMatch(
  resume: ResumeParseResult,
  implicitRequirements: string[]
): DimensionResult {
  const deductions: string[] = [];
  const allText = [
    ...resume.experience.map((e) => e.description),
    ...resume.projects.map((p) => p.description),
    resume.summary,
  ].join(" ");

  if (implicitRequirements.length === 0) {
    return {
      key: "cultureMatch",
      name: "文化匹配度",
      nameEn: "Culture Fit",
      score: 70,
      weight: 0.1,
      deductionReasons: [],
      relatedParagraphs: [],
    };
  }

  const matched = implicitRequirements.filter((r) =>
    allText.toLowerCase().includes(r.toLowerCase())
  );
  const ratio = matched.length / implicitRequirements.length;
  let score = Math.round(ratio * 100);

  if (ratio < 0.3) {
    deductions.push("简历中未体现JD隐含的企业文化/隐性要求");
  }

  return {
    key: "cultureMatch",
    name: "文化匹配度",
    nameEn: "Culture Fit",
    score,
    weight: 0.1,
    deductionReasons: deductions,
    relatedParagraphs: [],
  };
}

export function calculateAllScores(
  resume: ResumeParseResult,
  extraction: SkillExtraction
): ScoringResult {
  const jdKeywords = extraction.keywords.length > 0 ? extraction.keywords : extraction.hardSkills.map((s) => s.name);

  const dimensions = [
    calculateSkillMatch(
      resume.skills.map((s) => s.name),
      extraction.hardSkills.map((s) => s.name),
      jdKeywords
    ),
    calculateExperienceMatch(resume, jdKeywords),
    calculateEducationMatch(resume, jdKeywords),
    calculateCertMatch(resume, jdKeywords),
    calculateSoftSkillMatch(resume, extraction.softSkills),
    calculateCultureMatch(resume, extraction.implicitRequirements),
  ];

  const totalScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0)
  );

  return { dimensions, totalScore };
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "var(--warning)";
  return "var(--error)";
}

export function getScoreLabel(score: number, t: (key: string) => string): string {
  if (score >= 80) return t("score.excellent") || "优秀";
  if (score >= 60) return t("score.good") || "良好";
  if (score >= 40) return t("score.average") || "一般";
  return t("score.poor") || "待提升";
}
