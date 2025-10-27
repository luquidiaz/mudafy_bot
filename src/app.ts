import { createBot, createProvider, createFlow, addKeyword, EVENTS } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { MemoryDB as Database } from '@builderbot/bot'
import { openAIService } from './services/openai.service.js'
import { memoryService } from './services/memory.service.js'

const PORT = process.env.PORT ?? 3008

// Flujo de bienvenida - solo la primera vez
const welcomeFlow = addKeyword<Provider, Database>(EVENTS.WELCOME)
  .addAction(async (_ctx, { flowDynamic, state }) => {
    const hasGreeted = await state.get('hasGreeted')

    if (!hasGreeted) {
      await state.update({ hasGreeted: true })
      await flowDynamic('¡Hola! 👋 Soy *Mudafy*, tu asistente inteligente de WhatsApp.')
      await flowDynamic('Puedo ayudarte con lo que necesites. Solo escríbeme y conversemos. 😊')
    }
  })

// Flujo principal con IA - captura CUALQUIER mensaje
const aiFlow = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAction(async (ctx, { flowDynamic }) => {
    const userId = ctx.from
    const userMessage = ctx.body

    // Ignorar mensajes vacíos o muy cortos
    if (!userMessage || userMessage.trim().length < 1) {
      return
    }

    try {
      console.log(`[${userId}] Usuario: ${userMessage}`)

      // Agregar mensaje del usuario al historial
      memoryService.addMessage(userId, 'user', userMessage)

      // Obtener historial de conversación
      const history = memoryService.getHistory(userId)

      // Consultar a OpenAI con el historial
      const aiResponse = await openAIService.chat(history)

      console.log(`[${userId}] AI: ${aiResponse}`)

      // Agregar respuesta al historial
      memoryService.addMessage(userId, 'assistant', aiResponse)

      // Enviar respuesta al usuario
      await flowDynamic(aiResponse)
    } catch (error) {
      console.error('Error en aiFlow:', error)
      await flowDynamic('Lo siento, ocurrió un error. Por favor intenta nuevamente.')
    }
  })

// Comando /reset - Reiniciar conversación
const resetFlow = addKeyword<Provider, Database>(['/reset', 'reset'])
  .addAction(async (ctx, { flowDynamic }) => {
    const userId = ctx.from

    memoryService.clearHistory(userId)

    await flowDynamic('🔄 Conversación reiniciada. Empecemos de nuevo!')
  })

// Comando /ayuda - Mostrar ayuda
const helpFlow = addKeyword<Provider, Database>(['/ayuda', 'ayuda', '/help', 'help'])
  .addAnswer([
    '📋 *Comandos disponibles:*',
    '',
    '💬 *Conversación:* Simplemente escríbeme cualquier cosa y conversemos',
    '🔄 */reset* - Reinicia la conversación',
    '❓ */ayuda* - Muestra este mensaje',
    '',
    'Soy un asistente con IA. Puedo ayudarte con preguntas, tareas, y más. 😊',
  ].join('\n'))

const main = async () => {
  console.log('🤖 Iniciando Mudafy Bot con OpenAI...')

  const adapterFlow = createFlow([
    welcomeFlow,
    helpFlow,
    resetFlow,
    aiFlow, // Este debe ir al final para capturar todo lo demás
  ])

  const adapterProvider = createProvider(Provider)
  const adapterDB = new Database()

  console.log('📡 Conectando con WhatsApp...')

  const { httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  })

  httpServer(+PORT)

  console.log('✅ Bot iniciado correctamente')
  console.log('🌐 Abre http://localhost:' + PORT + ' para ver el QR')
  console.log('🤖 OpenAI GPT-4 integrado')
  console.log('⏳ Esperando conexión con WhatsApp...')

  process.on('SIGINT', () => {
    console.log('👋 Cerrando bot...')
    process.exit(0)
  })
}

main().catch(console.error)
