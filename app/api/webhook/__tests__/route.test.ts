import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST, GET } from '../route'
import { NextRequest } from 'next/server'
import type { Finding } from '@/types/findings'

describe('/api/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockFinding: Finding = {
    check_name: 'test_check',
    severity: 'Critical',
    file_path: 'test.rs',
    line: 1,
    function_name: 'execute',
    description: 'Critical issue'
  }

  describe('POST handler', () => {
    it('generates token and caches findings', async () => {
      const findings = [mockFinding]
      const req = new NextRequest('http://localhost:3000/api/webhook', {
        method: 'POST',
        body: JSON.stringify({ findings })
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.token).toBeDefined()
      expect(typeof data.token).toBe('string')
    })

    it('returns 400 for invalid JSON', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhook', {
        method: 'POST',
        body: 'invalid json {'
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON')
    })

    it('returns 400 if findings is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhook', {
        method: 'POST',
        body: JSON.stringify({ notFindings: [] })
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('findings must be an array')
    })

    it('returns 400 if findings is not an array', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhook', {
        method: 'POST',
        body: JSON.stringify({ findings: 'not an array' })
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('findings must be an array')
    })

    it('stores multiple findings', async () => {
      const findings = [
        mockFinding,
        { ...mockFinding, check_name: 'check2', severity: 'High' }
      ]

      const req = new NextRequest('http://localhost:3000/api/webhook', {
        method: 'POST',
        body: JSON.stringify({ findings })
      })

      const response = await POST(req)
      expect(response.status).toBe(201)
    })

    it('stores empty findings array', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhook', {
        method: 'POST',
        body: JSON.stringify({ findings: [] })
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.token).toBeDefined()
    })
  })

  describe('GET handler', () => {
    it('returns 404 for non-existent token', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhook?token=nonexistent', {
        method: 'GET'
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Not found or expired')
    })

    it('retrieves cached findings with valid token', async () => {
      const findings = [mockFinding]

      const postReq = new NextRequest('http://localhost:3000/api/webhook', {
        method: 'POST',
        body: JSON.stringify({ findings })
      })

      const postResponse = await POST(postReq)
      const postData = await postResponse.json()
      const token = postData.token

      const getReq = new NextRequest(`http://localhost:3000/api/webhook?token=${token}`, {
        method: 'GET'
      })

      const getResponse = await GET(getReq)
      const getData = await getResponse.json()

      expect(getResponse.status).toBe(200)
      expect(getData.findings).toEqual(findings)
    })

    it('returns 404 for expired token', async () => {
      const findings = [mockFinding]

      const postReq = new NextRequest('http://localhost:3000/api/webhook', {
        method: 'POST',
        body: JSON.stringify({ findings })
      })

      const postResponse = await POST(postReq)
      const postData = await postResponse.json()
      const token = postData.token

      // Simulate expiry by advancing time
      const originalNow = Date.now
      const TTL_MS = 60 * 60 * 1000
      vi.spyOn(Date, 'now').mockReturnValue(originalNow() + TTL_MS + 1000)

      const getReq = new NextRequest(`http://localhost:3000/api/webhook?token=${token}`, {
        method: 'GET'
      })

      const getResponse = await GET(getReq)
      const getData = await getResponse.json()

      expect(getResponse.status).toBe(404)
      expect(getData.error).toBe('Not found or expired')

      Date.now = originalNow
    })

    it('evicts expired entries before retrieval', async () => {
      const findings = [mockFinding]

      const postReq = new NextRequest('http://localhost:3000/api/webhook', {
        method: 'POST',
        body: JSON.stringify({ findings })
      })

      const postResponse = await POST(postReq)
      const postData = await postResponse.json()
      const token = postData.token

      // Verify it exists first
      const getReq1 = new NextRequest(`http://localhost:3000/api/webhook?token=${token}`, {
        method: 'GET'
      })
      const getResponse1 = await GET(getReq1)
      expect(getResponse1.status).toBe(200)

      // Advance time to trigger expiry
      const originalNow = Date.now
      const TTL_MS = 60 * 60 * 1000
      vi.spyOn(Date, 'now').mockReturnValue(originalNow() + TTL_MS + 1000)

      // Should be evicted and return 404
      const getReq2 = new NextRequest(`http://localhost:3000/api/webhook?token=${token}`, {
        method: 'GET'
      })
      const getResponse2 = await GET(getReq2)
      const getData2 = await getResponse2.json()

      expect(getResponse2.status).toBe(404)

      Date.now = originalNow
    })
  })
})
