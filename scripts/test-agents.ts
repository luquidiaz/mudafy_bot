import dotenv from 'dotenv';
import { openAIService } from '../src/services/openai.service';

dotenv.config();

async function testAgents() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TEST DE MULTI-AGENT ARCHITECTURE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testUserId = 'test_user_123';

  // Test 1: Pregunta sobre Mudafy (debería usar Info Agent con File Search)
  console.log('📋 TEST 1: Pregunta sobre Mudafy');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Pregunta: "Qué es Mudafy?"\n');

  try {
    const response1 = await openAIService.processMessage(testUserId, 'Qué es Mudafy?');
    console.log('\n✅ RESPUESTA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(response1);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');
  } catch (error) {
    console.error('❌ Error en Test 1:', error);
  }

  // Esperar un poco entre tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Pregunta conversacional (debería usar Conversation Agent)
  console.log('📋 TEST 2: Pregunta conversacional');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Pregunta: "Cómo estás?"\n');

  try {
    const response2 = await openAIService.processMessage(testUserId, 'Cómo estás?');
    console.log('\n✅ RESPUESTA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(response2);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');
  } catch (error) {
    console.error('❌ Error en Test 2:', error);
  }

  // Esperar un poco entre tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Otra pregunta sobre Mudafy para verificar File Search
  console.log('📋 TEST 3: Otra pregunta sobre Mudafy');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Pregunta: "Cuáles son los beneficios de Mudafy?"\n');

  try {
    const response3 = await openAIService.processMessage(testUserId, 'Cuáles son los beneficios de Mudafy?');
    console.log('\n✅ RESPUESTA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(response3);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');
  } catch (error) {
    console.error('❌ Error en Test 3:', error);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ TESTS COMPLETADOS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📊 RESUMEN:');
  console.log('- Test 1: Debería haber usado Info Agent + File Search');
  console.log('- Test 2: Debería haber usado Conversation Agent');
  console.log('- Test 3: Debería haber usado Info Agent + File Search');
  console.log('\nBusca en los logs arriba los emojis:');
  console.log('  🔍 = File Search usado');
  console.log('  🎭 = Orchestrator consultado');
  console.log('  📚 = Info Agent ejecutado');
  console.log('  💬 = Conversation Agent ejecutado\n');
}

// Ejecutar tests
testAgents()
  .then(() => {
    console.log('🎉 Script de test finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
