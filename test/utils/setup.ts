import '@testing-library/jest-dom';

// Polyfills for jsdom environment
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock MongoDB Memory Server để tránh ES modules issues
jest.mock('mongodb-memory-server', () => ({
  MongoMemoryServer: {
    create: jest.fn().mockResolvedValue({
      getUri: jest.fn().mockReturnValue('mongodb://localhost:27017/test'),
      stop: jest.fn().mockResolvedValue(undefined)
    })
  }
}));

// Set test environment variables
beforeAll(() => {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  process.env.NODE_ENV = 'test';
});

// Mock fetch globally for API tests
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/'
}));