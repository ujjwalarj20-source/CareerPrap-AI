import os from 'os';
import path from 'path';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://placeholder/test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.STORAGE_DRIVER = 'local';
process.env.LOCAL_STORAGE_DIR = path.join(os.tmpdir(), 'careerprep-test-storage');
process.env.MAX_UPLOAD_MB = '1';
// The AI-path unit tests exercise the Anthropic code path with a mocked client; local parsing has its own tests.
process.env.AI_PROVIDER = 'anthropic';
process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
