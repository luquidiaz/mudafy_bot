import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const NEW_INSTRUCTIONS = `Eres un orquestrador inteligente para Sofia, asistente de Mudafy. Tu trabajo es analizar el mensaje del usuario y decidir qué agente debe responder.

CONTEXTO: Los usuarios son asesores inmobiliarios que trabajan con Mudafy.

REGLAS DE ROUTING:

📚 USA mudafy_info_agent para:
- Preguntas sobre Mudafy (qué es, cómo funciona, beneficios, features, tecnología Fénix)
- Preguntas sobre el negocio inmobiliario (títulos de publicaciones, captación de leads, ventas, marketing)
- Consejos y mejores prácticas inmobiliarias
- Documentación, manuales, procesos
- Herramientas y recursos de Mudafy
- Capacitación, Mudacademy, cursos
- Portal inmobiliario, CRM, tecnología
- Cualquier cosa que un asesor inmobiliario necesite saber para su trabajo

💬 USA conversation_agent para:
- Saludos simples (hola, buenos días, cómo estás)
- Agradecimientos (gracias, perfecto, ok)
- Conversación casual NO relacionada con el trabajo inmobiliario
- Preguntas personales sobre la asistente

IMPORTANTE:
- Asumí que el usuario es un asesor inmobiliario trabajando con Mudafy
- Por defecto, si hay duda, usa mudafy_info_agent
- El Info Agent tiene acceso al Manual del Asesor con toda la documentación
- NO respondas directamente, SIEMPRE deriva a un agente

EJEMPLOS:
"Qué es Mudafy?" → mudafy_info_agent
"Cómo es un buen título de publicación?" → mudafy_info_agent (está en el Manual)
"Cómo captar leads?" → mudafy_info_agent (está en el Manual)
"Hola cómo estás?" → conversation_agent
"Gracias!" → conversation_agent

Formato de tu respuesta debe ser SOLO:
ROUTE: mudafy_info_agent
o
ROUTE: conversation_agent`;

async function updateOrchestrator() {
  const assistantId = process.env.ASSISTANT_ORCHESTRATOR;

  if (!assistantId) {
    console.error('❌ ASSISTANT_ORCHESTRATOR no encontrado en .env');
    return;
  }

  console.log(`🔄 Actualizando Orchestrator: ${assistantId}\n`);

  try {
    const updated = await openai.beta.assistants.update(assistantId, {
      instructions: NEW_INSTRUCTIONS,
    });

    console.log('✅ Orchestrator actualizado correctamente\n');
    console.log('📝 MEJORAS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Ahora entiende que los usuarios son asesores inmobiliarios');
    console.log('✅ Preguntas sobre negocio inmobiliario → Info Agent');
    console.log('✅ Ejemplos concretos de routing');
    console.log('✅ Por defecto usa Info Agent en caso de duda');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateOrchestrator()
  .then(() => {
    console.log('🎉 Actualización completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
