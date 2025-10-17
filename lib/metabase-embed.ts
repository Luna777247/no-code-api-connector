// Metabase Embedding Helper
import jwt from 'jsonwebtoken'

interface EmbedPayload {
  resource: {
    dashboard?: number
    question?: number
  }
  params: Record<string, any>
  exp?: number
}

export class MetabaseEmbed {
  private secretKey: string
  private siteUrl: string

  constructor() {
    this.secretKey = process.env.METABASE_SECRET_KEY || 'your-secret-key-here'
    this.siteUrl = process.env.METABASE_SITE_URL || 'http://localhost:3001'
  }

  /**
   * Generate a signed JWT token for embedding a Metabase dashboard
   */
  generateDashboardToken(
    dashboardId: number,
    params: Record<string, any> = {},
    expiresInSeconds: number = 600 // 10 minutes default
  ): string {
    const payload: EmbedPayload = {
      resource: { dashboard: dashboardId },
      params: params,
      exp: Math.round(Date.now() / 1000) + expiresInSeconds,
    }

    return jwt.sign(payload, this.secretKey)
  }

  /**
   * Generate a signed JWT token for embedding a Metabase question/card
   */
  generateQuestionToken(
    questionId: number,
    params: Record<string, any> = {},
    expiresInSeconds: number = 600
  ): string {
    const payload: EmbedPayload = {
      resource: { question: questionId },
      params: params,
      exp: Math.round(Date.now() / 1000) + expiresInSeconds,
    }

    return jwt.sign(payload, this.secretKey)
  }

  /**
   * Generate full embed URL for a dashboard
   */
  getDashboardEmbedUrl(
    dashboardId: number,
    params: Record<string, any> = {},
    options: {
      bordered?: boolean
      titled?: boolean
      theme?: 'light' | 'dark' | 'transparent'
    } = {}
  ): string {
    const token = this.generateDashboardToken(dashboardId, params)
    const queryParams = new URLSearchParams()

    if (options.bordered !== undefined) {
      queryParams.set('bordered', String(options.bordered))
    }
    if (options.titled !== undefined) {
      queryParams.set('titled', String(options.titled))
    }
    if (options.theme) {
      queryParams.set('theme', options.theme)
    }

    const query = queryParams.toString()
    return `${this.siteUrl}/embed/dashboard/${token}${query ? '#' + query : ''}`
  }

  /**
   * Generate full embed URL for a question
   */
  getQuestionEmbedUrl(
    questionId: number,
    params: Record<string, any> = {},
    options: {
      bordered?: boolean
      titled?: boolean
      theme?: 'light' | 'dark' | 'transparent'
    } = {}
  ): string {
    const token = this.generateQuestionToken(questionId, params)
    const queryParams = new URLSearchParams()

    if (options.bordered !== undefined) {
      queryParams.set('bordered', String(options.bordered))
    }
    if (options.titled !== undefined) {
      queryParams.set('titled', String(options.titled))
    }
    if (options.theme) {
      queryParams.set('theme', options.theme)
    }

    const query = queryParams.toString()
    return `${this.siteUrl}/embed/question/${token}${query ? '#' + query : ''}`
  }

  /**
   * Parse an existing embed URL to extract dashboard/question ID
   */
  parseEmbedUrl(embedUrl: string): {
    type: 'dashboard' | 'question' | null
    id: number | null
    token: string | null
    options: Record<string, string>
  } {
    try {
      const url = new URL(embedUrl)
      const pathParts = url.pathname.split('/')
      const type = pathParts[2] as 'dashboard' | 'question'
      const token = pathParts[3]

      // Parse hash parameters
      const options: Record<string, string> = {}
      if (url.hash) {
        const hashParams = new URLSearchParams(url.hash.substring(1))
        hashParams.forEach((value, key) => {
          options[key] = value
        })
      }

      // Decode JWT to get ID
      const decoded = jwt.decode(token) as any
      const id = decoded?.resource?.[type] || null

      return {
        type: type || null,
        id: id,
        token: token,
        options: options,
      }
    } catch (error) {
      console.error('[v0] Failed to parse embed URL:', error)
      return {
        type: null,
        id: null,
        token: null,
        options: {},
      }
    }
  }
}

// Singleton instance
export const metabaseEmbed = new MetabaseEmbed()
