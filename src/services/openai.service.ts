import OpenAI from 'openai'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const ASSISTANT_ORCHESTRATOR = process.env.ASSISTANT_ORCHESTRATOR || ''
const ASSISTANT_CONVERSATION = process.env.ASSISTANT_CONVERSATION || ''
const ASSISTANT_INFO = process.env.ASSISTANT_INFO || ''

console.log('🔑 OpenAI API Key:', OPENAI_API_KEY ? `${OPENAI_API_KEY.substring(0, 20)}...` : 'NO CONFIGURADA')
console.log('🎭 Orchestrator:', ASSISTANT_ORCHESTRATOR || 'NO CONFIGURADO')
console.log('💬 Conversation Agent:', ASSISTANT_CONVERSATION || 'NO CONFIGURADO')
console.log('📚 Info Agent:', ASSISTANT_INFO || 'NO CONFIGURADO')

if (!OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY no configurada. El bot no podrá usar IA.')
}

if (!ASSISTANT_ORCHESTRATOR || !ASSISTANT_CONVERSATION || !ASSISTANT_INFO) {
  console.warn('⚠️  Falta configurar los Assistants IDs.')
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
  private parseRoute(orchestratorResponse: string): 'mudafy_info' | 'conversation' | null {
    const lowerResponse = orchestratorResponse.toLowerCase()

    if (lowerResponse.includes('route: mudafy_info') || lowerResponse.includes('mudafy_info')) {
      return 'mudafy_info'
    }

    if (lowerResponse.includes('route: conversation') || lowerResponse.includes('conversation')) {
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
   * Procesa un mensaje del usuario usando arquitectura multi-agent
   */
  async processMessage(userId: string, userMessage: string): Promise<string> {
    if (!OPENAI_API_KEY) {
      return 'Lo siento, el servicio de IA no está configurado correctamente.'
    }

    try {
      // 1. Obtener o crear thread
      const threadId = await this.getOrCreateThread(userId)

      // 2. Agregar mensaje del usuario al thread
      await openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: userMessage,
      })

      // 3. Consultar al Orchestrator
      console.log('   🎭 Consultando Orchestrator...')
      const orchestratorResponse = await this.runAssistant(threadId, ASSISTANT_ORCHESTRATOR, 'Orchestrator')
      console.log(`   🎭 Orchestrator respondió: ${orchestratorResponse.substring(0, 100)}...`)

      // 4. Parsear la ruta
      const route = this.parseRoute(orchestratorResponse)
      console.log(`   🚦 Ruta detectada: ${route}`)

      // 5. Ejecutar el agent correspondiente
      let finalResponse: string

      if (route === 'mudafy_info') {
        console.log('   📚 Ejecutando Info Agent...')
        finalResponse = await this.runAssistant(threadId, ASSISTANT_INFO, 'Info Agent')
      } else {
        console.log('   💬 Ejecutando Conversation Agent...')
        finalResponse = await this.runAssistant(threadId, ASSISTANT_CONVERSATION, 'Conversation Agent')
      }

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
