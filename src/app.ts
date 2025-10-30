import { createBot, createProvider, createFlow, addKeyword, EVENTS } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { MemoryDB as Database } from '@builderbot/bot'
import { openAIService } from './services/openai.service.js'
import { typing } from './utils/presence.js'
import { cacheService } from './services/cache.service.js'
import { classifierService } from './services/classifier.service.js'

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
        '📊 */stats* - Ver estadísticas de rendimiento',
        '❓ */ayuda* - Muestra este mensaje',
      ].join('\n'))
      return
    }

    // Comando /stats (solo para desarrollo)
    if (userMessage.toLowerCase() === '/stats') {
      console.log('📊 Comando: /stats')
      const cacheStats = await cacheService.getStats()
      const classifierStats = classifierService.getStats()

      await flowDynamic([
        '📊 *Estadísticas del Bot*',
        '',
        '💾 *Caché:*',
        `• Hits: ${cacheStats.hits}`,
        `• Misses: ${cacheStats.misses}`,
        `• Hit Rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`,
        `• Entradas: ${cacheStats.totalEntries}`,
        '',
        '🧠 *Clasificador:*',
        `• Keywords base: ${classifierStats.baseKeywords}`,
        `• Keywords aprendidas: ${classifierStats.learnedKeywords}`,
        `• Knowledge: ${classifierStats.learnedByRoute.mudafy_info}`,
        `• Market Data: ${classifierStats.learnedByRoute.market_data}`,
        `• Conversación: ${classifierStats.learnedByRoute.conversation}`,
      ].join('\n'))
      return
    }

    // Comando /reset
    if (userMessage.toLowerCase() === '/reset' || userMessage.toLowerCase() === 'reset') {
      console.log('🔄 Comando: /reset')
      await openAIService.clearUserThread(userId)
      greetedUsers.delete(userId)
      await flowDynamic('🔄 Conversación reiniciada!')
      return
    }

    try {
      // Saludo inicial (solo primera vez)
      if (!greetedUsers.has(userId)) {
        console.log('👋 Primera vez - enviando saludo')
        greetedUsers.add(userId)
        await flowDynamic('¡Hola! 👋 Soy *Sofia de Mudafy*, tu asistente inteligente.')
        await flowDynamic('Pregúntame lo que quieras! 😊')
        return
      }

      console.log('🤖 Procesando con Multi-Agent...')

      // Mostrar "escribiendo..." mientras procesa
      await typing(ctx, provider)

      // Procesar mensaje con arquitectura multi-agent
      console.log('   ⏳ Enviando a Orchestrator...')
      const aiResponse = await openAIService.processMessage(userId, userMessage)
      console.log(`   ✅ Respuesta final recibida: "${aiResponse.substring(0, 80)}..."`)

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
  console.log('🎭 Multi-Agent: Orchestrator + 2 Agents')
  console.log('⚡ Optimizaciones: Caché + Clasificador Híbrido')
  console.log('⏳ Esperando mensajes...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Log de estadísticas cada 10 minutos
  setInterval(async () => {
    console.log('\n')
    await cacheService.logStats()
    classifierService.logStats()
    console.log('\n')
  }, 10 * 60 * 1000)

  process.on('SIGINT', () => {
    console.log('\n👋 Cerrando bot...')
    process.exit(0)
  })
}

main().catch(console.error)
