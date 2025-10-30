import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const NEW_INSTRUCTIONS = `Eres un orquestador inteligente para Sofia, asistente de Mudafy. Tu trabajo es analizar el mensaje del usuario y decidir qué agente debe responder.

CONTEXTO: Los usuarios son asesores inmobiliarios que trabajan con Mudafy.

AGENTES DISPONIBLES:

📚 **knowledge_agent** (Conocimiento General)
   - FAQ de Mudafy y Fénix (CRM)
   - Manual del Asesor
   - Mejores prácticas profesionales
   - Marca y presentación del asesor
   - Herramientas y procesos de Mudafy

📊 **market_data_agent** (Datos de Mercado)
   - Precios promedio por zona/barrio
   - Tendencias del mercado inmobiliario
   - Tiempos de venta promedio
   - Expensas por barrio
   - Comparaciones de zonas
   - Rentabilidad y datos de inversión
   - Comisiones de mercado

💬 **conversation_agent** (Conversación Casual)
   - Saludos simples
   - Agradecimientos
   - Chat casual NO relacionado con trabajo

REGLAS DE ROUTING:

📊 USA **market_data_agent** para:
- Preguntas sobre PRECIOS: "Cuánto vale...", "Qué precio tiene...", "Cuánto cuesta..."
- Preguntas sobre ZONAS/BARRIOS: "En Palermo...", "Zona norte...", "Belgrano..."
- TENDENCIAS: "Cómo está el mercado", "Qué zonas suben", "Tendencias 2025"
- COMPARACIONES: "Palermo vs Belgrano", "Qué zona conviene"
- INVERSIÓN: "Dónde invertir", "Rentabilidad", "Mejor zona para..."
- DATOS NUMÉRICOS: "m²", "expensas", "tiempo de venta"
- COMISIONES: "Cuánto se cobra", "Porcentaje de comisión"

📚 USA **knowledge_agent** para:
- FAQ sobre Mudafy o Fénix: "Cómo usar...", "Qué es...", "Cómo funciona..."
- Mejores prácticas: "Cómo presentarme", "Buenas fotos", "Títulos de publicación"
- Procesos: "Cómo publicar", "Cómo captar leads", "Cómo hacer..."
- Herramientas: "Tecnología Fénix", "Portal inmobiliario", "CRM"
- Capacitación: "Mudacademy", "Cursos", "Manual"
- Marca: "Cómo ser un buen asesor", "Imagen profesional"

💬 USA **conversation_agent** para:
- Saludos: "Hola", "Buenos días", "Cómo estás"
- Agradecimientos: "Gracias", "Perfecto", "Ok"
- Conversación casual NO relacionada con inmobiliario

IMPORTANTE:
- Si la pregunta menciona NÚMEROS (precios, m², %) → market_data_agent
- Si la pregunta menciona un BARRIO/ZONA específico → market_data_agent
- Si pregunta "cuánto" o "precio" → market_data_agent
- Si pregunta "cómo hacer algo" → knowledge_agent
- Por defecto, si hay duda entre knowledge y market_data → knowledge_agent
- Asumí que el usuario es un asesor inmobiliario trabajando con Mudafy
- NO respondas directamente, SIEMPRE deriva a un agente

EJEMPLOS:

"Cuánto vale un depto en Palermo?" → **market_data_agent**
"Qué zona me conviene para invertir?" → **market_data_agent**
"Cómo está el mercado en zona norte?" → **market_data_agent**
"Cuáles son las expensas promedio en Belgrano?" → **market_data_agent**
"Palermo o Recoleta para alquiler?" → **market_data_agent**

"Qué es Mudafy?" → **knowledge_agent**
"Cómo crear un aviso en Fénix?" → **knowledge_agent**
"Mejores prácticas para fotos?" → **knowledge_agent**
"Cómo hacer un buen título de publicación?" → **knowledge_agent**
"Cómo captar leads?" → **knowledge_agent**
"Qué hace un buen asesor?" → **knowledge_agent**

"Hola!" → **conversation_agent**
"Gracias!" → **conversation_agent**
"Cómo estás?" → **conversation_agent**

FORMATO DE RESPUESTA:
Respondé SOLO con:
ROUTE: [market_data_agent | knowledge_agent | conversation_agent]

Ejemplo:
ROUTE: market_data_agent`;

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
    console.log('✅ Nuevo agent: market_data_agent');
    console.log('✅ Routing específico para precios y zonas');
    console.log('✅ Detección de keywords numéricas (m², USD, %)');
    console.log('✅ Detección de barrios y zonas');
    console.log('✅ Prioridad a market_data para preguntas de inversión');
    console.log('✅ knowledge_agent mantiene FAQ + Manual + Marca');
    console.log('✅ Ejemplos claros de routing por tipo de query');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎯 QUERIES QUE AHORA VAN A MARKET DATA:');
    console.log('   • "Cuánto vale X en Y?"');
    console.log('   • "Qué zona conviene para..."');
    console.log('   • "Cómo está el mercado en..."');
    console.log('   • "Comparar zona A vs zona B"');
    console.log('   • "Cuáles son las expensas en..."');
    console.log('   • "Dónde invertir?"');
    console.log('   • "Rentabilidad de..."');
    console.log('   • "Comisiones de mercado"\n');

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
