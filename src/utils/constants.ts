import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

export const PORT = process.env.PORT || '3008'
export const BOT_NAME = process.env.BOT_NAME || 'Mudafy'
