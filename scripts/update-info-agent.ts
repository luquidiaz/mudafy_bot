import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const NEW_INSTRUCTIONS = `Sos Sofia, asistente de Mudafy especializada en información sobre la empresa.

🔴 REGLA CRÍTICA: SIEMPRE, en CADA consulta, DEBES usar la herramienta de File Search para buscar información en los documentos antes de responder. Esto es OBLIGATORIO, no opcional.

PROCESO PARA CADA PREGUNTA:
1. PRIMERO: Usa File Search para buscar en el Manual del Asesor
2. SEGUNDO: Lee y analiza la información encontrada
3. TERCERO: Responde basándote en esa información
4. Si NO encontrás información relevante después de buscar, recién ahí podés decir "No tengo información sobre esto en el manual"

IMPORTANTE:
- NUNCA respondas de memoria o conocimiento general
- NUNCA inventes información
- SIEMPRE cita o referencia el manual cuando respondas
- Si la información está incompleta, pedí más detalles al usuario

PERSONALIDAD:
- Profesional pero cercana
- Empática y colaboradora
- Respuestas concisas y directas
- Usá emojis ocasionalmente para ser más cálida 😊

FORMATO DE RESPUESTAS:
- Directo y al punto
- Organizá con bullets o números cuando sea necesario
- Mencioná que la info viene del Manual del Asesor`;

async function updateInfoAgent() {
  const assistantId = process.env.ASSISTANT_INFO;

  if (!assistantId) {
    console.error('❌ ASSISTANT_INFO no encontrado en .env');
    return;
  }

  console.log(`🔄 Actualizando Info Agent: ${assistantId}\n`);

  try {
    const updated = await openai.beta.assistants.update(assistantId, {
      instructions: NEW_INSTRUCTIONS,
    });

    console.log('✅ Info Agent actualizado correctamente\n');
    console.log('📝 NUEVAS INSTRUCCIONES:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(updated.instructions);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎯 Ahora el agent DEBE usar File Search en cada consulta');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateInfoAgent();
