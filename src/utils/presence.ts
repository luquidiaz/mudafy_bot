/**
 * Muestra el indicador "escribiendo..." en WhatsApp
 */
export const typing = async (ctx: any, provider: any) => {
  try {
    await provider.vendor.sendPresenceUpdate('composing', ctx.from)
  } catch (error) {
    console.warn('Error mostrando typing indicator:', error)
  }
}

/**
 * Muestra el indicador "grabando..." en WhatsApp
 */
export const recording = async (ctx: any, provider: any) => {
  try {
    await provider.vendor.sendPresenceUpdate('recording', ctx.from)
  } catch (error) {
    console.warn('Error mostrando recording indicator:', error)
  }
}

/**
 * Detiene cualquier indicador de presencia
 */
export const stopTyping = async (ctx: any, provider: any) => {
  try {
    await provider.vendor.sendPresenceUpdate('paused', ctx.from)
  } catch (error) {
    console.warn('Error deteniendo presence:', error)
  }
}
