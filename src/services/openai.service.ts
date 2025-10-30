import OpenAI from 'openai'
import dotenv from 'dotenv'
import { classifierService } from './classifier.service.js'
import { cacheService } from './cache.service.js'

// Cargar variables de entorno
dotenv.config()

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const ASSISTANT_ORCHESTRATOR = process.env.ASSISTANT_ORCHESTRATOR || ''
const ASSISTANT_CONVERSATION = process.env.ASSISTANT_CONVERSATION || ''
const ASSISTANT_INFO = process.env.ASSISTANT_INFO || ''
const ASSISTANT_MARKET_DATA = process.env.ASSISTANT_MARKET_DATA || ''

console.log('🔑 OpenAI API Key:', OPENAI_API_KEY ? `${OPENAI_API_KEY.substring(0, 20)}...` : 'NO CONFIGURADA')
console.log('🎭 Orchestrator:', ASSISTANT_ORCHESTRATOR || 'NO CONFIGURADO')
console.log('💬 Conversation Agent:', ASSISTANT_CONVERSATION || 'NO CONFIGURADO')
console.log('📚 Knowledge Agent (Info):', ASSISTANT_INFO || 'NO CONFIGURADO')
console.log('📊 Market Data Agent:', ASSISTANT_MARKET_DATA || 'NO CONFIGURADO')

if (!OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY no configurada. El bot no podrá usar IA.')
}

if (!ASSISTANT_ORCHESTRATOR || !ASSISTANT_CONVERSATION || !ASSISTANT_INFO || !ASSISTANT_MARKET_DATA) {
  console.warn('⚠️  Falta configurar algunos Assistants IDs.')
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
})

// Map para guardar threads por usuario
const userThreads = new Map<string, string>()

/**
 * Servicio Multi-Agent con OpenAI Assistants API
 */
export class OpenAIService {

  /**
   * Obtiene o crea un thread para el usuario
   */
  private async getOrCreateThread(userId: string): Promise<string> {
    if (userThreads.has(userId)) {
      return userThreads.get(userId)!
    }

    // Crear nuevo thread
    const thread = await openai.beta.threads.create()
    userThreads.set(userId, thread.id)
    console.log(`   📝 Thread creado para usuario: ${thread.id}`)
    return thread.id
  }

  /**
   * Ejecuta un assistant y espera su respuesta
   */
  private async runAssistant(threadId: string, assistantId: string, agentName: string = 'Agent'): Promise<string> {
    // Crear run
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    })

    console.log(`      ⏳ ${agentName} procesando...`)

    // Esperar a que complete
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id)

    while (runStatus.status !== 'completed') {
      if (runStatus.status === 'failed' || runStatus.status === 'expired' || runStatus.status === 'cancelled') {
        console.error(`      ❌ ${agentName} falló: ${runStatus.status}`)
        throw new Error(`Run failed with status: ${runStatus.status}`)
      }

      await new Promise(resolve => setTimeout(resolve, 500)) // Esperar 500ms
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id)
    }

    // Verificar si usó tools (File Search, etc)
    try {
      const runSteps = await openai.beta.threads.runs.steps.list(threadId, run.id)
      console.log(`      🔧 ${agentName} ejecutó ${runSteps.data.length} step(s)`)

      for (const step of runSteps.data) {
        if (step.type === 'tool_calls') {
          console.log(`      🔍 ${agentName} usó File Search!`)
        } else if (step.type === 'message_creation') {
          console.log(`      💬 ${agentName} generó respuesta`)
        }
      }
    } catch (stepError) {
      // Si falla al leer steps, continuar igual
      console.log('      ⚠️  No se pudieron leer los steps')
    }

    // Obtener mensajes
    const messages = await openai.beta.threads.messages.list(threadId)
    const lastMessage = messages.data[0]

    if (lastMessage.role === 'assistant') {
      const content = lastMessage.content[0]
      if (content.type === 'text') {
        return content.text.value
      }
    }

    return 'No pude obtener una respuesta.'
  }

  /**
   * Parsea la respuesta del orchestrator para extraer la ruta
   */
  private parseRoute(orchestratorResponse: string): 'mudafy_info' | 'conversation' | 'market_data' | null {
    const lowerResponse = orchestratorResponse.toLowerCase()

    // Buscar "route:" seguido del agent
    if (lowerResponse.includes('route: market_data') || lowerResponse.includes('market_data_agent')) {
      return 'market_data'
    }

    if (lowerResponse.includes('route: knowledge') || lowerResponse.includes('knowledge_agent') ||
        lowerResponse.includes('route: mudafy_info') || lowerResponse.includes('mudafy_info')) {
      return 'mudafy_info'
    }

    if (lowerResponse.includes('route: conversation') || lowerResponse.includes('conversation_agent')) {
      return 'conversation'
    }

    // Fallback: si menciona "mudafy" probablemente es info
    if (lowerResponse.includes('mudafy')) {
      return 'mudafy_info'
    }

    // Default: conversation
    return 'conversation'
  }

  /**
   * Procesa un mensaje del usuario usando arquitectura multi-agent OPTIMIZADA
   */
  async processMessage(userId: string, userMessage: string): Promise<string> {
    if (!OPENAI_API_KEY) {
      return 'Lo siento, el servicio de IA no está configurado correctamente.'
    }

    const startTime = Date.now()

    try {
      // ====================================================================
      // 1. VERIFICAR CACHÉ
      // ====================================================================
      const cached = await cacheService.getResponse(userId, userMessage)
      if (cached) {
        const duration = Date.now() - startTime
        console.log(`   🎯 CACHE HIT! (${duration}ms)`)
        return cached
      }
      console.log('   🔍 Cache miss - procesando...')

      // ====================================================================
      // 2. CLASIFICACIÓN INTELIGENTE
      // ====================================================================
      const classification = await classifierService.classify(userMessage)
      console.log(
        `   🧠 Clasificación: ${classification.route} (${classification.confidence}) via ${classification.method} (${classification.duration}ms)`
      )

      if (classification.keywords && classification.keywords.length > 0) {
        console.log(`      Keywords: ${classification.keywords.slice(0, 5).join(', ')}`)
      }

      // ====================================================================
      // 3. OBTENER O CREAR THREAD
      // ====================================================================
      const threadId = await this.getOrCreateThread(userId)

      // ====================================================================
      // 4. AGREGAR MENSAJE AL THREAD
      // ====================================================================
      await openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: userMessage,
      })

      let finalRoute: 'mudafy_info' | 'conversation' | 'market_data' =
        classification.route === 'property_title' ? 'mudafy_info' : classification.route as any

      // ====================================================================
      // 5. DECIDIR SI USAR ORCHESTRATOR
      // ====================================================================
      if (classification.confidence === 'low' || classification.method === 'orchestrator') {
        console.log('   🎭 Consultando Orchestrator (caso ambiguo)...')
        const orchestratorResponse = await this.runAssistant(threadId, ASSISTANT_ORCHESTRATOR, 'Orchestrator')
        console.log(`   🎭 Orchestrator decidió: ${orchestratorResponse.substring(0, 80)}...`)

        const orchestratorRoute = this.parseRoute(orchestratorResponse) || 'conversation'
        console.log(`   🚦 Ruta final (Orchestrator): ${orchestratorRoute}`)

        // Aprender desde el Orchestrator
        if (classification.route !== orchestratorRoute) {
          await classifierService.learnFromOrchestrator(
            userMessage,
            orchestratorRoute as any,
            classification.route
          )
        }

        finalRoute = orchestratorRoute
      } else {
        console.log(`   ⚡ Fast route (${classification.confidence} confidence): ${finalRoute}`)
      }

      // ====================================================================
      // 6. EJECUTAR AGENT ESPECIALIZADO
      // ====================================================================
      let finalResponse: string

      if (finalRoute === 'market_data') {
        console.log('   📊 Ejecutando Market Data Agent...')
        finalResponse = await this.runAssistant(threadId, ASSISTANT_MARKET_DATA, 'Market Data Agent')
      } else if (finalRoute === 'mudafy_info') {
        console.log('   📚 Ejecutando Knowledge Agent...')
        finalResponse = await this.runAssistant(threadId, ASSISTANT_INFO, 'Knowledge Agent')
      } else {
        console.log('   💬 Ejecutando Conversation Agent...')
        finalResponse = await this.runAssistant(threadId, ASSISTANT_CONVERSATION, 'Conversation Agent')
      }

      // ====================================================================
      // 7. GUARDAR EN CACHÉ
      // ====================================================================
      await cacheService.setResponse(userId, userMessage, finalResponse)

      // ====================================================================
      // 8. MÉTRICAS
      // ====================================================================
      const totalDuration = Date.now() - startTime
      console.log(`   ⏱️  Tiempo total: ${totalDuration}ms`)

      return finalResponse.trim()

    } catch (error) {
      console.error('❌ Error en OpenAI Service:', error)

      if (error instanceof Error) {
        if (error.message.includes('rate_limit')) {
          return 'Lo siento, he alcanzado el límite de uso. Por favor intenta en unos minutos.'
        }
        if (error.message.includes('invalid_api_key')) {
          return 'Error de configuración. Por favor contacta al administrador.'
        }
      }

      return 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor intenta nuevamente.'
    }
  }

  /**
   * Limpia el thread de un usuario (reinicia conversación)
   */
  async clearUserThread(userId: string): Promise<void> {
    if (userThreads.has(userId)) {
      // Crear un nuevo thread
      const thread = await openai.beta.threads.create()
      userThreads.set(userId, thread.id)
      console.log('   🔄 Thread reiniciado para usuario')
    }
  }
}

export const openAIService = new OpenAIService()
