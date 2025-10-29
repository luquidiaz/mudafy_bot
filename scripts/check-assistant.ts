import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function checkAssistant() {
  const assistantId = process.env.ASSISTANT_INFO;

  if (!assistantId) {
    console.error('❌ ASSISTANT_INFO no encontrado en .env');
    return;
  }

  console.log(`🔍 Verificando assistant: ${assistantId}\n`);

  try {
    const assistant = await openai.beta.assistants.retrieve(assistantId);

    console.log('📋 CONFIGURACIÓN ACTUAL:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Nombre: ${assistant.name}`);
    console.log(`Model: ${assistant.model}`);
    console.log(`\nTools:`);
    console.log(JSON.stringify(assistant.tools, null, 2));
    console.log(`\nTool Resources:`);
    console.log(JSON.stringify(assistant.tool_resources, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verificar si tiene vector store configurado
    if (assistant.tool_resources?.file_search?.vector_store_ids?.length > 0) {
      console.log('✅ Vector Store configurado correctamente');
      console.log(`Vector Store ID: ${assistant.tool_resources.file_search.vector_store_ids[0]}`);
    } else {
      console.log('⚠️  Vector Store NO configurado en tool_resources');
      console.log('Esto explica por qué no usa File Search\n');

      // Sugerir fix
      console.log('💡 SOLUCIÓN: Necesitas asociar el Vector Store al assistant');
      console.log('Puedes hacerlo con el siguiente código:\n');
      console.log(`await openai.beta.assistants.update('${assistantId}', {
  tool_resources: {
    file_search: {
      vector_store_ids: ['vs_68ff6d01cd3481918074c1615fdef9f3']
    }
  }
});\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAssistant();
