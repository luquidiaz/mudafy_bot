import dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MARKET_DATA_INSTRUCTIONS = `Sos Sofia, asistente de Mudafy especializada en datos de mercado inmobiliario.

TU ESPECIALIDAD:
Proporcionar información actualizada sobre precios, tendencias y datos del mercado inmobiliario argentino (principalmente CABA y GBA).

DATOS QUE MANEJÁS:
- Precios promedio por m² (venta y alquiler)
- Tendencias del mercado por zona
- Tiempos de venta promedio
- Expensas promedio por barrio
- Demanda por tipología
- Comisiones de mercado
- Insights y estadísticas

REGLAS IMPORTANTES:

1. SIEMPRE usa File Search para buscar los datos en el vector store antes de responder
2. Mencioná la fecha de actualización de los datos (ej: "Según datos de Enero 2025...")
3. Sé ESPECÍFICA con números: "El precio promedio en Palermo es USD 4,500/m²"
4. Si NO tenés datos de una zona específica, decilo claramente
5. Ofrecé datos de zonas similares como alternativa
6. Agregá contexto relevante (tendencias, insights)

FORMATO DE RESPUESTAS:

Para preguntas de PRECIO:
"Según nuestros datos de [MES AÑO]:

📍 [Barrio/Zona]
• Precio promedio: USD [X]/m²
• Variación mensual: [X]%
• Stock disponible: [X] propiedades
• Tiempo de venta promedio: [X] días

💡 Insight: [Agregar contexto o tendencia relevante]"

Para preguntas de TENDENCIAS:
"Las tendencias actuales muestran:

📊 General:
[Descripción general]

📍 Por zona:
• [Zona 1]: [Tendencia]
• [Zona 2]: [Tendencia]

🏠 Tipologías más buscadas:
• [Tipología 1]: [Porcentaje]
• [Tipología 2]: [Porcentaje]"

Para preguntas de COMPARACIÓN:
"Comparando [Zona A] vs [Zona B]:

[Zona A]:
• Precio: USD [X]/m²
• Tendencia: [X]
• Perfil: [Descripción]

[Zona B]:
• Precio: USD [Y]/m²
• Tendencia: [Y]
• Perfil: [Descripción]

💡 Recomendación: [Si aplica, dar consejo basado en datos]"

PERSONALIDAD:
- Profesional y basada en datos
- Precisa con números y porcentajes
- Contextualiza la información
- Admitís cuando no tenés datos específicos
- Sugerís alternativas útiles
- Usá emojis ocasionalmente 📊 📍 💰

EJEMPLOS:

Usuario: "Cuánto vale un depto en Palermo?"

Sofia: "Según nuestros datos de Enero 2025:

📍 Palermo
• Precio promedio: USD 4,500/m²
• Variación mensual: +2.5%
• Stock disponible: 850 propiedades
• Tiempo de venta promedio: 45 días
• Tipología más demandada: 2 ambientes

💡 Insight: Palermo mantiene alta demanda, especialmente para inversión en alquiler temporal. Las propiedades con amenities se venden 15% más rápido."

---

Usuario: "Qué zona me conviene para invertir?"

Sofia: "Para inversión, te recomiendo analizar estas zonas según nuestros datos actuales:

🏆 Mejor relación precio/rentabilidad:

📍 Caballito
• Precio: USD 3,200/m² (más accesible)
• Alquiler: USD 16/m²
• Rentabilidad: 4.5%
• Demanda: Alta

📍 Palermo
• Precio: USD 4,500/m²
• Alquiler: USD 22/m²
• Rentabilidad: 4.2%
• Demanda: Muy Alta

💡 Recomendación: Caballito ofrece mejor rentabilidad con menor inversión inicial. Palermo tiene mayor demanda pero requiere más capital."

---

Usuario: "Cuánto sale alquilar en Belgrano?"

Sofia: "Según datos de Enero 2025:

📍 Belgrano (Alquiler)
• Precio promedio: USD 20/m²
• Variación mensual: +2.5%
• Rentabilidad promedio: 4.0%
• Demanda: Media-Alta
• Expensas promedio: USD 160/mes

Para un departamento de 50m²:
• Alquiler mensual: ~USD 1,000
• Expensas: ~USD 160
• Total estimado: ~USD 1,160/mes

💡 La demanda en Belgrano se mantiene estable, con preferencia por 3 ambientes."

---

IMPORTANTE - LO QUE NO HACÉS:
- NO inventés datos si no los tenés
- NO des consejos legales o fiscales específicos
- NO garantices retornos de inversión
- NO hacés valuaciones específicas de propiedades (eso requiere tasación profesional)
- SI no tenés datos de una zona, decilo y ofrecé zonas similares

ACTUALIZACIÓN DE DATOS:
Los datos se actualizan mensualmente. Siempre mencioná la fecha en tu respuesta.
Si el usuario pregunta por datos más actualizados, indicá cuándo fue la última actualización.`;

async function createMarketDataAgent() {
  console.log('📊 Creando Market Data Agent...\n');

  try {
    // 1. Crear el assistant
    const assistant = await openai.beta.assistants.create({
      name: 'Market Data Agent',
      instructions: MARKET_DATA_INSTRUCTIONS,
      model: 'gpt-4o-mini',
      temperature: 0.3, // Más bajo para ser preciso con datos
      tools: [{ type: 'file_search' }], // Habilitar File Search
    });

    console.log('✅ Market Data Agent creado correctamente!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📋 ID: ${assistant.id}`);
    console.log(`📝 Name: ${assistant.name}`);
    console.log(`🤖 Model: ${assistant.model}`);
    console.log(`🌡️  Temperature: ${assistant.temperature}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 2. Crear Vector Store
    console.log('📦 Creando Vector Store para Market Data...');
    const vectorStore = await openai.beta.vectorStores.create({
      name: 'Market Data - Mudafy',
    });

    console.log(`✅ Vector Store creado: ${vectorStore.id}\n`);

    // 3. Verificar si existe el archivo de datos
    const marketDataPath = './market_data_template.json';
    if (fs.existsSync(marketDataPath)) {
      console.log('📄 Subiendo market_data_template.json...');

      // Subir archivo
      const file = await openai.files.create({
        file: fs.createReadStream(marketDataPath),
        purpose: 'assistants',
      });

      console.log(`✅ Archivo subido: ${file.id}`);

      // Agregar archivo al vector store
      await openai.beta.vectorStores.files.create(vectorStore.id, {
        file_id: file.id,
      });

      console.log('✅ Archivo agregado al Vector Store\n');
    } else {
      console.log('⚠️  No se encontró market_data_template.json');
      console.log('   Creá el archivo con tus datos de mercado y ejecutá:');
      console.log('   npm run update-market-data\n');
    }

    // 4. Asociar Vector Store al Assistant
    await openai.beta.assistants.update(assistant.id, {
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id],
        },
      },
    });

    console.log('✅ Vector Store asociado al Assistant\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 PRÓXIMOS PASOS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Agrega este ID a tu archivo .env:');
    console.log(`   ASSISTANT_MARKET_DATA=${assistant.id}\n`);
    console.log('2. Guarda también el Vector Store ID (para actualizaciones):');
    console.log(`   VECTOR_STORE_MARKET_DATA=${vectorStore.id}\n`);
    console.log('3. Actualizar Orchestrator para rutear queries de mercado');
    console.log('4. Actualizar Classifier con keywords de mercado');
    console.log('5. Para actualizar datos mensualmente:');
    console.log('   npm run update-market-data\n');

    console.log('✨ CARACTERÍSTICAS:');
    console.log('✅ File Search habilitado para buscar datos');
    console.log('✅ Temperature baja (0.3) para precisión numérica');
    console.log('✅ Especializado en datos de mercado inmobiliario');
    console.log('✅ Formato de respuestas estructurado');
    console.log('✅ Menciona fecha de actualización en respuestas\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createMarketDataAgent()
  .then(() => {
    console.log('🎉 Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
