import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function checkOrchestrator() {
  const assistantId = process.env.ASSISTANT_ORCHESTRATOR;

  if (!assistantId) {
    console.error('❌ ASSISTANT_ORCHESTRATOR no encontrado en .env');
    return;
  }

  console.log(`🔍 Verificando Orchestrator: ${assistantId}\n`);

  try {
    const assistant = await openai.beta.assistants.retrieve(assistantId);

    console.log('📋 CONFIGURACIÓN ACTUAL DEL ORCHESTRATOR:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Nombre: ${assistant.name}`);
    console.log(`Model: ${assistant.model}`);
    console.log(`\nInstrucciones:\n`);
    console.log(assistant.instructions);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkOrchestrator()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
