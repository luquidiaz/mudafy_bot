/**
 * Sistema de feedback para mejorar el bot continuamente
 */

import { cacheService } from './cache.service.js'

interface FeedbackEntry {
  userId: string
  userMessage: string
  botResponse: string
  route: string
  rating?: 'good' | 'bad'
  timestamp: number
  responseTime: number
}

interface FeedbackStats {
  totalFeedbacks: number
  goodRatings: number
  badRatings: number
  satisfactionRate: number
  avgResponseTime: number
  byRoute: {
    [route: string]: {
      total: number
      good: number
      bad: number
      satisfactionRate: number
    }
  }
}

export class FeedbackService {
  private feedbackHistory: FeedbackEntry[] = []
  private pendingFeedback = new Map<string, FeedbackEntry>()
  private readonly MAX_HISTORY = 1000

  /**
   * Registra una respuesta pendiente de feedback
   */
  registerResponse(
    userId: string,
    userMessage: string,
    botResponse: string,
    route: string,
    responseTime: number
  ): void {
    const entry: FeedbackEntry = {
      userId,
      userMessage,
      botResponse,
      route,
      timestamp: Date.now(),
      responseTime,
    }

    // Guardar como pendiente
    this.pendingFeedback.set(userId, entry)

    // Auto-expirar después de 5 minutos
    setTimeout(() => {
      if (this.pendingFeedback.get(userId) === entry) {
        this.pendingFeedback.delete(userId)
      }
    }, 5 * 60 * 1000)
  }

  /**
   * Registra feedback del usuario
   */
  async submitFeedback(userId: string, rating: 'good' | 'bad'): Promise<boolean> {
    const entry = this.pendingFeedback.get(userId)

    if (!entry) {
      return false // No hay respuesta pendiente
    }

    // Agregar rating
    entry.rating = rating

    // Mover a historial
    this.feedbackHistory.push(entry)
    this.pendingFeedback.delete(userId)

    // Limitar tamaño del historial
    if (this.feedbackHistory.length > this.MAX_HISTORY) {
      this.feedbackHistory.shift()
    }

    // Persistir
    await this.saveFeedbackHistory()

    // Analizar si hay patrones de mala calidad
    if (rating === 'bad') {
      await this.analyzeBadFeedback(entry)
    }

    return true
  }

  /**
   * Analiza feedback negativo para encontrar patrones
   */
  private async analyzeBadFeedback(entry: FeedbackEntry): Promise<void> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⚠️  FEEDBACK NEGATIVO DETECTADO')
    console.log(`   Usuario: ${entry.userId}`)
    console.log(`   Pregunta: "${entry.userMessage}"`)
    console.log(`   Route: ${entry.route}`)
    console.log(`   Tiempo: ${entry.responseTime}ms`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Buscar patrones similares
    const similarBadFeedbacks = this.feedbackHistory.filter(
      f =>
        f.rating === 'bad' &&
        f.route === entry.route &&
        this.similarity(f.userMessage, entry.userMessage) > 0.5
    )

    if (similarBadFeedbacks.length >= 3) {
      console.log('🔍 PATRÓN DETECTADO:')
      console.log(`   ${similarBadFeedbacks.length} quejas similares en route: ${entry.route}`)
      console.log('   💡 Sugerencia: Revisar las instrucciones del agent')
      console.log('   💡 O agregar más datos al Vector Store\n')
    }
  }

  /**
   * Calcula similitud entre dos textos (Jaccard)
   */
  private similarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))

    const intersection = new Set([...words1].filter(w => words2.has(w)))
    const union = new Set([...words1, ...words2])

    return intersection.size / union.size
  }

  /**
   * Obtiene estadísticas de feedback
   */
  getStats(): FeedbackStats {
    const total = this.feedbackHistory.length
    const good = this.feedbackHistory.filter(f => f.rating === 'good').length
    const bad = this.feedbackHistory.filter(f => f.rating === 'bad').length

    const byRoute: FeedbackStats['byRoute'] = {}

    for (const entry of this.feedbackHistory) {
      if (!byRoute[entry.route]) {
        byRoute[entry.route] = { total: 0, good: 0, bad: 0, satisfactionRate: 0 }
      }

      byRoute[entry.route].total++
      if (entry.rating === 'good') byRoute[entry.route].good++
      if (entry.rating === 'bad') byRoute[entry.route].bad++
    }

    // Calcular satisfaction rate por route
    for (const route in byRoute) {
      const { good, bad } = byRoute[route]
      byRoute[route].satisfactionRate = good + bad > 0 ? good / (good + bad) : 0
    }

    const avgResponseTime =
      this.feedbackHistory.reduce((sum, e) => sum + e.responseTime, 0) / total || 0

    return {
      totalFeedbacks: total,
      goodRatings: good,
      badRatings: bad,
      satisfactionRate: total > 0 ? good / total : 0,
      avgResponseTime,
      byRoute,
    }
  }

  /**
   * Obtiene las peores respuestas para análisis
   */
  getWorstResponses(limit: number = 10): FeedbackEntry[] {
    return this.feedbackHistory
      .filter(f => f.rating === 'bad')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Exporta feedbacks para análisis
   */
  exportFeedbacks(): FeedbackEntry[] {
    return [...this.feedbackHistory]
  }

  /**
   * Log de estadísticas
   */
  logStats(): void {
    const stats = this.getStats()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 FEEDBACK STATS')
    console.log(`   Total Feedbacks: ${stats.totalFeedbacks}`)
    console.log(`   👍 Good: ${stats.goodRatings}`)
    console.log(`   👎 Bad: ${stats.badRatings}`)
    console.log(`   Satisfaction: ${(stats.satisfactionRate * 100).toFixed(1)}%`)
    console.log(`   Avg Response Time: ${stats.avgResponseTime.toFixed(0)}ms`)
    console.log('\n   By Route:')

    for (const [route, data] of Object.entries(stats.byRoute)) {
      console.log(`     ${route}:`)
      console.log(`       Total: ${data.total}`)
      console.log(`       Satisfaction: ${(data.satisfactionRate * 100).toFixed(1)}%`)
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }

  /**
   * Persistencia
   */
  private async saveFeedbackHistory(): Promise<void> {
    await cacheService.set('feedback:history', this.feedbackHistory)
  }

  private async loadFeedbackHistory(): Promise<void> {
    const history = await cacheService.get<FeedbackEntry[]>('feedback:history')
    if (history) {
      this.feedbackHistory = history
      console.log(`📥 Loaded ${history.length} feedbacks from cache`)
    }
  }

  constructor() {
    this.loadFeedbackHistory()
  }
}

export const feedbackService = new FeedbackService()
