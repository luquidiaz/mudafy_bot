interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ConversationHistory {
  [userId: string]: Message[]
}

/**
 * Servicio para gestionar memoria conversacional por usuario
 */
export class MemoryService {
  private history: ConversationHistory = {}
  private maxMessages: number

  constructor(maxMessages: number = 10) {
    this.maxMessages = maxMessages
  }

  /**
   * Agrega un mensaje al historial del usuario
   */
  addMessage(userId: string, role: 'user' | 'assistant', content: string): void {
    if (!this.history[userId]) {
      this.history[userId] = []
    }

    this.history[userId].push({ role, content })

    // Mantener solo los últimos N mensajes
    if (this.history[userId].length > this.maxMessages) {
      this.history[userId] = this.history[userId].slice(-this.maxMessages)
    }
  }

  /**
   * Obtiene el historial de conversación del usuario
   */
  getHistory(userId: string, limit?: number): Message[] {
    const userHistory = this.history[userId] || []

    if (limit && limit < userHistory.length) {
      return userHistory.slice(-limit)
    }

    return userHistory
  }

  /**
   * Limpia el historial de un usuario
   */
  clearHistory(userId: string): void {
    delete this.history[userId]
  }

  /**
   * Verifica si un usuario tiene historial
   */
  hasHistory(userId: string): boolean {
    return !!this.history[userId] && this.history[userId].length > 0
  }

  /**
   * Obtiene el número de mensajes en el historial de un usuario
   */
  getMessageCount(userId: string): number {
    return this.history[userId]?.length || 0
  }

  /**
   * Limpia todos los historiales (útil para testing)
   */
  clearAll(): void {
    this.history = {}
  }
}

export const memoryService = new MemoryService(10)
