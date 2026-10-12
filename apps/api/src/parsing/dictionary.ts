/**
 * Terms the local parsers recognise. A term is only ever reported when it literally appears in the
 * document being parsed, so this list can't cause invented skills - it only tells us what counts as a skill.
 */
export const TECH_TERMS = [
  // languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Golang', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'MATLAB', 'Perl', 'Dart', 'Bash', 'Shell', 'PowerShell', 'SQL', 'PL/SQL', 'HTML', 'CSS', 'SASS', 'SCSS', 'Objective-C', 'Elixir', 'Haskell', 'Solidity',
  // frontend
  'React', 'React Native', 'Redux', 'Next.js', 'Vue', 'Nuxt', 'Angular', 'Svelte', 'jQuery', 'Tailwind CSS', 'Bootstrap', 'Material UI', 'Webpack', 'Vite', 'Storybook', 'Flutter', 'Ionic',
  // backend
  'Node.js', 'Express', 'NestJS', 'Fastify', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Spring', 'Hibernate', '.NET', 'ASP.NET', 'Laravel', 'Rails', 'Ruby on Rails', 'GraphQL', 'gRPC', 'REST', 'REST APIs', 'RESTful APIs', 'WebSockets', 'Microservices', 'Kafka', 'RabbitMQ', 'Celery', 'Socket.io',
  // data
  'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite', 'SQL Server', 'Oracle', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra', 'Firebase', 'Supabase', 'Snowflake', 'BigQuery', 'Redshift', 'Hadoop', 'Spark', 'Airflow', 'dbt', 'Pandas', 'NumPy', 'Power BI', 'Tableau', 'MS Excel', 'Microsoft Excel',
  // ml
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'scikit-learn', 'Keras', 'NLP', 'Computer Vision', 'LLM', 'OpenAI', 'LangChain', 'Hugging Face',
  // cloud / devops
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions', 'GitLab CI', 'CI/CD', 'Linux', 'Nginx', 'Prometheus', 'Grafana', 'Datadog', 'Serverless', 'Lambda', 'S3', 'EC2', 'Helm', 'Vercel', 'Heroku',
  // tooling / practices
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Confluence', 'Postman', 'Swagger', 'Figma', 'Agile', 'Scrum', 'Kanban', 'TDD', 'Jest', 'Mocha', 'Cypress', 'Selenium', 'Playwright', 'JUnit', 'Pytest', 'OAuth', 'JWT', 'Unit Testing', 'Integration Testing', 'System Design', 'Data Structures', 'Algorithms', 'OOP', 'DevOps', 'SEO', 'Salesforce', 'SAP',
];

/** Multi-word domain phrases worth treating as JD keywords when present. */
export const KEYWORD_PHRASES = [
  'microservices', 'REST APIs', 'RESTful APIs', 'CI/CD', 'agile', 'scrum', 'unit testing', 'code review', 'system design', 'distributed systems',
  'cloud', 'machine learning', 'data structures', 'algorithms', 'scalable', 'high availability', 'performance optimization', 'API design',
  'test automation', 'object-oriented', 'full stack', 'full-stack', 'front-end', 'frontend', 'back-end', 'backend', 'database design',
  'data analysis', 'data pipelines', 'security', 'monitoring', 'DevOps', 'stakeholders', 'cross-functional', 'mobile', 'web applications',
];

export const SOFT_SKILLS = [
  'communication', 'teamwork', 'collaboration', 'leadership', 'problem solving', 'problem-solving', 'critical thinking', 'time management',
  'adaptability', 'ownership', 'mentoring', 'creativity', 'attention to detail', 'analytical', 'interpersonal', 'self-motivated', 'initiative',
];

// Words that are also ordinary English: only match when capitalised exactly like the technology.
const CASE_SENSITIVE = new Set(['express', 'spring', 'spark', 'oracle', 'swift', 'shell', 'go', 'rust', 'ruby', 'lambda', 'scala', 'dart', 'rest', 'agile', 'git', 'react', 'vue', 'angular', 'redux', 'c++', 'c#', 'sql', 'aws', 'gcp']);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whole-term, case-insensitive search. Returns the spelling as written in the text. */
export function findTerms(text: string, terms: string[]): string[] {
  const found = new Map<string, string>();
  for (const term of terms) {
    const re = new RegExp(`(?<![A-Za-z0-9+#])${escapeRe(term)}(?![A-Za-z0-9+#]|\\.[A-Za-z0-9])`, CASE_SENSITIVE.has(term.toLowerCase()) ? '' : 'i');
    const m = re.exec(text);
    if (m && !found.has(term.toLowerCase())) found.set(term.toLowerCase(), m[0]);
  }
  // Drop a term when every occurrence of it sits inside a longer found term (e.g. "REST" inside "REST APIs").
  const all = [...found.entries()];
  const count = (t: string) => (text.match(new RegExp(`(?<![A-Za-z0-9+#])${escapeRe(t)}(?![A-Za-z0-9+#])`, 'gi')) ?? []).length;
  return all
    .filter(([key, shown]) => {
      const longer = all.filter(([k2]) => k2 !== key && k2.includes(key));
      return !longer.length || count(shown) > longer.reduce((n, [, s2]) => n + count(s2), 0);
    })
    .map(([, shown]) => shown);
}
