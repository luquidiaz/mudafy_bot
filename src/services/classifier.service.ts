/**
 * Sistema de clasificación inteligente con aprendizaje continuo
 *
 * Combina:
 * - Clasificación local rápida (regex + keywords)
 * - Aprendizaje automático desde el Orchestrator
 * - Análisis de confianza para casos ambiguos
 */

import { cacheService } from './cache.service.js'

// ============================================================================
// TIPOS Y CONFIGURACIÓN
// ============================================================================

export type RouteType = 'mudafy_info' | 'conversation' | 'property_title' | 'market_data'

export interface ClassificationResult {
  route: RouteType
  confidence: 'high' | 'medium' | 'low'
  method: 'local' | 'orchestrator'
  reasoning?: string
  keywords?: string[]
  duration: number
}

export interface KeywordPattern {
  keyword: string
  route: RouteType
  weight: number
  occurrences: number
  lastSeen: number
}

// ============================================================================
// CLASSIFIER SERVICE
// ============================================================================

export class ClassifierService {
  // Keywords base (manual)
  private baseKeywords: Map<RouteType, string[]> = new Map([
    [
      'mudafy_info',
      [
        // Empresa y producto
        'mudafy',
        'fénix',
        'fenix',
        'portal inmobiliario',
        'crm',
        'tecnología',
        'mudacademy',
        'manual del asesor',
        'capacitación',

        // Negocio inmobiliario
        'propiedad',
        'inmueble',
        'casa',
        'departamento',
        'depto',
        'terreno',
        'local comercial',
        'oficina',
        'ph',

        // Operaciones
        'venta',
        'alquiler',
        'alquila',
        'compra',
        'vende',
        'inversión',

        // Términos profesionales
        'captación',
        'lead',
        'leads',
        'comisión',
        'comisiones',
        'honorarios',
        'asesor',
        'tasación',
        'valuación',
        'escritura',

        // Marketing y publicación
        'publicación',
        'publicacion',
        'publicar',
        'anuncio',
        'marketing',
        'fotos',
        'descripción',
        'descripcion',

        // Ubicación
        'barrio',
        'zona',
        'ubicación',
        'ubicacion',
        'dirección',
        'direccion',

        // Características
        'ambientes',
        'habitación',
        'habitacion',
        'dormitorio',
        'baño',
        'bano',
        'cochera',
        'garage',
        'balcón',
        'balcon',
        'terraza',
        'jardín',
        'jardin',
        'pileta',
        'piscina',
        'amenities',
        'expensas',
      ],
    ],
    [
      'property_title',
      [
        'título',
        'titulo',
        'títulos',
        'titulos',
        'armar título',
        'crear título',
        'hacer título',
        'ayuda con título',
        'título de publicación',
        'titulo de publicacion',
        'cómo hacer un título',
        'como hacer un titulo',
      ],
    ],
    [
      'market_data',
      [
        // Preguntas de precio
        'cuanto vale',
        'cuánto vale',
        'cuanto cuesta',
        'cuánto cuesta',
        'precio',
        'precios',
        'valor',
        'cotización',
        'cotizacion',

        // Zonas y barrios
        'palermo',
        'belgrano',
        'recoleta',
        'caballito',
        'san isidro',
        'vicente lopez',
        'vicente lópez',
        'zona norte',
        'zona sur',
        'zona oeste',
        'caba',
        'capital federal',
        'gba',

        // Mercado
        'mercado',
        'tendencia',
        'tendencias',
        'subida',
        'bajada',
        'sube',
        'baja',
        'evolución',
        'evolucion',

        // Datos numéricos
        'm2',
        'metro cuadrado',
        'metros cuadrados',
        'usd',
        'dolar',
        'dólar',
        'dolares',
        'dólares',

        // Inversión
        'invertir',
        'inversión',
        'inversion',
        'rentabilidad',
        'ganancia',
        'retorno',
        'roi',

        // Comparación
        'comparar',
        'comparación',
        'comparacion',
        'vs',
        'versus',
        'mejor zona',
        'peor zona',
        'conviene',

        // Datos de mercado
        'expensas',
        'tiempo de venta',
        'demanda',
        'oferta',
        'stock',
        'disponible',
      ],
    ],
    [
      'conversation',
      [
        // Saludos
        'hola',
        'hey',
        'buenos días',
        'buenos dias',
        'buenas tardes',
        'buenas noches',
        'buen día',
        'buen dia',

        // Agradecimientos
        'gracias',
        'perfecto',
        'genial',
        'excelente',
        'ok',
        'dale',

        // Casual
        'cómo estás',
        'como estas',
        'qué tal',
        'que tal',
        'todo bien',
        'chau',
        'adiós',
        'adios',
        'hasta luego',
      ],
    ],
  ])

  // Keywords aprendidas dinámicamente
  private learnedKeywords: Map<string, KeywordPattern> = new Map()

  // Configuración
  private readonly MIN_MESSAGE_LENGTH_FOR_ORCHESTRATOR = 100
  private readonly LEARNING_RATE = 0.1

  constructor() {
    this.loadLearnedKeywords()
    console.log('🧠 Classifier Service inicializado')
    console.log(`   Base keywords: ${this.countBaseKeywords()}`)
    console.log(`   Learned keywords: ${this.learnedKeywords.size}`)
  }

  // ==========================================================================
  // CLASIFICACIÓN PRINCIPAL
  // ==========================================================================

  /**
   * Clasifica un mensaje con el método más apropiado
   */
  async classify(message: string): Promise<ClassificationResult> {
    const startTime = Date.now()

    // 1. Casos triviales (muy cortos o comandos)
    if (this.isTrivial(message)) {
      return {
        route: 'conversation',
        confidence: 'high',
        method: 'local',
        reasoning: 'Mensaje trivial o comando',
        duration: Date.now() - startTime,
      }
    }

    // 2. Clasificación local con keywords
    const localResult = this.classifyLocal(message)

    // 3. Decidir si usar Orchestrator
    const needsOrchestrator = this.shouldUseOrchestrator(message, localResult)

    if (!needsOrchestrator) {
      return {
        ...localResult,
        method: 'local',
        duration: Date.now() - startTime,
      }
    }

    // 4. Caso ambiguo → necesita Orchestrator
    // (el llamado al Orchestrator se hace en openai.service.ts)
    return {
      ...localResult,
      method: 'local',
      confidence: 'low',
      reasoning: 'Necesita análisis del Orchestrator',
      duration: Date.now() - startTime,
    }
  }

  // ==========================================================================
  // CLASIFICACIÓN LOCAL (RÁPIDA)
  // ==========================================================================

  private classifyLocal(message: string): Omit<ClassificationResult, 'method' | 'duration'> {
    const normalized = this.normalize(message)
    const words = normalized.split(/\s+/)

    // Calcular scores por cada route
    const scores: Map<RouteType, { score: number; keywords: string[] }> = new Map()

    // 1. Check keywords base
    for (const [route, keywords] of this.baseKeywords) {
      const matchedKeywords: string[] = []
      let score = 0

      for (const keyword of keywords) {
        if (normalized.includes(keyword)) {
          matchedKeywords.push(keyword)
          score += 1
        }
      }

      scores.set(route, { score, keywords: matchedKeywords })
    }

    // 2. Check keywords aprendidas (con peso)
    for (const [keyword, pattern] of this.learnedKeywords) {
      if (normalized.includes(keyword)) {
        const existing = scores.get(pattern.route) || { score: 0, keywords: [] }
        existing.score += pattern.weight
        existing.keywords.push(keyword)
        scores.set(pattern.route, existing)
      }
    }

    // 3. Determinar la ruta ganadora
    let maxScore = 0
    let bestRoute: RouteType = 'conversation'
    let bestKeywords: string[] = []

    for (const [route, data] of scores) {
      if (data.score > maxScore) {
        maxScore = data.score
        bestRoute = route
        bestKeywords = data.keywords
      }
    }

    // 4. Calcular confianza
    const totalWords = words.length
    const confidence = this.calculateConfidence(maxScore, totalWords, bestKeywords)

    return {
      route: bestRoute,
      confidence,
      keywords: bestKeywords,
      reasoning: `Local: ${maxScore} puntos, ${bestKeywords.length} keywords`,
    }
  }

  // ==========================================================================
  // ANÁLISIS DE CONFIANZA
  // ==========================================================================

  private calculateConfidence(
    score: number,
    totalWords: number,
    keywords: string[]
  ): 'high' | 'medium' | 'low' {
    // Ratio de keywords vs palabras totales
    const ratio = keywords.length / Math.max(totalWords, 1)

    if (score >= 3 && ratio > 0.3) return 'high'
    if (score >= 2 && ratio > 0.15) return 'medium'
    return 'low'
  }

  private shouldUseOrchestrator(
    message: string,
    localResult: Omit<ClassificationResult, 'method' | 'duration'>
  ): boolean {
    // Confianza alta → no necesita Orchestrator
    if (localResult.confidence === 'high') {
      return false
    }

    // Mensaje muy corto → probablemente es conversacional
    if (message.length < 20) {
      return false
    }

    // Mensaje largo y confianza baja → necesita Orchestrator
    if (message.length > this.MIN_MESSAGE_LENGTH_FOR_ORCHESTRATOR && localResult.confidence === 'low') {
      return true
    }

    // Confianza media → depende del score
    if (localResult.confidence === 'medium' && message.length > 50) {
      return true
    }

    return false
  }

  // ==========================================================================
  // APRENDIZAJE DESDE ORCHESTRATOR
  // ==========================================================================

  /**
   * Aprende keywords desde la decisión del Orchestrator
   */
  async learnFromOrchestrator(
    message: string,
    orchestratorRoute: RouteType,
    localRoute: RouteType
  ): Promise<void> {
    // Solo aprender si el Orchestrator decidió diferente que el local
    if (orchestratorRoute === localRoute) {
      return
    }

    console.log(`📚 Aprendiendo: "${message.substring(0, 50)}..." → ${orchestratorRoute}`)

    // Extraer palabras clave del mensaje
    const keywords = this.extractKeywords(message)

    for (const keyword of keywords) {
      // No agregar si ya está en keywords base
      if (this.isBaseKeyword(keyword)) {
        continue
      }

      const existingPattern = this.learnedKeywords.get(keyword)

      if (existingPattern) {
        // Actualizar pattern existente
        if (existingPattern.route === orchestratorRoute) {
          existingPattern.weight += this.LEARNING_RATE
          existingPattern.occurrences++
        } else {
          // Conflicto: el keyword aparece en diferentes rutas
          existingPattern.weight -= this.LEARNING_RATE
          if (existingPattern.weight <= 0) {
            this.learnedKeywords.delete(keyword)
          }
        }
        existingPattern.lastSeen = Date.now()
      } else {
        // Nuevo pattern
        this.learnedKeywords.set(keyword, {
          keyword,
          route: orchestratorRoute,
          weight: this.LEARNING_RATE,
          occurrences: 1,
          lastSeen: Date.now(),
        })
      }
    }

    // Persistir keywords aprendidas
    await this.saveLearnedKeywords()
  }

  /**
   * Extrae keywords relevantes de un mensaje
   */
  private extractKeywords(message: string): string[] {
    const normalized = this.normalize(message)
    const words = normalized.split(/\s+/)

    // Filtrar stopwords y palabras muy comunes
    const stopwords = new Set([
      'el',
      'la',
      'de',
      'que',
      'en',
      'un',
      'una',
      'por',
      'para',
      'con',
      'es',
      'como',
      'me',
      'te',
      'se',
      'mi',
      'tu',
      'su',
      'si',
      'no',
      'más',
      'mas',
      'pero',
      'este',
      'esta',
      'los',
      'las',
      'del',
      'al',
    ])

    // Palabras relevantes (3+ caracteres, no stopwords)
    const keywords = words.filter(w => w.length >= 3 && !stopwords.has(w))

    // También extraer bigramas importantes
    const bigrams: string[] = []
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`
      if (bigram.length >= 6) {
        bigrams.push(bigram)
      }
    }

    return [...keywords, ...bigrams]
  }

  // ==========================================================================
  // UTILIDADES
  // ==========================================================================

  private isTrivial(message: string): boolean {
    const normalized = this.normalize(message)

    // Comandos
    if (normalized.startsWith('/')) return true

    // Muy corto
    if (normalized.length < 5) return true

    // Solo saludos
    const greetings = ['hola', 'hey', 'buenos dias', 'buenas tardes', 'buenas noches']
    if (greetings.some(g => normalized === g)) return true

    return false
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[¿?¡!.,;:()]/g, '')
  }

  private isBaseKeyword(keyword: string): boolean {
    for (const keywords of this.baseKeywords.values()) {
      if (keywords.includes(keyword)) {
        return true
      }
    }
    return false
  }

  private countBaseKeywords(): number {
    let count = 0
    for (const keywords of this.baseKeywords.values()) {
      count += keywords.length
    }
    return count
  }

  // ==========================================================================
  // PERSISTENCIA
  // ==========================================================================

  private async saveLearnedKeywords(): Promise<void> {
    const data = Array.from(this.learnedKeywords.entries())
    await cacheService.set('classifier:learned_keywords', data)
    console.log(`💾 Saved ${data.length} learned keywords`)
  }

  private async loadLearnedKeywords(): Promise<void> {
    try {
      const data = await cacheService.get<[string, KeywordPattern][]>('classifier:learned_keywords')
      if (data) {
        this.learnedKeywords = new Map(data)
        console.log(`📥 Loaded ${data.length} learned keywords`)
      }
    } catch (error) {
      console.log('📥 No learned keywords found (fresh start)')
    }
  }

  /**
   * Obtiene estadísticas del clasificador
   */
  getStats() {
    const learnedByRoute: Record<RouteType, number> = {
      mudafy_info: 0,
      conversation: 0,
      property_title: 0,
      market_data: 0,
    }

    for (const pattern of this.learnedKeywords.values()) {
      learnedByRoute[pattern.route]++
    }

    return {
      baseKeywords: this.countBaseKeywords(),
      learnedKeywords: this.learnedKeywords.size,
      learnedByRoute,
      topLearnedKeywords: this.getTopLearnedKeywords(10),
    }
  }

  private getTopLearnedKeywords(limit: number): KeywordPattern[] {
    return Array.from(this.learnedKeywords.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit)
  }

  /**
   * Log de estadísticas
   */
  logStats(): void {
    const stats = this.getStats()
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🧠 CLASSIFIER STATS')
    console.log(`   Base Keywords: ${stats.baseKeywords}`)
    console.log(`   Learned Keywords: ${stats.learnedKeywords}`)
    console.log('   By Route:')
    console.log(`     - mudafy_info: ${stats.learnedByRoute.mudafy_info}`)
    console.log(`     - market_data: ${stats.learnedByRoute.market_data}`)
    console.log(`     - conversation: ${stats.learnedByRoute.conversation}`)
    console.log(`     - property_title: ${stats.learnedByRoute.property_title}`)
    console.log('   Top Learned:')
    stats.topLearnedKeywords.forEach((kw, i) => {
      console.log(`     ${i + 1}. "${kw.keyword}" → ${kw.route} (${kw.weight.toFixed(2)})`)
    })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const classifierService = new ClassifierService()
