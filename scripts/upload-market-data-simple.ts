import dotenv from 'dotenv'
import OpenAI from 'openai'
import fs from 'fs'

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function uploadMarketData() {
  const assistantId = process.env.ASSISTANT_MARKET_DATA
  const marketDataFile = './market_data_2025-01.json'

  if (!assistantId) {
    console.error('❌ ASSISTANT_MARKET_DATA no está configurado en .env')
    process.exit(1)
  }

  if (!fs.existsSync(marketDataFile)) {
    console.error(`❌ Archivo no encontrado: ${marketDataFile}`)
    process.exit(1)
  }

  console.log('📤 Subiendo market_data_2025-01.json a OpenAI...\n')

  try {
    // 1. Subir archivo
    const file = await openai.files.create({
      file: fs.createReadStream(marketDataFile),
      purpose: 'assistants',
    })

    console.log(`✅ Archivo subido: ${file.id}`)
    console.log(`   Nombre: ${file.filename}`)
    console.log(`   Tamaño: ${file.bytes} bytes\n`)

    // 2. Obtener assistant actual
    const assistant = await openai.beta.assistants.retrieve(assistantId)
    console.log(`📋 Assistant actual: ${assistant.name}`)
    console.log(`   ID: ${assistant.id}\n`)

    // 3. Crear Vector Store
    console.log('📦 Creando Vector Store...\n')
    const vectorStore = await openai.beta.vectorStores.create({
      name: 'Market Data - Mudafy',
      file_ids: [file.id],
    })

    console.log(`✅ Vector Store creado: ${vectorStore.id}\n`)

    // 4. Actualizar assistant con file search
    const updatedAssistant = await openai.beta.assistants.update(assistantId, {
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id],
        },
      },
    })

    console.log('✅ Assistant actualizado con market data')
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 Market Data Agent configurado')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`\nAhora actualizá la variable en Railway:`)
    console.log(`ASSISTANT_MARKET_DATA=${assistantId}`)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

uploadMarketData()
