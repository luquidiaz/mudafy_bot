import { createBot, createProvider, createFlow, addKeyword, EVENTS } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { MemoryDB as Database } from '@builderbot/bot'
import { openAIService } from './services/openai.service.js'
import { memoryService } from './services/memory.service.js'
import { typing } from './utils/presence.js'

const PORT = process.env.PORT ?? 3008

// Track if user has been greeted
const greetedUsers = new Set<string>()

// Flujo principal que captura TODO
const mainFlow = addKeyword<Provider, Database>(EVENTS.WELCOME)
  .addAction(async (ctx, { flowDynamic, provider }) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📨 MENSAJE RECIBIDO')
    console.log('   De:', ctx.from)
    console.log('   Mensaje:', ctx.body)
    console.log('   Nombre:', ctx.name)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const userId = ctx.from
    const userMessage = ctx.body?.trim()

    if (!userMessage) {
      console.log('⚠️  Mensaje vacío - ignorado')
      return
    }

    // Comando /ayuda
    if (userMessage.toLowerCase() === '/ayuda' || userMessage.toLowerCase() === 'ayuda') {
      console.log('📋 Comando: /ayuda')
      await flowDynamic([
        '📋 *Comandos disponibles:*',
        '',
        '💬 *Conversación:* Simplemente escríbeme cualquier cosa',
        '🔄 */reset* - Reinicia la conversación',
        '❓ */ayuda* - Muestra este mensaje',
      ].join('\n'))
      return
    }

    // Comando /reset
    if (userMessage.toLowerCase() === '/reset' || userMessage.toLowerCase() === 'reset') {
      console.log('🔄 Comando: /reset')
      memoryService.clearHistory(userId)
      greetedUsers.delete(userId)
      await flowDynamic('🔄 Conversación reiniciada!')
      return
    }

    try {
      // Saludo inicial (solo primera vez)
      if (!greetedUsers.has(userId)) {
        console.log('👋 Primera vez - enviando saludo')
        greetedUsers.add(userId)
        await flowDynamic('¡Hola! 👋 Soy *Mudafy*, tu asistente inteligente.')
        await flowDynamic('Pregúntame lo que quieras! 😊')
        return
      }

      console.log('🤖 Procesando con OpenAI...')

      // Agregar mensaje del usuario
      memoryService.addMessage(userId, 'user', userMessage)

      // Obtener historial
      const history = memoryService.getHistory(userId)
      console.log(`   📚 Historial: ${history.length} mensajes`)

      // Mostrar "escribiendo..." mientras procesa
      await typing(ctx, provider)

      // Consultar OpenAI
      console.log('   ⏳ Llamando a OpenAI...')
      const aiResponse = await openAIService.chat(history)
      console.log(`   ✅ Respuesta recibida: "${aiResponse.substring(0, 80)}..."`)

      // Guardar respuesta
      memoryService.addMessage(userId, 'assistant', aiResponse)

      // Enviar al usuario
      await flowDynamic(aiResponse)
      console.log('   📤 Respuesta enviada al usuario')

    } catch (error) {
      console.error('❌ ERROR:', error)
      await flowDynamic('Lo siento, hubo un error. Intenta de nuevo.')
    }
  })

const main = async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🤖 INICIANDO MUDAFY BOT')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const adapterFlow = createFlow([mainFlow])
  const adapterProvider = createProvider(Provider)
  const adapterDB = new Database()

  console.log('📡 Conectando con WhatsApp...')

  const { httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  })

  httpServer(+PORT)

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ BOT INICIADO CORRECTAMENTE')
  console.log('🌐 QR Code: http://localhost:' + PORT)
  console.log('🤖 OpenAI: gpt-4o-mini')
  console.log('⏳ Esperando mensajes...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  process.on('SIGINT', () => {
    console.log('\n👋 Cerrando bot...')
    process.exit(0)
  })
}

main().catch(console.error)
