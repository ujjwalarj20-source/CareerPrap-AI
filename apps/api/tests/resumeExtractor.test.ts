import { completeText } from '../src/ai/llm.client';
import { extractResume } from '../src/ai/resumeExtractor';

jest.mock('../src/ai/llm.client', () => ({
  ...jest.requireActual('../src/ai/llm.client'),
  completeText: jest.fn(),
}));
const mockLlm = completeText as jest.MockedFunction<typeof completeText>;

const SOURCE = 'Asha Rao\nasha@example.com\nPhone: +91 98765 43210\nSkills: TypeScript, Node.js';

describe('extractResume (AI response validation)', () => {
  it('parses valid JSON, tolerating code fences, and fills missing fields with empty values', async () => {
    mockLlm.mockResolvedValue('```json\n{"name":"Asha Rao","skills":["TypeScript"]}\n```');
    const out = await extractResume(SOURCE);
    expect(out.name).toBe('Asha Rao');
    expect(out.skills).toEqual(['TypeScript']);
    expect(out.experience).toEqual([]);
    expect(out.yearsOfExperience).toBeNull();
  });

  it('drops email, phone and skills that do not appear in the resume text', async () => {
    mockLlm.mockResolvedValue(
      JSON.stringify({
        name: 'Asha Rao',
        email: 'invented@fake.com',
        phone: '+1 555 000 1111',
        skills: ['TypeScript', 'Kubernetes'],
      }),
    );
    const out = await extractResume(SOURCE);
    expect(out.email).toBeNull();
    expect(out.phone).toBeNull();
    expect(out.skills).toEqual(['TypeScript']);
  });

  it('keeps contact details that are really in the text', async () => {
    mockLlm.mockResolvedValue(JSON.stringify({ email: 'asha@example.com', phone: '+91 98765 43210' }));
    const out = await extractResume(SOURCE);
    expect(out.email).toBe('asha@example.com');
    expect(out.phone).toBe('+91 98765 43210');
  });

  it('rejects non-JSON and wrongly-shaped responses', async () => {
    mockLlm.mockResolvedValue('Sorry, I cannot do that.');
    await expect(extractResume(SOURCE)).rejects.toThrow(/unreadable response/);
    mockLlm.mockResolvedValue('{"skills":"TypeScript"}');
    await expect(extractResume(SOURCE)).rejects.toThrow(/incomplete analysis/);
  });
});
