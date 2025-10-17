import { ApiExecutor, ApiRequest, ExecutionResult } from '@/lib/api-executor';
import { mockFetchResponse, createMockApiResponse } from '../../utils/test-helpers';

describe('ApiExecutor', () => {
  let executor: ApiExecutor;

  beforeEach(() => {
    executor = new ApiExecutor(2, 100); // 2 retries, 100ms delay
    jest.clearAllMocks();
  });

  describe('execute', () => {
    test('should execute GET request successfully', async () => {
      const mockData = { id: 1, title: 'Test Post' };
      mockFetchResponse(mockData, 200);

      const request: ApiRequest = {
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        method: 'GET'
      };

      const result: ExecutionResult = await executor.execute(request);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual(mockData);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/posts/1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        body: undefined
      });
    });

    test('should execute POST request with body', async () => {
      const requestBody = { title: 'New Post', body: 'Content' };
      const mockResponse = { id: 101, ...requestBody };
      mockFetchResponse(mockResponse, 201);

      const request: ApiRequest = {
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: 'POST',
        body: requestBody
      };

      const result = await executor.execute(request);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(result.data).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
    });

    test('should handle authentication headers', async () => {
      mockFetchResponse({ data: 'protected' }, 200);

      const request: ApiRequest = {
        url: 'https://api.example.com/protected',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token',
          'X-API-Key': 'test-key'
        }
      };

      await executor.execute(request);

      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/protected', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'X-API-Key': 'test-key'
        },
        body: undefined
      });
    });

    test('should handle query parameters', async () => {
      mockFetchResponse({ results: [] }, 200);

      const request: ApiRequest = {
        url: 'https://api.example.com/search',
        method: 'GET',
        params: { q: 'test', limit: 10 }
      };

      await executor.execute(request);

      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/search?q=test&limit=10', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        body: undefined
      });
    });

    test('should retry on failure and succeed', async () => {
      // First call fails, second succeeds
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockApiResponse({ success: true }, 200));

      const request: ApiRequest = {
        url: 'https://api.example.com/retry-test',
        method: 'GET'
      };

      const result = await executor.execute(request);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('should fail after max retries', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Persistent network error'));

      const request: ApiRequest = {
        url: 'https://api.example.com/failing',
        method: 'GET'
      };

      const result = await executor.execute(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Persistent network error');
      expect(result.responseTime).toBeGreaterThan(0);
      expect(global.fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    test('should handle HTTP error responses', async () => {
      // Mock response for all retry attempts (3 attempts total)
      mockFetchResponse({ error: 'Not found' }, 404);
      mockFetchResponse({ error: 'Not found' }, 404);
      mockFetchResponse({ error: 'Not found' }, 404);

      const request: ApiRequest = {
        url: 'https://api.example.com/not-found',
        method: 'GET'
      };

      const result = await executor.execute(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 404');
      expect(result.statusCode).toBeUndefined(); // Not set for failed requests
    });

    test('should handle malformed JSON response', async () => {
      const mockResponse = createMockApiResponse({ success: true }, 200);
      mockResponse.json = async () => { throw new Error('Invalid JSON'); };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const request: ApiRequest = {
        url: 'https://api.example.com/bad-json',
        method: 'GET'
      };

      const result = await executor.execute(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });
  });

  describe('executeBatch', () => {
    test('should execute multiple requests in parallel', async () => {
      const mockData1 = { id: 1 };
      const mockData2 = { id: 2 };
      mockFetchResponse(mockData1, 200);
      mockFetchResponse(mockData2, 200);

      const requests: ApiRequest[] = [
        { url: 'https://api.example.com/1', method: 'GET' },
        { url: 'https://api.example.com/2', method: 'GET' }
      ];

      const results = await executor.executeBatch(requests);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].data).toEqual(mockData1);
      expect(results[1].data).toEqual(mockData2);
    });

    test('should handle mixed success/failure in batch', async () => {
      mockFetchResponse({ success: true }, 200);
      mockFetchResponse({ error: 'Failed' }, 500);

      const requests: ApiRequest[] = [
        { url: 'https://api.example.com/success', method: 'GET' },
        { url: 'https://api.example.com/failure', method: 'GET' }
      ];

      const results = await executor.executeBatch(requests);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });
});