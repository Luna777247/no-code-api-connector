// Audit Logger - Track all system activities for compliance and security
import { getDb } from "./mongo"

export type AuditEventType = 
  | 'connection.created'
  | 'connection.updated'
  | 'connection.deleted'
  | 'connection.executed'
  | 'data.accessed'
  | 'data.exported'
  | 'data.deleted'
  | 'user.login'
  | 'user.logout'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'permission.granted'
  | 'permission.revoked'
  | 'schedule.created'
  | 'schedule.updated'
  | 'schedule.deleted'
  | 'api.called'
  | 'validation.failed'
  | 'error.occurred'

export type AuditLevel = 'info' | 'warning' | 'error' | 'critical'

export interface AuditEntry {
  id: string
  timestamp: Date
  eventType: AuditEventType
  level: AuditLevel
  userId?: string
  userName?: string
  userEmail?: string
  ipAddress?: string
  userAgent?: string
  resource: {
    type: string
    id: string
    name?: string
  }
  action: string
  details?: Record<string, any>
  changes?: {
    before?: any
    after?: any
  }
  result: 'success' | 'failure'
  errorMessage?: string
  metadata?: Record<string, any>
}

export interface AuditQuery {
  eventTypes?: AuditEventType[]
  levels?: AuditLevel[]
  userId?: string
  resourceType?: string
  resourceId?: string
  startDate?: Date
  endDate?: Date
  result?: 'success' | 'failure'
  limit?: number
  skip?: number
}

export class AuditLogger {
  // Log an audit event
  static async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const db = await getDb()
      const collection = db.collection('api_audit_logs')

      const auditEntry: AuditEntry = {
        id: Math.random().toString(36).substr(2, 16),
        timestamp: new Date(),
        ...entry
      }

      await collection.insertOne(auditEntry)

      // Also log to console for development
      const levelEmoji = {
        info: 'ℹ️',
        warning: '⚠️',
        error: '❌',
        critical: '🔥'
      }
      console.log(
        `[v0] ${levelEmoji[entry.level]} AUDIT: ${entry.eventType} - ${entry.action} (${entry.result})`
      )
    } catch (error) {
      console.error('[v0] Error logging audit entry:', error)
    }
  }

  // Log connection events
  static async logConnectionEvent(
    action: 'created' | 'updated' | 'deleted' | 'executed',
    connectionId: string,
    connectionName: string,
    userId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const eventTypeMap = {
      created: 'connection.created' as AuditEventType,
      updated: 'connection.updated' as AuditEventType,
      deleted: 'connection.deleted' as AuditEventType,
      executed: 'connection.executed' as AuditEventType
    }

    await this.log({
      eventType: eventTypeMap[action],
      level: 'info',
      userId,
      resource: {
        type: 'connection',
        id: connectionId,
        name: connectionName
      },
      action: `Connection ${action}`,
      details,
      result: 'success'
    })
  }

  // Log data access events
  static async logDataAccess(
    action: 'accessed' | 'exported' | 'deleted',
    datasetId: string,
    userId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const eventTypeMap = {
      accessed: 'data.accessed' as AuditEventType,
      exported: 'data.exported' as AuditEventType,
      deleted: 'data.deleted' as AuditEventType
    }

    await this.log({
      eventType: eventTypeMap[action],
      level: action === 'deleted' ? 'warning' : 'info',
      userId,
      resource: {
        type: 'dataset',
        id: datasetId
      },
      action: `Data ${action}`,
      details,
      result: 'success'
    })
  }

  // Log user events
  static async logUserEvent(
    action: 'login' | 'logout' | 'created' | 'updated' | 'deleted',
    userId: string,
    userName?: string,
    userEmail?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const eventTypeMap = {
      login: 'user.login' as AuditEventType,
      logout: 'user.logout' as AuditEventType,
      created: 'user.created' as AuditEventType,
      updated: 'user.updated' as AuditEventType,
      deleted: 'user.deleted' as AuditEventType
    }

    await this.log({
      eventType: eventTypeMap[action],
      level: 'info',
      userId,
      userName,
      userEmail,
      ipAddress,
      userAgent,
      resource: {
        type: 'user',
        id: userId,
        name: userName
      },
      action: `User ${action}`,
      result: 'success'
    })
  }

  // Log permission changes
  static async logPermissionChange(
    action: 'granted' | 'revoked',
    userId: string,
    permission: string,
    resourceType: string,
    resourceId: string,
    grantedBy?: string
  ): Promise<void> {
    await this.log({
      eventType: action === 'granted' ? 'permission.granted' : 'permission.revoked',
      level: 'warning',
      userId: grantedBy,
      resource: {
        type: resourceType,
        id: resourceId
      },
      action: `Permission ${action}: ${permission}`,
      details: {
        targetUserId: userId,
        permission
      },
      result: 'success'
    })
  }

  // Log errors
  static async logError(
    eventType: AuditEventType,
    action: string,
    resourceType: string,
    resourceId: string,
    errorMessage: string,
    userId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType,
      level: 'error',
      userId,
      resource: {
        type: resourceType,
        id: resourceId
      },
      action,
      details,
      result: 'failure',
      errorMessage
    })
  }

  // Query audit logs
  static async query(query: AuditQuery): Promise<{
    entries: AuditEntry[]
    total: number
    hasMore: boolean
  }> {
    try {
      const db = await getDb()
      const collection = db.collection('api_audit_logs')

      // Build MongoDB query
      const mongoQuery: any = {}

      if (query.eventTypes && query.eventTypes.length > 0) {
        mongoQuery.eventType = { $in: query.eventTypes }
      }

      if (query.levels && query.levels.length > 0) {
        mongoQuery.level = { $in: query.levels }
      }

      if (query.userId) {
        mongoQuery.userId = query.userId
      }

      if (query.resourceType) {
        mongoQuery['resource.type'] = query.resourceType
      }

      if (query.resourceId) {
        mongoQuery['resource.id'] = query.resourceId
      }

      if (query.result) {
        mongoQuery.result = query.result
      }

      if (query.startDate || query.endDate) {
        mongoQuery.timestamp = {}
        if (query.startDate) {
          mongoQuery.timestamp.$gte = query.startDate
        }
        if (query.endDate) {
          mongoQuery.timestamp.$lte = query.endDate
        }
      }

      const limit = query.limit || 100
      const skip = query.skip || 0

      // Get total count
      const total = await collection.countDocuments(mongoQuery)

      // Get entries
      const entries = await collection
        .find(mongoQuery)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray()

      return {
        entries: entries as unknown as AuditEntry[],
        total,
        hasMore: skip + limit < total
      }
    } catch (error) {
      console.error('[v0] Error querying audit logs:', error)
      return {
        entries: [],
        total: 0,
        hasMore: false
      }
    }
  }

  // Get audit summary statistics
  static async getSummary(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalEvents: number
    eventsByType: Record<string, number>
    eventsByLevel: Record<string, number>
    successRate: number
    topUsers: Array<{ userId: string; count: number }>
    topResources: Array<{ resourceType: string; resourceId: string; count: number }>
  }> {
    try {
      const db = await getDb()
      const collection = db.collection('api_audit_logs')

      const matchStage: any = {}
      if (startDate || endDate) {
        matchStage.timestamp = {}
        if (startDate) matchStage.timestamp.$gte = startDate
        if (endDate) matchStage.timestamp.$lte = endDate
      }

      // Total events
      const totalEvents = await collection.countDocuments(matchStage)

      // Events by type
      const eventsByTypeResult = await collection.aggregate([
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        { $group: { _id: '$eventType', count: { $sum: 1 } } }
      ]).toArray()
      const eventsByType: Record<string, number> = {}
      eventsByTypeResult.forEach(item => {
        eventsByType[item._id] = item.count
      })

      // Events by level
      const eventsByLevelResult = await collection.aggregate([
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        { $group: { _id: '$level', count: { $sum: 1 } } }
      ]).toArray()
      const eventsByLevel: Record<string, number> = {}
      eventsByLevelResult.forEach(item => {
        eventsByLevel[item._id] = item.count
      })

      // Success rate
      const successCount = await collection.countDocuments({ ...matchStage, result: 'success' })
      const successRate = totalEvents > 0 ? (successCount / totalEvents) * 100 : 0

      // Top users
      const topUsersResult = await collection.aggregate([
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        { $match: { userId: { $exists: true, $ne: null } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray()
      const topUsers = topUsersResult.map(item => ({
        userId: item._id,
        count: item.count
      }))

      // Top resources
      const topResourcesResult = await collection.aggregate([
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        { $group: { 
          _id: { type: '$resource.type', id: '$resource.id' },
          count: { $sum: 1 }
        }},
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray()
      const topResources = topResourcesResult.map(item => ({
        resourceType: item._id.type,
        resourceId: item._id.id,
        count: item.count
      }))

      return {
        totalEvents,
        eventsByType,
        eventsByLevel,
        successRate,
        topUsers,
        topResources
      }
    } catch (error) {
      console.error('[v0] Error getting audit summary:', error)
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsByLevel: {},
        successRate: 0,
        topUsers: [],
        topResources: []
      }
    }
  }

  // Clean up old audit logs (for retention policy)
  static async cleanup(retentionDays: number = 90): Promise<number> {
    try {
      const db = await getDb()
      const collection = db.collection('api_audit_logs')

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      const result = await collection.deleteMany({
        timestamp: { $lt: cutoffDate }
      })

      console.log(`[v0] Cleaned up ${result.deletedCount} old audit logs`)
      return result.deletedCount
    } catch (error) {
      console.error('[v0] Error cleaning up audit logs:', error)
      return 0
    }
  }
}
