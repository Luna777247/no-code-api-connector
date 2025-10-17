// API endpoint for proxying Google Looker Studio embeds
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportUrl, params = {} } = body

    // Validate input
    if (!reportUrl) {
      return NextResponse.json(
        { error: 'Missing required field: reportUrl' },
        { status: 400 }
      )
    }

    // Convert sharing URL to embed URL if needed
    let embedUrl = reportUrl
    if (reportUrl.includes('/reporting/') && !reportUrl.includes('/embed/')) {
      embedUrl = reportUrl.replace('/reporting/', '/embed/reporting/')
    }

    // Add parameters to URL
    const url = new URL(embedUrl)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })

    return NextResponse.json({
      success: true,
      embedUrl: url.toString(),
      type: 'looker_studio_report',
      expiresIn: 3600, // 1 hour
    })
  } catch (error) {
    console.error('[v0] Error generating Looker Studio embed URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate embed URL' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const embedUrl = searchParams.get('url')

    if (!embedUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      )
    }

    // For Looker Studio, just return the URL as-is
    return NextResponse.json({
      success: true,
      embedUrl: embedUrl,
      type: 'looker_studio_report',
    })
  } catch (error) {
    console.error('[v0] Error parsing embed URL:', error)
    return NextResponse.json(
      { error: 'Failed to parse embed URL' },
      { status: 500 }
    )
  }
}
