import { z } from "zod";

// ===== Resume Parse Result (from PDF upload) =====

export const EducationSchema = z.object({
  school: z.string().default(""),
  major: z.string().default(""),
  degree: z.string().default(""),
  gpa: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
});

export const ExperienceSchema = z.object({
  company: z.string().default(""),
  position: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  description: z.string().default(""),
  highlights: z.array(z.string()).default([]),
});

export const ProjectSchema = z.object({
  name: z.string().default(""),
  role: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  description: z.string().default(""),
  highlights: z.array(z.string()).default([]),
});

export const SkillSchema = z.object({
  name: z.string().default(""),
  proficiency: z.string().default(""), // beginner / intermediate / advanced / expert
  category: z.enum(["hard", "soft", "domain"]).default("hard"),
});

export const HonorSchema = z.object({
  name: z.string().default(""),
  level: z.string().default(""), // school / city / province / national / international
  date: z.string().default(""),
});

export const ResumeParseResultSchema = z.object({
  personal: z.object({
    name: z.string().default(""),
    phone: z.string().default(""),
    email: z.string().default(""),
    location: z.string().default(""),
    title: z.string().default(""),
  }).default({
    name: "",
    phone: "",
    email: "",
    location: "",
    title: "",
  }),
  education: z.array(EducationSchema).default([]),
  experience: z.array(ExperienceSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  skills: z.array(SkillSchema).default([]),
  honors: z.array(HonorSchema).default([]),
  rawText: z.string().default(""),
});

// ===== JD skill extraction =====

export const SkillExtractionSchema = z.object({
  hardSkills: z.array(z.object({
    name: z.string(),
    importance: z.enum(["required", "preferred", "plus"]),
    mentioned: z.boolean().default(false),
  })).default([]),
  softSkills: z.array(z.string()).default([]),
  implicitRequirements: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
});

// ===== 6-Dimension Score =====

export const DimensionScoreSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(1).default(1),
  deductionReasons: z.array(z.string()).default([]),
  relatedParagraphs: z.array(z.string()).default([]),
});

export const SixDimensionScoreSchema = z.object({
  totalScore: z.number().min(0).max(100),
  dimensions: z.array(DimensionScoreSchema).default([]),
  summary: z.string().default(""),
});

// ===== Highlight & Rewrite =====

export const HighlightAnnotationSchema = z.object({
  type: z.enum(["missing", "weak", "mismatch", "format"]),
  severity: z.enum(["high", "medium", "low"]),
  originalText: z.string(),
  startPos: z.number().default(0),
  endPos: z.number().default(0),
  reason: z.string(),
  suggestion: z.string(),
});

export const RewriteSectionSchema = z.object({
  originalText: z.string(),
  suggestedText: z.string(),
  reason: z.string(),
  dimension: z.string(),
});

// ===== Optimized Resume (simplified) =====

export const OptimizedResumeSchema = z.object({
  title: z.string().default(""),
  personal: z.record(z.string(), z.string()).default({}),
  education: z.array(EducationSchema).default([]),
  experience: z.array(ExperienceSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  skills: z.array(SkillSchema).default([]),
  honors: z.array(HonorSchema).default([]),
  summary: z.string().default(""),
  fullText: z.string().default(""),
});

// ===== Generated Types =====

export type ResumeParseResult = z.infer<typeof ResumeParseResultSchema>;
export type SkillExtraction = z.infer<typeof SkillExtractionSchema>;
export type SixDimensionScore = z.infer<typeof SixDimensionScoreSchema>;
export type DimensionScore = z.infer<typeof DimensionScoreSchema>;
export type HighlightAnnotation = z.infer<typeof HighlightAnnotationSchema>;
export type RewriteSection = z.infer<typeof RewriteSectionSchema>;
export type OptimizedResume = z.infer<typeof OptimizedResumeSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Project = z.infer<typeof ProjectSchema>;
