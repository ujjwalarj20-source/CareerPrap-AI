import { extractJd } from '../src/ai/jdExtractor';
import { completeText } from '../src/ai/llm.client';

jest.mock('../src/ai/llm.client', () => ({
  ...jest.requireActual('../src/ai/llm.client'),
  completeText: jest.fn(),
}));
const mockLlm = completeText as jest.MockedFunction<typeof completeText>;

const JD = 'Backend Engineer at Globex. Required: TypeScript, Node.js. Nice to have: GraphQL. 3+ years of experience.';

describe('extractJd (AI response validation)', () => {
  it('parses valid JSON and fills missing fields with empty values', async () => {
    mockLlm.mockResolvedValue('```json\n{"jobTitle":"Backend Engineer","requiredSkills":["TypeScript"]}\n```');
    const out = await extractJd(JD);
    expect(out.jobTitle).toBe('Backend Engineer');
    expect(out.requiredSkills).toEqual(['TypeScript']);
    expect(out.preferredSkills).toEqual([]);
    expect(out.minYearsExperience).toBeNull();
  });

  it('drops skills and keywords that are not in the job description, and de-duplicates required/preferred', async () => {
    mockLlm.mockResolvedValue(
      JSON.stringify({
        requiredSkills: ['TypeScript', 'Kubernetes'],
        preferredSkills: ['GraphQL', 'TypeScript', 'Rust'],
        keywords: ['Globex', 'blockchain'],
        minYearsExperience: 3,
      }),
    );
    const out = await extractJd(JD);
    expect(out.requiredSkills).toEqual(['TypeScript']);
    expect(out.preferredSkills).toEqual(['GraphQL']);
    expect(out.keywords).toEqual(['Globex']);
    expect(out.minYearsExperience).toBe(3);
  });

  it('rejects non-JSON and wrongly-shaped responses with user-friendly errors', async () => {
    mockLlm.mockResolvedValue('Sorry, I cannot do that.');
    await expect(extractJd(JD)).rejects.toThrow(/unreadable response/);
    mockLlm.mockResolvedValue('{"requiredSkills":"TypeScript"}');
    await expect(extractJd(JD)).rejects.toThrow(/incomplete analysis/);
  });
});
