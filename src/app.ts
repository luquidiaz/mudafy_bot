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

        // Override root path to prevent crashes when QR doesn't exist
        adapterProvider.server.get('/', (req, res) => {
            const fs = require('fs');
            const path = require('path');
            const qrPath = path.join(process.cwd(), 'bot.qr.png');

            if (fs.existsSync(qrPath)) {
                const fileStream = fs.createReadStream(qrPath);
                res.writeHead(200, { 'Content-Type': 'image/png' });
                fileStream.pipe(res);
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta http-equiv="refresh" content="5">
                        <title>WhatsApp Bot - Waiting for QR</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a1a1a; color: #fff; }
                            .container { max-width: 600px; margin: 0 auto; }
                            h1 { color: #25D366; }
                            .spinner { border: 4px solid #333; border-top: 4px solid #25D366; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
                            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>🤖 WhatsApp Bot</h1>
                            <div class="spinner"></div>
                            <p>Waiting for WhatsApp to generate QR code...</p>
                            <p>This page will automatically refresh every 5 seconds.</p>
                            <p><small>Status: Bot is running and waiting for connection</small></p>
                        </div>
                    </body>
                    </html>
                `);
            }
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
