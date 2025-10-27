import { createBot, createProvider, createFlow, addKeyword } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { MemoryDB as Database } from '@builderbot/bot'

const welcomeFlow = addKeyword<Provider, Database>(['hi', 'hello', 'hola'])
  .addAnswer('🙌 Hello welcome to this *Chatbot*')

const main = async () => {
  console.log('🤖 Iniciando Mudafy Bot...')

  const adapterFlow = createFlow([welcomeFlow])
  const adapterProvider = createProvider(Provider)
  const adapterDB = new Database()

  console.log('📡 Conectando con WhatsApp...')

  const { httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  })

  httpServer(3008)

  console.log('✅ Bot iniciado correctamente')
  console.log('🌐 Abre http://localhost:3008 para ver el QR')
  console.log('⏳ Esperando conexión con WhatsApp...')

  // Mantener el proceso vivo
  process.on('SIGINT', () => {
    console.log('👋 Cerrando bot...')
    process.exit(0)
  })
}

main().catch(console.error)
