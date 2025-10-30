/**
 * Sistema de feedback IMPLÍCITO
 * Analiza el comportamiento del usuario sin molestar
 */

interface ConversationContext {
  userId: string
  lastBotResponse: string
  lastBotRoute: string
  timestamp: number
}

export class ImplicitFeedbackService {
  private contexts = new Map<string, ConversationContext>()

  // Indicadores de satisfacción
  private satisfactionIndicators = [
    'gracias',
    'perfecto',
    'genial',
    'excelente',
    'ok',
    'dale',
    'entendido',
    'claro',
    'muchas gracias',
    'graciass',
  ]

  // Indicadores de insatisfacción
  private dissatisfactionIndicators = [
    'no entiendo',
    'no entendí',
    'no me sirve',
    'otra forma',
    'más claro',
    'mas claro',
    'no es eso',
    'eso ya lo sé',
    'eso ya lo se',
    'me confunde',
  ]

  /**
   * Registra una respuesta del bot
   */
  registerBotResponse(userId: string, response: string, route: string): void {
    this.contexts.set(userId, {
      userId,
      lastBotResponse: response,
      lastBotRoute: route,
      timestamp: Date.now(),
    })
  }

  /**
   * Analiza el siguiente mensaje del usuario
   */
  analyzeUserResponse(userId: string, userMessage: string): 'satisfied' | 'dissatisfied' | 'neutral' {
    const context = this.contexts.get(userId)
    if (!context) return 'neutral'

    // Tiempo desde última respuesta
    const timeSinceLastResponse = Date.now() - context.timestamp

    // Si pasó más de 5 minutos, no es sobre la respuesta anterior
    if (timeSinceLastResponse > 5 * 60 * 1000) {
      return 'neutral'
    }

    const lower = userMessage.toLowerCase().trim()

    // 1. Agradecimiento explícito = satisfacción
    if (this.satisfactionIndicators.some(indicator => lower.includes(indicator))) {
      console.log(`✅ Feedback implícito POSITIVO: "${userMessage}"`)
      return 'satisfied'
    }

    // 2. Queja explícita = insatisfacción
    if (this.dissatisfactionIndicators.some(indicator => lower.includes(indicator))) {
      console.log(`❌ Feedback implícito NEGATIVO: "${userMessage}"`)
      console.log(`   Respuesta anterior: "${context.lastBotResponse.substring(0, 100)}..."`)
      console.log(`   Route: ${context.lastBotRoute}`)
      return 'dissatisfied'
    }

    // 3. Pregunta muy similar a la anterior = probablemente no entendió
    if (this.isSimilarToPrevious(userMessage, context)) {
      console.log(`⚠️  Pregunta repetida detectada: "${userMessage}"`)
      return 'dissatisfied'
    }

    // 4. Mensaje muy corto después de respuesta larga = probablemente satisfecho
    if (context.lastBotResponse.length > 200 && userMessage.length < 20) {
      // Usuario no está cuestionando, solo continúa
      return 'satisfied'
    }

    return 'neutral'
  }

  /**
   * Detecta si la pregunta es similar a la anterior
   */
  private isSimilarToPrevious(current: string, context: ConversationContext): boolean {
    // Simplificado: detectar palabras clave repetidas
    const currentWords = new Set(current.toLowerCase().split(/\s+/))
    const previousWords = new Set(context.lastBotResponse.toLowerCase().split(/\s+/))

    let overlap = 0
    for (const word of currentWords) {
      if (previousWords.has(word) && word.length > 4) {
        overlap++
      }
    }

    // Si hay 3+ palabras clave en común, probablemente es similar
    return overlap >= 3
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      activeContexts: this.contexts.size,
      // Aquí podrías agregar contadores de satisfacción/insatisfacción
    }
  }

  /**
   * Limpia contextos antiguos (llamar periódicamente)
   */
  cleanup(): void {
    const now = Date.now()
    const TIMEOUT = 10 * 60 * 1000 // 10 minutos

    for (const [userId, context] of this.contexts) {
      if (now - context.timestamp > TIMEOUT) {
        this.contexts.delete(userId)
      }
    }
  }
}

export const implicitFeedbackService = new ImplicitFeedbackService()
