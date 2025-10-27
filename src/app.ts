import "dotenv/config"
import { createBot, createProvider, createFlow, addKeyword, EVENTS } from '@builderbot/bot'
import { MemoryDB } from '@builderbot/bot'
import { BaileysProvider } from '@builderbot/provider-baileys'
import { toAsk, httpInject } from "@builderbot-plugins/openai-assistants"
import { typing } from "./utils/presence"

/** Puerto en el que se ejecutará el servidor */
const PORT = process.env.PORT ?? 3008
/** ID del asistente de OpenAI */
const ASSISTANT_ID = process.env.ASSISTANT_ID ?? ''
const userQueues = new Map();
const userLocks = new Map(); // New lock mechanism

/**
 * Function to process the user's message by sending it to the OpenAI API
 * and sending the response back to the user.
 */
const processUserMessage = async (ctx, { flowDynamic, state, provider }) => {
    await typing(ctx, provider);
    const response = await toAsk(ASSISTANT_ID, ctx.body, state);

    // Split the response into chunks and send them sequentially
    const chunks = response.split(/\n\n+/);
    for (const chunk of chunks) {
        const cleanedChunk = chunk.trim().replace(/【.*?】[ ] /g, "");
        await flowDynamic([{ body: cleanedChunk }]);
    }
};

/**
 * Function to handle the queue for each user.
 */
const handleQueue = async (userId) => {
    const queue = userQueues.get(userId);
    
    if (userLocks.get(userId)) {
        return; // If locked, skip processing
    }

    while (queue.length > 0) {
        userLocks.set(userId, true); // Lock the queue
        const { ctx, flowDynamic, state, provider } = queue.shift();
        try {
            await processUserMessage(ctx, { flowDynamic, state, provider });
        } catch (error) {
            console.error(`Error processing message for user ${userId}:`, error);
        } finally {
            userLocks.set(userId, false); // Release the lock
        }
    }

    userLocks.delete(userId); // Remove the lock once all messages are processed
    userQueues.delete(userId); // Remove the queue once all messages are processed
};

/**
 * Flujo de bienvenida que maneja las respuestas del asistente de IA
 * @type {import('@builderbot/bot').Flow<BaileysProvider, MemoryDB>}
 */
const welcomeFlow = addKeyword<BaileysProvider, MemoryDB>(EVENTS.WELCOME)
    .addAction(async (ctx, { flowDynamic, state, provider }) => {
        const userId = ctx.from; // Use the user's ID to create a unique queue for each user

        if (!userQueues.has(userId)) {
            userQueues.set(userId, []);
        }

        const queue = userQueues.get(userId);
        queue.push({ ctx, flowDynamic, state, provider });

        // If this is the only message in the queue, process it immediately
        if (!userLocks.get(userId) && queue.length === 1) {
            await handleQueue(userId);
        }
    });

/**
 * Función principal que configura y inicia el bot
 * @async
 * @returns {Promise<void>}
 */
const main = async () => {
    try {
        console.log('🚀 Starting bot initialization...');
        console.log('📋 Environment variables:');
        console.log('   - PORT:', PORT);
        console.log('   - ASSISTANT_ID:', ASSISTANT_ID ? '✓ Set' : '✗ Missing');

        /**
         * Flujo del bot
         * @type {import('@builderbot/bot').Flow<BaileysProvider, MemoryDB>}
         */
        const adapterFlow = createFlow([welcomeFlow]);
        console.log('✓ Flow created');

        /**
         * Proveedor de servicios de mensajería
         * @type {BaileysProvider}
         */
        const adapterProvider = createProvider(BaileysProvider, {
            groupsIgnore: true,
            readStatus: false,
            usePairingCode: false,
            phoneNumber: null
        });
        console.log('✓ Provider created');

        /**
         * Base de datos en memoria para el bot
         * @type {MemoryDB}
         */
        const adapterDB = new MemoryDB();
        console.log('✓ Database created');

        // Add health check endpoint BEFORE creating bot for Railway
        adapterProvider.server.get('/health', (req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                timestamp: new Date().toISOString(),
                message: 'Bot is running'
            }));
        });
        console.log('✓ Health check endpoint registered');

        /**
         * Configuración y creación del bot
         * @type {import('@builderbot/bot').Bot<BaileysProvider, MemoryDB>}
         */
        console.log('🤖 Creating bot...');
        const { httpServer } = await createBot({
            flow: adapterFlow,
            provider: adapterProvider,
            database: adapterDB,
        });
        console.log('✓ Bot created successfully');

        httpInject(adapterProvider.server);
        httpServer(+PORT);

        console.log(`✅ Bot is ready and running on port ${PORT}!`);
        console.log('📱 Waiting for QR code or connection...');
    } catch (error) {
        console.error('❌ Error starting bot:', error);
        throw error;
    }
};

main().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
});
