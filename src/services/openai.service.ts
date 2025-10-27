import OpenAI from 'openai'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

if (!OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY no configurada. El bot no podrá usar IA.')
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
})

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Servicio para interactuar con OpenAI GPT-4
 */
export class OpenAIService {
  private systemPrompt: string

  constructor(systemPrompt?: string) {
    this.systemPrompt = systemPrompt || this.getDefaultSystemPrompt()
  }

  private getDefaultSystemPrompt(): string {
    return `Eres Mudafy, un asistente virtual inteligente de WhatsApp.

Características de tu personalidad:
- Amigable, cercano y profesional
- Respondes en español de forma natural
- Eres conciso pero completo en tus respuestas
- Ayudas a los usuarios con cualquier consulta
- Si no sabes algo, lo admites honestamente

Capacidades:
- Conversación natural sobre cualquier tema
- Responder preguntas y ayudar con tareas
- Recordar el contexto de la conversación actual

Limitaciones:
- No tienes acceso a internet en tiempo real
- No puedes hacer llamadas o enviar mensajes a otros
- Tu conocimiento tiene fecha de corte en enero 2025

Responde de manera clara, útil y amigable.`
  }

  /**
   * Envía mensajes a GPT-4 y obtiene una respuesta
   */
  async chat(messages: Message[]): Promise<string> {
    if (!OPENAI_API_KEY) {
      return 'Lo siento, el servicio de IA no está configurado correctamente. Por favor contacta al administrador.'
    }

    try {
      // Construir mensajes con system prompt
      const fullMessages: Message[] = [
        { role: 'system', content: this.systemPrompt },
        ...messages,
      ]

      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 1000,
      })

      const response = completion.choices[0]?.message?.content || 'No recibí respuesta del modelo.'
      return response.trim()
    } catch (error) {
      console.error('Error en OpenAI Service:', error)

      if (error instanceof Error) {
        if (error.message.includes('rate_limit')) {
          return 'Lo siento, he alcanzado el límite de uso. Por favor intenta en unos minutos.'
        }
        if (error.message.includes('invalid_api_key')) {
          return 'Error de configuración. Por favor contacta al administrador.'
        }
      }

      return 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor intenta nuevamente.'
    }
  }

  /**
   * Actualiza el system prompt
   */
  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt
  }
}

export const openAIService = new OpenAIService()
