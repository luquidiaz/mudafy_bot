# Mudafy Bot - WhatsApp AI Assistant

Bot inteligente de WhatsApp construido con BuilderBot, Baileys y OpenAI.

## Requisitos Previos

- Node.js >= 20.0.0
- Cuenta de OpenAI con API Key
- npm o pnpm

## Instalación

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Editar .env y agregar tu OPENAI_API_KEY
```

## Configuración

Edita el archivo `.env` con tus credenciales:

```env
PORT=3008
OPENAI_API_KEY=sk-tu-api-key-aqui
OPENAI_MODEL=gpt-4-turbo-preview
BOT_NAME=Mudafy
```

## Desarrollo

```bash
# Modo desarrollo con hot-reload
npm run dev
```

## Producción

```bash
# Build del proyecto
npm run build

# Ejecutar en producción
npm start
```

## Características

- Conversación natural con OpenAI GPT-4
- Generación de imágenes con DALL-E
- Memoria conversacional por usuario
- Comandos especiales (/ayuda, /reset, /imagen)
- Sistema de colas para manejo de concurrencia
- Indicadores de presencia (escribiendo, grabando)
- Control de bot por usuario y global

## Comandos Disponibles

- `/ayuda` - Muestra lista de comandos
- `/reset` - Reinicia la conversación
- `/imagen [descripción]` - Genera una imagen con DALL-E
- `/off` - Desactiva el bot (solo admins)
- `/on` - Activa el bot (solo admins)

## Estructura del Proyecto

```
mudafy_bot/
├── src/
│   ├── app.ts              # Entry point
│   ├── flows/              # Flujos conversacionales
│   ├── services/           # Servicios (OpenAI, Memory)
│   └── utils/              # Utilidades
├── dist/                   # Build output
└── CLAUDE.md              # Documentación detallada
```

## Documentación

Ver [CLAUDE.md](CLAUDE.md) para documentación completa del proyecto.

## Licencia

MIT
