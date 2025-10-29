# MUDAFY BOT - WhatsApp Chatbot

## Estado del Proyecto

**Versión actual:** 2.0.0 - Multi-Agent con OpenAI
**Última actualización:** 2025-10-29
**Estado:** ✅ Funcionando localmente con arquitectura multi-agent

---

## Objetivo del Proyecto

Chatbot inteligente de WhatsApp para Mudafy con arquitectura multi-agent.

**Fase actual (v2.0):**
- ✅ Bot con OpenAI Assistants API
- ✅ Arquitectura multi-agent (Orchestrator + 2 agents especializados)
- ✅ Info Agent con File Search y Vector Store
- ✅ Conversation Agent para chat general
- ✅ Typing indicators ("escribiendo...")
- ✅ Memoria conversacional con threads
- ✅ Comandos: /ayuda, /reset

**Roadmap futuro:**
- [ ] Deployment a Railway con multi-agent
- [ ] Más agentes especializados (ventas, soporte, etc.)
- [ ] Generación de imágenes con DALL-E
- [ ] Sistema de permisos por usuario
- [ ] Analytics y métricas de conversaciones

---

## Stack Tecnológico

- **Runtime:** Node.js >= 20
- **Lenguaje:** TypeScript
- **Framework Bot:** BuilderBot v1.3.2+
- **Provider WhatsApp:** @builderbot/provider-baileys v1.3.2+
- **Module System:** ES Modules
- **Bundler:** Rollup
- **Deployment:** Railway

---

## Estructura del Proyecto Actual

```
mudafy_bot/
├── src/
│   ├── app.ts              # Entry point principal
│   ├── flows/              # (vacío - futuro)
│   ├── services/           # (vacío - futuro)
│   └── utils/
│       └── constants.ts    # Configuración
├── dist/                   # Código compilado
├── package.json
├── tsconfig.json
├── rollup.config.js
├── .env.example
├── .env                    # Variables de entorno (gitignored)
├── CLAUDE.md              # Este archivo
└── README.md              # Guía rápida
```

---

## Instalación y Setup

### 1. Clonar el repositorio

```bash
git clone https://github.com/luquidiaz/mudafy_bot.git
cd mudafy_bot
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env`:
```env
PORT=3008
BOT_NAME=Mudafy
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

### 5. Conectar WhatsApp

1. Abre http://localhost:3008 en tu navegador
2. Escanea el QR code con WhatsApp (Configuración → Dispositivos vinculados)
3. ¡Listo! El bot está conectado

---

## Dependencias

### Production
```json
{
  "@builderbot/bot": "^1.3.2",
  "@builderbot/provider-baileys": "^1.3.2"
}
```

### Development
```json
{
  "@types/node": "^20.11.30",
  "typescript": "^5.4.3",
  "tsx": "^4.7.1",
  "nodemon": "^3.1.0",
  "rollup": "^4.10.0",
  "rollup-plugin-typescript2": "^0.36.0",
  "@typescript-eslint/eslint-plugin": "^7.2.0",
  "@typescript-eslint/parser": "^7.4.0",
  "eslint": "^8.52.0",
  "eslint-plugin-builderbot": "latest"
}
```

---

## Código Actual (app.ts)

```typescript
import { createBot, createProvider, createFlow, addKeyword } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { MemoryDB as Database } from '@builderbot/bot'

const PORT = process.env.PORT ?? 3008

const welcomeFlow = addKeyword<Provider, Database>(['hi', 'hello', 'hola'])
  .addAnswer('🙌 Hello welcome to this *Chatbot*')

const main = async () => {
  console.log('🤖 Iniciando Mudafy Bot...')

  const adapterFlow = createFlow([welcomeFlow])
  const adapterProvider = createProvider(Provider)
  const adapterDB = new Database()

  console.log('📡 Conectando con WhatsApp...')

  const { httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  })

  httpServer(+PORT)

  console.log('✅ Bot iniciado correctamente')
  console.log('🌐 Abre http://localhost:' + PORT + ' para ver el QR')
  console.log('⏳ Esperando conexión con WhatsApp...')

  process.on('SIGINT', () => {
    console.log('👋 Cerrando bot...')
    process.exit(0)
  })
}

main().catch(console.error)
```

---

## Scripts NPM

```bash
# Desarrollo (con linting y hot-reload)
npm run dev

# Build para producción
npm run build

# Ejecutar en producción
npm start

# Linting
npm run lint
npm run lint:fix
```

---

## Deployment en Railway

### Configuración Actual

Railway detecta automáticamente el proyecto Node.js y ejecuta:

1. `npm install` - Instalar dependencias
2. `npm run build` - Compilar TypeScript con Rollup
3. `npm start` - Ejecutar `node ./dist/app.js`

### Variables de Entorno en Railway

Solo necesitas configurar:
```
PORT=3008
```

Railway asigna automáticamente un puerto, pero el bot usa el valor por defecto si no se especifica.

### URL del Bot

Railway asigna una URL pública como:
```
https://mudafy-bot-production.up.railway.app
```

Esta URL muestra el QR code para vincular WhatsApp.

### Persistencia de Sesión

**IMPORTANTE:** Railway puede reiniciar el contenedor, lo que borrará la sesión de WhatsApp.

**Soluciones futuras:**
- Usar base de datos externa (MongoDB, PostgreSQL)
- Montar un volumen persistente en Railway
- Backup periódico de archivos `.data.json`

---

## Problemas Comunes y Soluciones

### ❌ Error: ENOENT bot.qr.png

**Problema:** BuilderBot intenta leer el archivo QR antes de que Baileys lo genere.

**Solución:** Asegurarse de usar BuilderBot v1.3.2 o superior:
```bash
npm install @builderbot/bot@latest @builderbot/provider-baileys@latest
```

**Nota:** Las versiones 1.2.x tienen problemas con la generación del QR.

### ❌ QR code no aparece

**Problema:** El QR no se muestra en http://localhost:3008

**Soluciones:**
1. Verificar que BuilderBot esté en v1.3.2+
2. Esperar unos segundos después de iniciar el bot
3. Refrescar el navegador
4. Revisar logs en la consola

### ❌ Bot se desconecta constantemente

**Problema:** WhatsApp desvincula el bot frecuentemente.

**Causas comunes:**
- Sesión corrupta
- Múltiples instancias del bot corriendo
- Archivos `.data.json` dañados

**Solución:**
```bash
# Detener el bot
# Borrar archivos de sesión
rm -rf *.data.json bot.qr.png bot_sessions/
# Reiniciar y escanear QR nuevamente
npm run dev
```

### ❌ Railway build fails

**Problema:** El deployment en Railway falla.

**Verificar:**
1. Que `package.json` tenga el script `"build": "npx rollup -c"`
2. Que `package.json` tenga el script `"start": "node ./dist/app.js"`
3. Que `rollup.config.js` esté correctamente configurado
4. Que no haya archivos `.env` commiteados (deben estar en `.gitignore`)

---

## Versiones Importantes

### ⚠️ BuilderBot 1.2.x vs 1.3.x

**Problema conocido:** La versión 1.2.9 tiene problemas generando el archivo `bot.qr.png`.

**Solución:** Siempre usar 1.3.2 o superior:

```json
{
  "dependencies": {
    "@builderbot/bot": "^1.3.2",
    "@builderbot/provider-baileys": "^1.3.2"
  }
}
```

El símbolo `^` asegura que npm instale la última versión compatible.

---

## Arquitectura del Bot (Versión Actual)

### Flujo Simple

```
Usuario envía mensaje
    ↓
Baileys Provider recibe mensaje
    ↓
BuilderBot procesa con Flow
    ↓
welcomeFlow verifica keywords: ['hi', 'hello', 'hola']
    ↓
Si coincide → Envía respuesta "🙌 Hello welcome to this *Chatbot*"
Si no coincide → No hace nada
```

### Componentes

1. **Provider (Baileys):** Conexión con WhatsApp Web
2. **Flow:** Define las respuestas según keywords
3. **Database (Memory):** Almacena estado en memoria (se pierde al reiniciar)
4. **httpServer:** Sirve el QR code en puerto 3008

---

## Roadmap - Próximas Funcionalidades

### Fase 2: Integración con IA

- [ ] Servicio OpenAI (GPT-4)
- [ ] Memoria conversacional por usuario
- [ ] System prompt configurable
- [ ] Rate limiting por usuario

### Fase 3: Comandos Especiales

- [ ] `/ayuda` - Lista de comandos
- [ ] `/reset` - Reiniciar conversación
- [ ] `/imagen [prompt]` - Generar imagen con DALL-E
- [ ] `/off` y `/on` - Control de bot (solo admins)

### Fase 4: Persistencia

- [ ] Base de datos MongoDB/PostgreSQL
- [ ] Backup automático de sesión WhatsApp
- [ ] Historial de conversaciones persistente
- [ ] Logs estructurados

### Fase 5: Features Avanzadas

- [ ] Análisis de imágenes (GPT-4 Vision)
- [ ] Text-to-Speech
- [ ] RAG con base de conocimiento
- [ ] Multi-agente
- [ ] Dashboard web de estadísticas

---

## Recursos y Referencias

### Documentación Oficial

- [BuilderBot Docs](https://builderbot.app/docs)
- [Baileys Provider](https://builderbot.app/en/providers/baileys)
- [Railway Docs](https://docs.railway.app/)

### Repositorios

- **Este proyecto:** https://github.com/luquidiaz/mudafy_bot
- **BuilderBot:** https://github.com/codigoencasa/bot-plugins

### Comunidad

- [BuilderBot Discord](https://link.codigoencasa.com/DISCORD)

---

## Notas de Desarrollo

### Lecciones Aprendidas

1. **Versiones importan:** BuilderBot 1.2.x tiene bugs con QR. Siempre usar 1.3.2+
2. **Railway no necesita railway.toml:** Los defaults funcionan perfectamente
3. **Sesión es efímera en Railway:** Planear persistencia para producción seria
4. **httpServer es suficiente:** No necesitas servidor HTTP personalizado para QR

### Configuración de Baileys

Por ahora usamos la configuración más simple:
```typescript
const adapterProvider = createProvider(Provider)
```

**Opciones futuras:**
```typescript
const adapterProvider = createProvider(Provider, {
  usePairingCode: true,        // Usar código en vez de QR
  phoneNumber: '+549111234567', // Para pairing code
  experimentalStore: true,      // Reduce uso de RAM
  timeRelease: 10800000,        // Limpieza cada 3 horas
  groupsIgnore: true,           // Ignorar grupos
  readStatus: false             // No enviar "leído"
})
```

### TypeScript Configuration

El proyecto usa ES2022 con ES Modules:
```json
{
  "target": "ES2022",
  "module": "ES2022",
  "moduleResolution": "node",
  "type": "module"
}
```

---

## Comandos Útiles

```bash
# Ver logs del bot en Railway
railway logs

# Ver estado de git
git status

# Limpiar sesión de WhatsApp local
rm -rf *.data.json bot.qr.png bot_sessions/

# Actualizar BuilderBot a última versión
npm install @builderbot/bot@latest @builderbot/provider-baileys@latest

# Ver versiones instaladas
npm list @builderbot/bot @builderbot/provider-baileys

# Reiniciar nodemon manualmente
rs
```

---

## Costos y Límites

### Railway (Free Tier)

- $5 USD de crédito mensual gratis
- Suficiente para ~500 horas de runtime (todo el mes)
- El bot usa muy pocos recursos sin IA
- Se puede usar todo el mes gratis

### Próximos costos (cuando se agregue IA)

- **OpenAI GPT-4:** ~$0.03 por 1K tokens input, ~$0.06 por 1K output
- **DALL-E 3:** ~$0.04 por imagen (1024x1024 standard)

**Estimación:** Con uso moderado (100 mensajes/día), ~$5-10 USD/mes en OpenAI.

---

## Seguridad

### Archivos Sensibles (.gitignore)

```
.env
*.data.json
bot.qr.png
bot_sessions/
```

**NUNCA commitear:**
- API keys de OpenAI
- Archivos de sesión de WhatsApp
- Variables de entorno con datos sensibles

### Validación de Admins (futuro)

```typescript
const ADMIN_NUMBERS = process.env.BOT_ADMIN_NUMBERS?.split(',') || []

function isAdmin(phoneNumber: string): boolean {
  return ADMIN_NUMBERS.includes(phoneNumber)
}
```

---

## Troubleshooting Avanzado

### Ver archivos de sesión

```bash
ls -la *.data.json bot_sessions/
```

### Logs detallados de Baileys

Revisar el archivo `baileys.log` si existe.

### Puerto ocupado

Si el puerto 3008 está en uso:
```bash
# Ver qué proceso usa el puerto
lsof -i :3008

# O cambiar el puerto en .env
PORT=3009
```

---

## Contribuir

Este es un proyecto personal, pero si querés sugerir mejoras:

1. Fork el repo
2. Crea una branch (`git checkout -b feature/nueva-feature`)
3. Commit cambios (`git commit -m 'Add nueva feature'`)
4. Push a la branch (`git push origin feature/nueva-feature`)
5. Abre un Pull Request

---

## Licencia

MIT

---

## Contacto

**Desarrollador:** Lucas Diaz
**Repo:** https://github.com/luquidiaz/mudafy_bot

---

**🤖 Este proyecto fue desarrollado con la ayuda de Claude Code**

¡Feliz coding! 🚀
