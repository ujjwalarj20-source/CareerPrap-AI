export interface User {
  id: string;
  name: string;
  email: string;
  targetRole: string | null;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.message ?? 'Something went wrong', body?.error?.details);
  }
  return body as T;
}

export const authApi = {
  register: (data: { name: string; email: string; password: string; targetRole?: string }) =>
    request<{ user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/auth/me'),
};

export type ParsingStatus = 'UPLOADED' | 'PARSING' | 'COMPLETED' | 'FAILED';

export interface StructuredResume {
  name: string | null;
  email: string | null;
  phone: string | null;
  summary: string | null;
  skills: string[];
  experience: {
    title: string | null;
    company: string | null;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
    highlights: string[];
  }[];
  education: {
    degree: string | null;
    field: string | null;
    institution: string | null;
    startDate: string | null;
    endDate: string | null;
    grade: string | null;
  }[];
  projects: { name: string | null; description: string | null; technologies: string[] }[];
  certifications: { name: string | null; issuer: string | null; date: string | null }[];
  achievements: string[];
  languages: string[];
  jobTitles: string[];
  yearsOfExperience: number | null;
}

export interface Resume {
  id: string;
  originalFileName: string;
  fileType: 'pdf' | 'docx';
  fileSize: number;
  parsingStatus: ParsingStatus;
  parsingError: string | null;
  structuredResumeData: StructuredResume | null;
  createdAt: string;
  updatedAt: string;
}

export const resumeApi = {
  list: () => request<{ resumes: Resume[] }>('/resumes'),
  get: (id: string) => request<{ resume: Resume }>(`/resumes/${id}`),
  remove: (id: string) => request<void>(`/resumes/${id}`, { method: 'DELETE' }),
  /** Uses XHR (not fetch) because fetch cannot report upload progress. */
  upload(file: File, onProgress: (percent: number) => void): Promise<{ resume: Resume }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/resumes/upload');
      xhr.responseType = 'json';
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onerror = () => reject(new ApiError(0, 'Could not reach the server. Please try again.'));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) return resolve(xhr.response);
        reject(new ApiError(xhr.status, xhr.response?.error?.message ?? 'Upload failed'));
      };
      const body = new FormData();
      body.append('file', file);
      xhr.send(body);
    });
  },
};

export interface StructuredJd {
  jobTitle: string | null;
  company: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  technologies: string[];
  keywords: string[];
  softSkills: string[];
  responsibilities: string[];
  educationRequirements: string[];
  otherRequirements: string[];
  minYearsExperience: number | null;
}

export interface JobDescription {
  id: string;
  resumeId: string;
  originalText: string;
  structuredJdData: StructuredJd | null;
  parsingStatus: ParsingStatus;
  parsingError: string | null;
  createdAt: string;
}

export type Level = 'Strong' | 'Partial' | 'Weak' | 'Not specified' | 'Unknown';
export interface ItemMatch {
  matched: string[];
  missing: string[];
}
export interface MatchResult {
  score: number;
  scoreBreakdown: { label: string; score: number; weight: number }[];
  requiredSkills: ItemMatch;
  preferredSkills: ItemMatch;
  technologies: ItemMatch;
  keywords: ItemMatch;
  experience: { level: Level; requiredYears: number | null; resumeYears: number | null; note: string };
  role: { level: Level; jdTitle: string | null; matchedTitle: string | null; note: string };
  education: { level: Level; note: string };
  ats: { score: number; level: 'Good' | 'Fair' | 'Needs work'; checks: { label: string; ok: boolean; tip: string }[] };
  gaps: string[];
  suggestions: string[];
}
export interface Analysis {
  id: string;
  resumeId: string;
  jobDescriptionId: string;
  resumeFileName: string | null;
  jobTitle: string | null;
  company: string | null;
  score: number;
  result: MatchResult;
  createdAt: string;
}

export const jobDescriptionApi = {
  create: (data: { resumeId: string; text: string }) =>
    request<{ jobDescription: JobDescription }>('/job-descriptions', { method: 'POST', body: JSON.stringify(data) }),
};

export const analysisApi = {
  create: (jobDescriptionId: string) =>
    request<{ analysis: Analysis }>('/analyses/resume-jd', { method: 'POST', body: JSON.stringify({ jobDescriptionId }) }),
  get: (id: string) => request<{ analysis: Analysis }>(`/analyses/${id}`),
  list: () => request<{ analyses: Analysis[] }>('/analyses'),
};
