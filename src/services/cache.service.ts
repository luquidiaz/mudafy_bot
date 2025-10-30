/**
 * Sistema de caché profesional con múltiples adaptadores
 *
 * Soporta:
 * - Memory cache (desarrollo)
 * - Redis (producción)
 * - File-based (fallback)
 */

import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

// ============================================================================
// INTERFACES
// ============================================================================

export interface CacheEntry<T = any> {
  value: T
  timestamp: number
  hits: number
  tags?: string[]
}

export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  totalEntries: number
  memoryUsage?: number
}

export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  has(key: string): Promise<boolean>
  getStats(): Promise<CacheStats>
}

// ============================================================================
// MEMORY CACHE ADAPTER (Desarrollo y fallback)
// ============================================================================

export class MemoryCacheAdapter implements CacheAdapter {
  private cache = new Map<string, CacheEntry>()
  private defaultTTL: number
  private stats = { hits: 0, misses: 0 }

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    this.defaultTTL = defaultTTL

    // Limpieza periódica cada 1 minuto
    setInterval(() => this.cleanup(), 60 * 1000)
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // Verificar si expiró
    const now = Date.now()
    if (now - entry.timestamp > this.defaultTTL) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    // Cache hit!
    entry.hits++
    this.stats.hits++
    return entry.value as T
  }

  async set<T>(key: string, value: T, _ttl?: number): Promise<void> {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
    })
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0 }
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key)
  }

  async getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      totalEntries: this.cache.size,
      memoryUsage: this.estimateMemoryUsage(),
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const expired: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.defaultTTL) {
        expired.push(key)
      }
    }

    expired.forEach(key => this.cache.delete(key))

    if (expired.length > 0) {
      console.log(`🧹 Cache cleanup: removed ${expired.length} expired entries`)
    }
  }

  private estimateMemoryUsage(): number {
    let bytes = 0
    for (const [key, entry] of this.cache.entries()) {
      bytes += key.length * 2 // UTF-16
      bytes += JSON.stringify(entry.value).length * 2
    }
    return bytes
  }
}

// ============================================================================
// FILE CACHE ADAPTER (Fallback para persistencia simple)
// ============================================================================

export class FileCacheAdapter implements CacheAdapter {
  private cacheDir: string
  private defaultTTL: number
  private stats = { hits: 0, misses: 0 }

  constructor(cacheDir: string = './cache', defaultTTL: number = 5 * 60 * 1000) {
    this.cacheDir = cacheDir
    this.defaultTTL = defaultTTL
    this.ensureCacheDir()
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true })
    } catch (error) {
      console.error('❌ Error creating cache directory:', error)
    }
  }

  private getCacheFilePath(key: string): string {
    const hash = crypto.createHash('md5').update(key).digest('hex')
    return path.join(this.cacheDir, `${hash}.json`)
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const filePath = this.getCacheFilePath(key)
      const data = await fs.readFile(filePath, 'utf-8')
      const entry: CacheEntry<T> = JSON.parse(data)

      // Verificar si expiró
      const now = Date.now()
      if (now - entry.timestamp > this.defaultTTL) {
        await fs.unlink(filePath)
        this.stats.misses++
        return null
      }

      this.stats.hits++
      return entry.value
    } catch (error) {
      this.stats.misses++
      return null
    }
  }

  async set<T>(key: string, value: T, _ttl?: number): Promise<void> {
    try {
      const filePath = this.getCacheFilePath(key)
      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        hits: 0,
      }
      await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8')
    } catch (error) {
      console.error('❌ Error writing cache file:', error)
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getCacheFilePath(key)
      await fs.unlink(filePath)
    } catch (error) {
      // Ignorar si no existe
    }
  }

  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir)
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.cacheDir, file)))
      )
      this.stats = { hits: 0, misses: 0 }
    } catch (error) {
      console.error('❌ Error clearing cache:', error)
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const filePath = this.getCacheFilePath(key)
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const files = await fs.readdir(this.cacheDir)
      const total = this.stats.hits + this.stats.misses
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: total > 0 ? this.stats.hits / total : 0,
        totalEntries: files.length,
      }
    } catch {
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalEntries: 0,
      }
    }
  }
}

// ============================================================================
// CACHE SERVICE (Fachada principal)
// ============================================================================

export interface CacheConfig {
  adapter: 'memory' | 'file' | 'redis'
  ttl?: number
  cacheDir?: string
  redisUrl?: string
}

export class CacheService {
  private adapter: CacheAdapter
  private config: CacheConfig

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      adapter: config?.adapter || 'memory',
      ttl: config?.ttl || 5 * 60 * 1000, // 5 minutos default
      cacheDir: config?.cacheDir || './cache',
      redisUrl: config?.redisUrl || process.env.REDIS_URL,
    }

    this.adapter = this.createAdapter()
    console.log(`📦 Cache inicializado: ${this.config.adapter}`)
  }

  private createAdapter(): CacheAdapter {
    switch (this.config.adapter) {
    case 'file':
      return new FileCacheAdapter(this.config.cacheDir, this.config.ttl)

    case 'redis':
      // TODO: Implementar Redis adapter cuando lo necesites
      console.warn('⚠️  Redis adapter no implementado, usando Memory')
      return new MemoryCacheAdapter(this.config.ttl)

    case 'memory':
    default:
      return new MemoryCacheAdapter(this.config.ttl)
    }
  }

  // ========================================================================
  // API PÚBLICA
  // ========================================================================

  /**
   * Normaliza un texto para usar como parte de la key
   */
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[¿?¡!.,;:]/g, '')
  }

  /**
   * Genera una key única para mensaje + usuario
   */
  private generateKey(userId: string, message: string, prefix: string = 'msg'): string {
    const normalized = this.normalize(message)
    return `${prefix}:${userId}:${normalized}`
  }

  /**
   * Obtiene una respuesta cacheada
   */
  async getResponse(userId: string, message: string): Promise<string | null> {
    const key = this.generateKey(userId, message)
    return await this.adapter.get<string>(key)
  }

  /**
   * Guarda una respuesta en caché
   */
  async setResponse(userId: string, message: string, response: string): Promise<void> {
    const key = this.generateKey(userId, message)
    await this.adapter.set(key, response)
  }

  /**
   * Obtiene cualquier valor cacheado
   */
  async get<T>(key: string): Promise<T | null> {
    return await this.adapter.get<T>(key)
  }

  /**
   * Guarda cualquier valor en caché
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.adapter.set(key, value, ttl)
  }

  /**
   * Elimina una entrada
   */
  async delete(key: string): Promise<void> {
    await this.adapter.delete(key)
  }

  /**
   * Limpia toda la caché
   */
  async clear(): Promise<void> {
    await this.adapter.clear()
  }

  /**
   * Limpia caché de un usuario específico
   */
  async clearUser(userId: string): Promise<void> {
    // TODO: Implementar cuando sea necesario
    console.log(`🧹 Clearing cache for user: ${userId}`)
  }

  /**
   * Obtiene estadísticas de la caché
   */
  async getStats(): Promise<CacheStats> {
    return await this.adapter.getStats()
  }

  /**
   * Log de estadísticas
   */
  async logStats(): Promise<void> {
    const stats = await this.getStats()
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 CACHE STATS')
    console.log(`   Hits: ${stats.hits}`)
    console.log(`   Misses: ${stats.misses}`)
    console.log(`   Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`)
    console.log(`   Entries: ${stats.totalEntries}`)
    if (stats.memoryUsage) {
      console.log(`   Memory: ${(stats.memoryUsage / 1024).toFixed(1)} KB`)
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const cacheService = new CacheService({
  adapter: process.env.CACHE_ADAPTER as any || 'memory',
  ttl: parseInt(process.env.CACHE_TTL || '300000'), // 5 min default
})
