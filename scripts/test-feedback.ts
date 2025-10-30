/**
 * Script de prueba del sistema de feedback
 * Simula conversaciones para verificar la detección implícita
 */

import { implicitFeedbackService } from '../src/services/implicit-feedback.service.js'
import { feedbackService } from '../src/services/feedback.service.js'

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🧪 TEST: Sistema de Feedback')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

// Simular conversaciones
const testConversations = [
  {
    userId: 'test1',
    conversation: [
      {
        userMessage: 'Cuánto vale en Palermo?',
        botResponse: 'Según datos de Enero 2025, Palermo tiene un precio promedio de USD 4500/m²',
        expectedFeedback: null, // Primera pregunta, no hay feedback previo
      },
      {
        userMessage: 'Perfecto, gracias!',
        botResponse: 'De nada!',
        expectedFeedback: 'satisfied', // Respuesta positiva
      },
    ],
  },
  {
    userId: 'test2',
    conversation: [
      {
        userMessage: 'Cómo funciona el CRM?',
        botResponse: 'Fénix CRM es la plataforma de gestión de Mudafy...',
        expectedFeedback: null,
      },
      {
        userMessage: 'No entiendo, otra forma?',
        botResponse: 'Claro, te explico de forma más simple...',
        expectedFeedback: 'dissatisfied', // Respuesta negativa
      },
    ],
  },
  {
    userId: 'test3',
    conversation: [
      {
        userMessage: 'Qué es Mudafy?',
        botResponse: 'Mudafy es el ecosistema inmobiliario...',
        expectedFeedback: null,
      },
      {
        userMessage: 'Y cuánto cuesta?',
        botResponse: 'Tenemos varios planes...',
        expectedFeedback: 'neutral', // Continúa conversación normal
      },
    ],
  },
]

let passed = 0
let failed = 0

for (const test of testConversations) {
  console.log(`\n👤 Usuario: ${test.userId}`)
  console.log('─────────────────────────────────────\n')

  for (let i = 0; i < test.conversation.length; i++) {
    const { userMessage, botResponse, expectedFeedback } = test.conversation[i]

    console.log(`💬 User: "${userMessage}"`)

    // Analizar mensaje del usuario (feedback de la respuesta anterior)
    const detectedFeedback = implicitFeedbackService.analyzeUserResponse(
      test.userId,
      userMessage
    )

    if (expectedFeedback) {
      if (detectedFeedback === expectedFeedback) {
        console.log(`   ✅ Feedback detectado: ${detectedFeedback} (esperado: ${expectedFeedback})`)
        passed++
      } else {
        console.log(
          `   ❌ Feedback detectado: ${detectedFeedback} (esperado: ${expectedFeedback})`
        )
        failed++
      }
    } else {
      console.log(`   ℹ️  Feedback: ${detectedFeedback} (primera pregunta, no se evalúa)`)
    }

    // Simular respuesta del bot
    console.log(`🤖 Bot: "${botResponse.substring(0, 50)}..."`)

    // Registrar respuesta del bot para próxima iteración
    implicitFeedbackService.registerBotResponse(test.userId, botResponse, 'test_route')

    // También registrar en feedback service
    feedbackService.registerResponse(test.userId, userMessage, botResponse, 'test_route', 1500)

    console.log('')
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📊 RESULTADOS')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`✅ Pasados: ${passed}`)
console.log(`❌ Fallidos: ${failed}`)
console.log(`📈 Tasa de éxito: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

// Test de feedback pasivo
console.log('🧪 TEST: Feedback Pasivo (Thumbs)\n')

const testUserId = 'test_passive'

// Registrar una respuesta
feedbackService.registerResponse(
  testUserId,
  'Test question',
  'Test answer',
  'test_route',
  2000
)

// Enviar feedback positivo
const success = await feedbackService.submitFeedback(testUserId, 'good')

if (success) {
  console.log('✅ Feedback pasivo registrado correctamente')
} else {
  console.log('❌ Error al registrar feedback pasivo')
}

// Verificar estadísticas
console.log('\n📊 Estadísticas de Feedback:\n')
feedbackService.logStats()

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('✅ Tests completados')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
