import dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VECTOR_STORE_ID = process.env.VECTOR_STORE_MARKET_DATA || '';
const ASSISTANT_ID = process.env.ASSISTANT_MARKET_DATA || '';

interface UpdateOptions {
  filePath?: string;
  deleteOld?: boolean;
}

async function updateMarketData(options: UpdateOptions = {}) {
  const {
    filePath = './market_data.json',
    deleteOld = true
  } = options;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ACTUALIZANDO MARKET DATA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Validaciones
  if (!VECTOR_STORE_ID) {
    console.error('❌ VECTOR_STORE_MARKET_DATA no encontrado en .env');
    console.log('💡 Ejecutá primero: npm run create-market-data-agent');
    return;
  }

  if (!ASSISTANT_ID) {
    console.error('❌ ASSISTANT_MARKET_DATA no encontrado en .env');
    console.log('💡 Ejecutá primero: npm run create-market-data-agent');
    return;
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ No se encontró el archivo: ${filePath}`);
    console.log('💡 Creá un archivo JSON con los datos de mercado actualizados');
    return;
  }

  try {
    // 1. Validar JSON
    console.log('1️⃣  Validando archivo JSON...');
    const marketData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (!marketData.metadata || !marketData.metadata.version) {
      console.error('❌ El JSON debe tener metadata.version');
      return;
    }

    const version = marketData.metadata.version;
    console.log(`   ✅ Archivo válido - Versión: ${version}\n`);

    // 2. Listar archivos actuales en el Vector Store
    console.log('2️⃣  Obteniendo archivos actuales del Vector Store...');
    const currentFiles = await openai.beta.vectorStores.files.list(VECTOR_STORE_ID);
    console.log(`   📄 Archivos actuales: ${currentFiles.data.length}\n`);

    // 3. Subir nuevo archivo
    console.log('3️⃣  Subiendo nuevo archivo...');
    const file = await openai.files.create({
      file: fs.createReadStream(filePath),
      purpose: 'assistants',
    });
    console.log(`   ✅ Archivo subido: ${file.id}`);
    console.log(`   📝 Nombre: ${path.basename(filePath)}\n`);

    // 4. Agregar al Vector Store
    console.log('4️⃣  Agregando archivo al Vector Store...');
    await openai.beta.vectorStores.files.create(VECTOR_STORE_ID, {
      file_id: file.id,
    });
    console.log('   ✅ Archivo agregado al Vector Store\n');

    // 5. Eliminar archivos antiguos (opcional)
    if (deleteOld && currentFiles.data.length > 0) {
      console.log('5️⃣  Eliminando archivos antiguos...');

      for (const oldFile of currentFiles.data) {
        try {
          await openai.beta.vectorStores.files.del(VECTOR_STORE_ID, oldFile.id);
          console.log(`   🗑️  Eliminado: ${oldFile.id}`);
        } catch (error) {
          console.log(`   ⚠️  No se pudo eliminar: ${oldFile.id}`);
        }
      }
      console.log('   ✅ Limpieza completada\n');
    } else {
      console.log('5️⃣  Manteniendo archivos antiguos (deleteOld=false)\n');
    }

    // 6. Verificar estado del Vector Store
    console.log('6️⃣  Verificando Vector Store...');
    const vectorStore = await openai.beta.vectorStores.retrieve(VECTOR_STORE_ID);
    console.log(`   📦 Vector Store: ${vectorStore.name}`);
    console.log(`   📄 Total archivos: ${vectorStore.file_counts.total}`);
    console.log(`   ✅ En proceso: ${vectorStore.file_counts.in_progress}`);
    console.log(`   ✅ Completados: ${vectorStore.file_counts.completed}\n`);

    // 7. Actualizar metadata del Assistant (opcional)
    console.log('7️⃣  Actualizando metadata del Assistant...');
    await openai.beta.assistants.update(ASSISTANT_ID, {
      metadata: {
        last_market_data_update: new Date().toISOString(),
        market_data_version: version,
      },
    });
    console.log('   ✅ Metadata actualizada\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 ACTUALIZACIÓN COMPLETADA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📅 Versión: ${version}`);
    console.log(`🆔 Archivo: ${file.id}`);
    console.log(`📦 Vector Store: ${VECTOR_STORE_ID}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('💡 PRÓXIMOS PASOS:');
    console.log('1. Espera ~1-2 minutos para que el Vector Store indexe');
    console.log('2. Prueba con una pregunta de mercado al bot');
    console.log('3. Verifica que mencione la nueva versión en la respuesta\n');

    // 8. Hacer un backup del archivo subido
    const backupDir = './backups/market_data';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(
      backupDir,
      `market_data_${version}_${new Date().toISOString().split('T')[0]}.json`
    );
    fs.copyFileSync(filePath, backupPath);
    console.log(`💾 Backup guardado: ${backupPath}\n`);

  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
    if (error instanceof Error) {
      console.error('   Mensaje:', error.message);
    }
    process.exit(1);
  }
}

// CLI
const args = process.argv.slice(2);
const filePath = args[0] || './market_data.json';
const deleteOld = !args.includes('--keep-old');

updateMarketData({ filePath, deleteOld })
  .then(() => {
    console.log('✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
