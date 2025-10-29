import { openAIService } from './src/services/openai.service.js'
import dotenv from 'dotenv'

dotenv.config()

async function test() {
  const testUserId = 'test-user-123'

  console.log('🧪 Testing Multi-Agent Architecture\n')

  // Test 1: Pregunta sobre Mudafy
  console.log('1️⃣ Test: "Qué es Mudafy?"')
  const response1 = await openAIService.processMessage(testUserId, 'Qué es Mudafy?')
  console.log('Respuesta:', response1)
  console.log('\n---\n')

  // Test 2: Conversación casual
  console.log('2️⃣ Test: "Cómo estás?"')
  const response2 = await openAIService.processMessage(testUserId, 'Cómo estás?')
  console.log('Respuesta:', response2)
  console.log('\n---\n')

  // Test 3: Pregunta sobre features
  console.log('3️⃣ Test: "Cuáles son las features de Mudafy?"')
  const response3 = await openAIService.processMessage(testUserId, 'Cuáles son las features de Mudafy?')
  console.log('Respuesta:', response3)
  console.log('\n---\n')

  console.log('✅ Tests completados')
}

test().catch(console.error)
