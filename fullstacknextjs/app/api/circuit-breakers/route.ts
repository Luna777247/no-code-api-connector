import { NextRequest, NextResponse } from 'next/server'
import { circuitBreakerRegistry } from '@/lib/circuit-breaker'

export async function GET(_request: NextRequest) {
  try {
    // Get all circuit breaker stats
    const apiCircuitBreakers = circuitBreakerRegistry.getAllStats()
    // Note: Database circuit breaker stats not implemented yet
    const dbCircuitBreaker = null

    const response = {
      timestamp: new Date().toISOString(),
      circuitBreakers: {
        api: apiCircuitBreakers,
        database: dbCircuitBreaker ? { mongodb: dbCircuitBreaker } : {}
      },
      summary: {
        totalApiBreakers: Object.keys(apiCircuitBreakers).length,
        openApiBreakers: Object.values(apiCircuitBreakers).filter(cb => cb.state === 'open').length,
        dbBreakerState: 'not_implemented'
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching circuit breaker stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch circuit breaker stats' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, breakerName } = body

    switch (action) {
      case 'reset':
        if (breakerName === 'all') {
          circuitBreakerRegistry.resetAll()
          return NextResponse.json({ message: 'All circuit breakers reset' })
        } else if (breakerName) {
          const breaker = circuitBreakerRegistry.get(breakerName)
          if (breaker) {
            breaker.forceClose()
            return NextResponse.json({ message: `Circuit breaker '${breakerName}' reset` })
          } else {
            return NextResponse.json({ error: `Circuit breaker '${breakerName}' not found` }, { status: 404 })
          }
        }
        break

      case 'force_open':
        if (breakerName) {
          const breaker = circuitBreakerRegistry.get(breakerName)
          if (breaker) {
            breaker.forceOpen()
            return NextResponse.json({ message: `Circuit breaker '${breakerName}' forced open` })
          } else {
            return NextResponse.json({ error: `Circuit breaker '${breakerName}' not found` }, { status: 404 })
          }
        }
        break

      case 'force_close':
        if (breakerName) {
          const breaker = circuitBreakerRegistry.get(breakerName)
          if (breaker) {
            breaker.forceClose()
            return NextResponse.json({ message: `Circuit breaker '${breakerName}' forced closed` })
          } else {
            return NextResponse.json({ error: `Circuit breaker '${breakerName}' not found` }, { status: 404 })
          }
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action. Use: reset, force_open, force_close' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Error managing circuit breaker:', error)
    return NextResponse.json(
      { error: 'Failed to manage circuit breaker' },
      { status: 500 }
    )
  }
}
