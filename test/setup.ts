// Load test environment variables
import { config } from 'dotenv';

// Load .env file (shared with development)
const path = require('path');
config({ path: path.resolve(__dirname, '../.env') });

// Set environment to test before any tests run
process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
jest.setTimeout(60000);
