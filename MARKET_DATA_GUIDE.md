# 📊 Guía del Market Data Agent

## 🎯 Arquitectura Final Implementada

```
Orchestrator
    ↓
    ├─ 📚 Knowledge Agent (Info Agent)
    │  ├─ FAQ Mudafy + Fénix
    │  ├─ Manual del Asesor
    │  └─ Mejores Prácticas / Marca
    │
    ├─ 📊 Market Data Agent (NUEVO)
    │  └─ Datos de mercado (actualizable mensualmente)
    │
    └─ 💬 Conversation Agent
       └─ Chat casual
```

---

## 🚀 Setup Inicial

### Paso 1: Crear el Market Data Agent

```bash
npm run create-market-data-agent
```

**Qué hace este comando:**
1. Crea el assistant "Market Data Agent" en OpenAI
2. Crea un Vector Store para los datos
3. Sube el `market_data_template.json` inicial
4. Te da dos IDs para agregar a `.env`

**Output esperado:**
```
✅ Market Data Agent creado correctamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ID: asst_xxxxxxxxxxxxx
🔧 Agrega a .env:
   ASSISTANT_MARKET_DATA=asst_xxxxxxxxxxxxx
   VECTOR_STORE_MARKET_DATA=vs_xxxxxxxxxxxxx
```

### Paso 2: Actualizar el .env

```env
# OpenAI Assistants
ASSISTANT_ORCHESTRATOR=asst_...
ASSISTANT_CONVERSATION=asst_...
ASSISTANT_INFO=asst_...
ASSISTANT_MARKET_DATA=asst_xxxxxxxxxxxxx  # ← NUEVO

# Vector Stores
VECTOR_STORE_MARKET_DATA=vs_xxxxxxxxxxxxx  # ← NUEVO
```

### Paso 3: Actualizar el Orchestrator

```bash
npm run update-orchestrator-market
```

**Qué hace:**
- Actualiza las instrucciones del Orchestrator
- Agrega reglas de routing para market_data_agent
- Incluye ejemplos de queries de mercado

---

## 📊 Formato de Datos de Mercado

### Estructura del JSON

El archivo `market_data_template.json` es un ejemplo. Adaptalo a tus necesidades:

```json
{
  "metadata": {
    "version": "2025-01",
    "fecha_actualizacion": "2025-01-15",
    "fuente": "Reporte interno Mudafy",
    "region": "CABA y GBA"
  },
  "precios_promedio": {
    "venta": {
      "CABA": {
        "Palermo": {
          "precio_m2_usd": 4500,
          "variacion_mensual": "+2.5%",
          "stock_disponible": 850,
          "tiempo_venta_promedio_dias": 45
        }
      }
    }
  },
  "tendencias": {
    "general": "El mercado inmobiliario muestra...",
    "por_zona": { ... }
  },
  "insights": [
    "Las propiedades con amenities se venden 15% más rápido...",
    "..."
  ]
}
```

### Campos Importantes

**Metadata (requerido):**
- `version`: Formato "YYYY-MM" para identificar el mes
- `fecha_actualizacion`: Fecha de los datos
- `fuente`: De dónde vienen los datos

**Precios (core):**
- `precio_m2_usd`: Precio por metro cuadrado en dólares
- `variacion_mensual`: Cambio respecto al mes anterior
- `stock_disponible`: Cantidad de propiedades disponibles
- `tiempo_venta_promedio_dias`: Cuántos días tarda en venderse

**Tendencias (insights):**
- `general`: Resumen del mercado completo
- `por_zona`: Detalles por zona/barrio
- `tipologias_mas_buscadas`: Qué tipo de propiedades buscan

**Otros datos útiles:**
- `expensas_promedio`: Gastos mensuales típicos
- `comisiones_mercado`: % que se cobra
- `insights`: Array de insights interesantes

---

## 🔄 Actualización Mensual de Datos

### Proceso Recomendado

**1. Preparar los nuevos datos**

Crea un archivo `market_data.json` con los datos del nuevo mes:

```json
{
  "metadata": {
    "version": "2025-02",  // ← Cambiar mes
    "fecha_actualizacion": "2025-02-15",
    "fuente": "Reporte interno Mudafy",
    "region": "CABA y GBA"
  },
  "precios_promedio": {
    // ... tus datos actualizados
  }
}
```

**2. Ejecutar el script de actualización**

```bash
npm run update-market-data
```

O especificar un archivo custom:

```bash
npm run update-market-data ./path/to/your/data.json
```

**3. Verificar la actualización**

El script hará:
1. ✅ Validar el JSON
2. ✅ Subir el nuevo archivo
3. ✅ Agregarlo al Vector Store
4. ✅ Eliminar datos antiguos
5. ✅ Actualizar metadata del Assistant
6. ✅ Crear backup en `./backups/market_data/`

**Output esperado:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 ACTUALIZACIÓN COMPLETADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Versión: 2025-02
🆔 Archivo: file_xxxxxxxxxxxxx
📦 Vector Store: vs_xxxxxxxxxxxxx

💡 PRÓXIMOS PASOS:
1. Espera ~1-2 minutos para indexación
2. Prueba con pregunta de mercado
3. Verifica que mencione nueva versión
```

**4. Probar el bot**

Envía un mensaje al bot:
```
"Cuánto vale un depto en Palermo?"
```

La respuesta debe mencionar:
```
Según nuestros datos de Febrero 2025:
📍 Palermo
• Precio promedio: USD 4,500/m²
...
```

---

## 🎯 Keywords que Activan Market Data Agent

### Precios
- cuánto vale, cuánto cuesta
- precio, precios, valor
- cotización

### Zonas (ejemplos)
- palermo, belgrano, recoleta
- caballito, san isidro
- zona norte, zona sur, caba, gba

### Mercado
- mercado, tendencia, tendencias
- sube, baja, evolución

### Datos Numéricos
- m2, metro cuadrado
- usd, dólar, dólares

### Inversión
- invertir, inversión
- rentabilidad, ganancia, retorno, roi

### Comparación
- comparar, vs, versus
- mejor zona, conviene

### Otros
- expensas, tiempo de venta
- demanda, oferta, stock

**Total: 67 keywords base + aprendizaje automático**

---

## 📋 Ejemplos de Queries

### Queries que van a Market Data Agent:

✅ "Cuánto vale un departamento en Palermo?"
✅ "Qué zona me conviene para invertir?"
✅ "Cómo está el mercado en zona norte?"
✅ "Cuáles son las expensas promedio en Belgrano?"
✅ "Comparar Palermo vs Recoleta"
✅ "Dónde conviene comprar para alquilar?"
✅ "Precio del m2 en Caballito"
✅ "Tendencias del mercado 2025"

### Queries que van a Knowledge Agent:

✅ "Qué es Mudafy?"
✅ "Cómo crear un aviso en Fénix?"
✅ "Mejores prácticas para fotos?"
✅ "Cómo hacer un buen título?"
✅ "Cómo captar leads?"

---

## 🔧 Personalización del Agent

### Ajustar el Tono

Si querés que el agent sea más formal/informal, editá el system prompt:

```bash
# En OpenAI Platform → Assistants → Market Data Agent → Instructions
```

O crea un script similar a `update-orchestrator-with-market.ts` para actualizar programáticamente.

### Agregar Más Zonas

Simplemente incluílas en tu `market_data.json`:

```json
{
  "precios_promedio": {
    "venta": {
      "CABA": {
        "Villa Urquiza": { ... },
        "Núñez": { ... }
      },
      "GBA_Oeste": {
        "Morón": { ... },
        "Ramos Mejía": { ... }
      }
    }
  }
}
```

El agent las encontrará automáticamente vía File Search.

### Agregar Keywords de Zonas al Classifier

Editá `src/services/classifier.service.ts`:

```typescript
[
  'market_data',
  [
    // ... keywords existentes

    // Agregar nuevas zonas
    'villa urquiza',
    'nuñez',
    'moron',
    'ramos mejia',
  ],
],
```

---

## 📊 Monitoreo

### Ver Estadísticas

Enviá al bot:
```
/stats
```

Verás:
```
📊 Estadísticas del Bot

💾 Caché:
• Hit Rate: 35.2%

🧠 Clasificador:
• Keywords base: 184
• Keywords aprendidas: 12
• Knowledge: 3
• Market Data: 8  ← Cuántos aprend ió
• Conversación: 1
```

### Logs del Bot

En Railway o localmente verás:
```
🧠 Clasificación: market_data (high) via local (15ms)
   Keywords: precio, palermo
⚡ Fast route (high confidence): market_data
📊 Ejecutando Market Data Agent...
⏱️  Tiempo total: 2456ms
```

### Keywords Aprendidas

Cada 10 minutos (o con `/stats`):
```
🧠 CLASSIFIER STATS
   Top Learned:
     1. "precio promedio" → market_data (0.40)
     2. "zona sur" → market_data (0.30)
```

---

## 🐛 Troubleshooting

### "No tengo información sobre esa zona"

**Causa:** La zona no está en tu `market_data.json`

**Solución:**
1. Agrega la zona a tu JSON
2. Ejecuta `npm run update-market-data`
3. Espera 1-2 min para indexación

### Agent responde con datos desactualizados

**Causa:** La actualización no se procesó correctamente

**Solución:**
```bash
# Verificar Vector Store
# Debería tener solo 1 archivo (el más reciente)
```

Si tiene múltiples archivos:
```bash
# Ejecutar con --keep-old=false
npm run update-market-data
```

### Queries van a Knowledge en vez de Market Data

**Causa:** El Orchestrator no está actualizado

**Solución:**
```bash
npm run update-orchestrator-market
```

### El bot tarda mucho en responder

**Normal:** File Search puede tardar 2-4s

**Optimización:**
- El clasificador local evita usar Orchestrator en queries claras
- La caché guarda respuestas repetidas (<50ms)
- Keywords aprendidas mejoran routing con el tiempo

---

## 🔮 Futuras Mejoras

### Base de Datos en Tiempo Real

En vez de JSON estático, consultar DB:

```typescript
// En el Market Data Agent
const latestData = await db.query(`
  SELECT * FROM market_data
  WHERE zone = 'Palermo'
  ORDER BY date DESC LIMIT 1
`)
```

**Ventaja:** Datos siempre actualizados sin actualizar Vector Store

### API Externa

Consumir APIs de mercado inmobiliario:

```typescript
const response = await fetch('https://api.inmobiliaria.com/prices')
const data = await response.json()
```

### Gráficos y Visualizaciones

Generar gráficos con Chart.js y enviarlos como imágenes:

```typescript
const chart = generatePriceChart(data)
await flowDynamic({ media: chart })
```

### Alertas de Mercado

Notificar cuando hay cambios significativos:

```typescript
if (variacion > 5%) {
  await notifyAdvisors(`⚠️ Palermo subió 5% este mes!`)
}
```

---

## 📚 Archivos Relacionados

**Scripts:**
- `scripts/create-market-data-agent.ts` - Crear agent inicial
- `scripts/update-market-data.ts` - Actualizar datos mensualmente
- `scripts/update-orchestrator-with-market.ts` - Actualizar routing

**Servicios:**
- `src/services/classifier.service.ts` - Keywords y routing local
- `src/services/openai.service.ts` - Lógica de agents

**Template:**
- `market_data_template.json` - Ejemplo de estructura de datos

**Config:**
- `.env.example` - Variables de entorno necesarias
- `package.json` - Scripts npm

---

## 🎓 Mejores Prácticas

### 1. Actualizar Mensualmente

Configura un recordatorio:
```
Día 1 de cada mes:
→ Obtener datos actualizados
→ Crear market_data.json
→ Ejecutar npm run update-market-data
→ Probar con queries de ejemplo
```

### 2. Backup Automático

El script crea backups automáticamente en:
```
./backups/market_data/market_data_2025-01_2025-01-15.json
./backups/market_data/market_data_2025-02_2025-02-15.json
```

**Recomendación:** Commitea los backups a Git.

### 3. Validar Datos

Antes de actualizar, valida tu JSON:
```bash
node -e "JSON.parse(require('fs').readFileSync('./market_data.json', 'utf8'))"
# Si no hay error → JSON válido ✅
```

### 4. Versionar Correctamente

Formato recomendado para `version`:
```
"YYYY-MM" → "2025-01", "2025-02", ...
```

Esto permite al agent decir: "Según datos de Enero 2025..."

### 5. Mantener Insights Actualizados

Los insights son lo más valioso:
```json
{
  "insights": [
    "Las propiedades en Palermo se venden 20% más rápido que el promedio",
    "Caballito ofrece la mejor relación precio/rentabilidad",
    "San Isidro lidera en casas de alta gama"
  ]
}
```

---

## 💡 Tips y Trucos

### Testing Rápido

Crea queries de prueba:
```bash
# queries_test.txt
Cuánto vale un depto en Palermo?
Qué zona conviene para invertir?
Comparar Belgrano vs Recoleta
Cómo está el mercado este mes?
```

### Datos de Demo

Usa el `market_data_template.json` como base y modificalo gradualmente.

### Logs Detallados

Para debugging, revisá los logs del agent:
```
📊 Ejecutando Market Data Agent...
   🔧 Market Data Agent ejecutó 2 step(s)
   🔍 Market Data Agent usó File Search!
```

---

**Última actualización:** 2025-01-30
**Versión:** 1.0.0
**Autor:** Lucas Diaz + Claude Code
