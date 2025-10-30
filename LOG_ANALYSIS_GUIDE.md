# 📊 Guía de Análisis de Logs

## 🎯 Objetivo

Aprender a leer, analizar y extraer insights de los logs del bot para mejorarlo continuamente.

---

## 📍 Dónde Están los Logs

### En Desarrollo (Local)

```bash
npm run dev

# Los logs aparecen en la consola
# Ctrl+C para detener
```

### En Producción (Railway)

**Opción 1: Dashboard de Railway**
1. Ir a https://railway.app
2. Seleccionar tu proyecto
3. Click en "Deployments"
4. Click en el deployment activo
5. Ver logs en tiempo real

**Opción 2: CLI de Railway**
```bash
# Instalar CLI
npm install -g @railway/cli

# Login
railway login

# Ver logs en tiempo real
railway logs

# Ver logs con follow (como tail -f)
railway logs --follow

# Exportar logs a archivo
railway logs > logs_$(date +%Y-%m-%d).txt
```

---

## 🔍 Anatomía de los Logs

### Estructura de un Request Completo

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 MENSAJE RECIBIDO
   De: 5491234567890
   Mensaje: Cuánto vale un depto en Palermo?
   Nombre: Lucas Diaz
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Procesando con Multi-Agent...
   🔍 Cache miss - procesando...
   🧠 Clasificación: market_data (high) via local (12ms)
      Keywords: precio, palermo
   ⚡ Fast route (high confidence): market_data
   📊 Ejecutando Market Data Agent...
      ⏳ Market Data Agent procesando...
      🔧 Market Data Agent ejecutó 2 step(s)
      🔍 Market Data Agent usó File Search!
      💬 Market Data Agent generó respuesta
   ✅ Respuesta final recibida: "Según datos de Enero 2025:

📍 Palermo
• Precio promedio: USD..."
   📤 Respuesta enviada al usuario
   ⏱️  Tiempo total: 2456ms
```

### Componentes Clave

| Emoji | Significado | Qué Indica |
|-------|-------------|------------|
| 📨 | Mensaje recibido | Inicio de request |
| 🎯 | Cache HIT | Respuesta desde caché (rápido) |
| 🔍 | Cache miss | Necesita procesar (más lento) |
| 🧠 | Clasificación | Qué route decidió el classifier |
| ⚡ | Fast route | Sin Orchestrator (optimizado) |
| 🎭 | Orchestrator | Consultó Orchestrator (más lento) |
| 📚/📊/💬 | Agent ejecutado | Qué agent respondió |
| ✅ | Feedback positivo | Usuario satisfecho |
| ❌ | Feedback negativo | Usuario insatisfecho |
| ⏱️ | Tiempo total | Latencia del request |

---

## 📊 Análisis Básico

### 1. Ver Últimos 20 Mensajes

```bash
# En Railway
railway logs | grep "📨 MENSAJE RECIBIDO" | tail -20
```

**Output:**
```
📨 MENSAJE RECIBIDO
   De: 5491234567890
   Mensaje: Cuánto vale en Palermo?
...
```

### 2. Contar Mensajes por Día

```bash
railway logs | grep "📨 MENSAJE RECIBIDO" | grep "$(date +%Y-%m-%d)" | wc -l
```

**Output:** `45` (45 mensajes hoy)

### 3. Ver Tiempos de Respuesta

```bash
railway logs | grep "⏱️  Tiempo total" | tail -20
```

**Output:**
```
⏱️  Tiempo total: 2456ms
⏱️  Tiempo total: 1834ms
⏱️  Tiempo total: 45ms    ← Cache hit
⏱️  Tiempo total: 3201ms
```

---

## 🔬 Análisis Avanzado

### 1. Top 10 Preguntas Más Frecuentes

```bash
railway logs > logs.txt

# Extraer solo los mensajes
cat logs.txt | \
  grep "Mensaje:" | \
  awk -F'Mensaje: ' '{print $2}' | \
  sort | \
  uniq -c | \
  sort -rn | \
  head -10
```

**Output:**
```
  18 Cuánto vale un depto en Palermo?
  12 Cómo publicar una propiedad?
   9 Qué es Mudafy?
   8 Tendencias del mercado
   7 Cómo captar leads?
   6 Precio en Belgrano
   5 Mejores prácticas para fotos
   4 Qué incluye Mudacademy?
   3 Comisiones de venta
   2 Cómo usar Fénix?
```

**Acción:**
- Top 3 queries → Asegurar respuestas optimizadas
- Nuevas queries frecuentes → Agregar al Vector Store

### 2. Distribución de Routes

```bash
# Contar cada tipo de route
cat logs.txt | grep "route:" | awk '{print $NF}' | sort | uniq -c | sort -rn
```

**Output:**
```
  245 market_data     (54%)
  156 mudafy_info     (34%)
   55 conversation    (12%)
```

**Interpretación:**
- Market Data más usado → Asesores buscan datos de mercado
- Knowledge Agent segundo → FAQ y guías útiles
- Conversation bajo → Bot usado para trabajo, no chat

### 3. Cache Hit Rate

```bash
# Cache hits
HITS=$(cat logs.txt | grep "🎯 CACHE HIT" | wc -l)

# Cache misses
MISSES=$(cat logs.txt | grep "🔍 Cache miss" | wc -l)

# Calcular hit rate
echo "scale=2; $HITS / ($HITS + $MISSES) * 100" | bc
```

**Output:** `32.50%` (32.5% hit rate)

**Objetivo:** >25% es bueno, >40% es excelente

### 4. Fast Path vs Orchestrator

```bash
# Fast paths
FAST=$(cat logs.txt | grep "⚡ Fast route" | wc -l)

# Orchestrator calls
ORCH=$(cat logs.txt | grep "🎭 Consultando Orchestrator" | wc -l)

# Calcular fast path rate
echo "scale=2; $FAST / ($FAST + $ORCH) * 100" | bc
```

**Output:** `78.30%` (78.3% fast-path)

**Objetivo:** >75% es bueno, >85% es excelente

### 5. Tiempos de Respuesta Promedio

```bash
cat logs.txt | \
  grep "⏱️  Tiempo total:" | \
  awk '{print $NF}' | \
  sed 's/ms//' | \
  awk '{sum+=$1; count++} END {print sum/count "ms promedio"}'
```

**Output:** `2456.78ms promedio`

**Objetivo:** <3000ms promedio es bueno

### 6. P95 (Percentil 95)

```bash
cat logs.txt | \
  grep "⏱️  Tiempo total:" | \
  awk '{print $NF}' | \
  sed 's/ms//' | \
  sort -n | \
  awk 'BEGIN{c=0} {arr[c++]=$1} END {print arr[int(c*0.95)] "ms (P95)"}'
```

**Output:** `4123ms (P95)`

**Interpretación:** 95% de requests toman menos de 4.1s

**Objetivo:** P95 <3500ms

### 7. Feedback Implícito

```bash
# Feedback positivo
POSITIVE=$(cat logs.txt | grep "✅ Feedback implícito POSITIVO" | wc -l)

# Feedback negativo
NEGATIVE=$(cat logs.txt | grep "❌ Feedback implícito NEGATIVO" | wc -l)

# Satisfaction rate
echo "scale=2; $POSITIVE / ($POSITIVE + $NEGATIVE) * 100" | bc
```

**Output:** `78.50%` (78.5% satisfacción)

**Objetivo:** >80% satisfacción

### 8. Errores

```bash
# Buscar errores
cat logs.txt | grep "❌ ERROR:" -A 5
```

**Output:**
```
❌ ERROR: Error: Run failed with status: failed
    at OpenAIService.runAssistant
    ...
```

**Acción:** Identificar patrón y corregir

---

## 🛠️ Scripts de Análisis Automatizados

Ahora creo scripts que puedes ejecutar fácilmente:

### Script 1: `analyze-logs.sh`

```bash
#!/bin/bash

# Análisis completo de logs

echo "📊 ANÁLISIS DE LOGS"
echo "=================="
echo ""

# Total de mensajes
TOTAL=$(grep "📨 MENSAJE RECIBIDO" logs.txt | wc -l)
echo "📨 Total mensajes: $TOTAL"
echo ""

# Top 5 queries
echo "🔝 Top 5 Preguntas:"
grep "Mensaje:" logs.txt | \
  awk -F'Mensaje: ' '{print $2}' | \
  sort | uniq -c | sort -rn | head -5
echo ""

# Routes
echo "📍 Distribución de Routes:"
grep "route:" logs.txt | awk '{print $NF}' | sort | uniq -c | sort -rn
echo ""

# Cache hit rate
HITS=$(grep "🎯 CACHE HIT" logs.txt | wc -l)
MISSES=$(grep "🔍 Cache miss" logs.txt | wc -l)
HIT_RATE=$(echo "scale=2; $HITS / ($HITS + $MISSES) * 100" | bc 2>/dev/null || echo "N/A")
echo "💾 Cache Hit Rate: $HIT_RATE%"
echo ""

# Fast path rate
FAST=$(grep "⚡ Fast route" logs.txt | wc -l)
ORCH=$(grep "🎭 Consultando Orchestrator" logs.txt | wc -l)
FAST_RATE=$(echo "scale=2; $FAST / ($FAST + $ORCH) * 100" | bc 2>/dev/null || echo "N/A")
echo "⚡ Fast Path Rate: $FAST_RATE%"
echo ""

# Tiempo promedio
AVG_TIME=$(grep "⏱️  Tiempo total:" logs.txt | \
  awk '{print $NF}' | sed 's/ms//' | \
  awk '{sum+=$1; count++} END {print sum/count}' 2>/dev/null || echo "N/A")
echo "⏱️  Tiempo promedio: ${AVG_TIME}ms"
echo ""

# Feedback
POSITIVE=$(grep "✅ Feedback implícito POSITIVO" logs.txt | wc -l)
NEGATIVE=$(grep "❌ Feedback implícito NEGATIVO" logs.txt | wc -l)
SAT_RATE=$(echo "scale=2; $POSITIVE / ($POSITIVE + $NEGATIVE) * 100" | bc 2>/dev/null || echo "N/A")
echo "😊 Satisfaction Rate: $SAT_RATE%"
echo ""

# Errores
ERRORS=$(grep "❌ ERROR:" logs.txt | wc -l)
echo "⚠️  Errores: $ERRORS"

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "Últimos errores:"
  grep "❌ ERROR:" logs.txt | tail -3
fi
```

### Script 2: `weekly-report.sh`

```bash
#!/bin/bash

# Reporte semanal automático

WEEK=$(date +"%Y-W%V")
OUTPUT="report_$WEEK.md"

cat > $OUTPUT << EOF
# 📊 Reporte Semanal - Semana $WEEK

## Resumen Ejecutivo

**Período:** $(date -d "7 days ago" +%Y-%m-%d) a $(date +%Y-%m-%d)

## Métricas Principales

### Volumen
- **Total mensajes:** $(grep "📨 MENSAJE RECIBIDO" logs.txt | wc -l)
- **Usuarios activos:** $(grep "De:" logs.txt | awk '{print $2}' | sort -u | wc -l)
- **Promedio diario:** $(echo "scale=0; $(grep "📨 MENSAJE RECIBIDO" logs.txt | wc -l) / 7" | bc)

### Performance
- **Tiempo promedio:** $(grep "⏱️  Tiempo total:" logs.txt | awk '{print $NF}' | sed 's/ms//' | awk '{sum+=$1; count++} END {print sum/count "ms"}')
- **Cache hit rate:** $(echo "scale=1; $(grep "🎯 CACHE HIT" logs.txt | wc -l) / ($(grep "🎯 CACHE HIT" logs.txt | wc -l) + $(grep "🔍 Cache miss" logs.txt | wc -l)) * 100" | bc)%
- **Fast path rate:** $(echo "scale=1; $(grep "⚡ Fast route" logs.txt | wc -l) / ($(grep "⚡ Fast route" logs.txt | wc -l) + $(grep "🎭 Consultando Orchestrator" logs.txt | wc -l)) * 100" | bc)%

### Calidad
- **Satisfaction rate:** $(echo "scale=1; $(grep "✅ Feedback implícito POSITIVO" logs.txt | wc -l) / ($(grep "✅ Feedback implícito POSITIVO" logs.txt | wc -l) + $(grep "❌ Feedback implícito NEGATIVO" logs.txt | wc -l)) * 100" | bc)%
- **Errores totales:** $(grep "❌ ERROR:" logs.txt | wc -l)

## Top 10 Preguntas

\`\`\`
$(grep "Mensaje:" logs.txt | awk -F'Mensaje: ' '{print $2}' | sort | uniq -c | sort -rn | head -10)
\`\`\`

## Distribución de Routes

\`\`\`
$(grep "route:" logs.txt | awk '{print $NF}' | sort | uniq -c | sort -rn)
\`\`\`

## Acciones Recomendadas

- [ ] Revisar top 3 preguntas y optimizar respuestas
- [ ] Agregar keywords para queries frecuentes mal ruteadas
- [ ] Actualizar Vector Store con nuevas FAQs
- [ ] Revisar errores si >5% de requests

---
_Generado automáticamente el $(date +"%Y-%m-%d %H:%M")_
EOF

echo "✅ Reporte generado: $OUTPUT"
cat $OUTPUT
```

---

## 📈 Dashboard Semanal (Template)

Crea un archivo `dashboard_template.md`:

```markdown
# 📊 Dashboard Semanal - Semana [NUM]

**Período:** [FECHA_INICIO] a [FECHA_FIN]

## 🎯 Métricas Principales

| Métrica | Valor | Objetivo | Estado |
|---------|-------|----------|--------|
| Total Mensajes | [X] | - | - |
| Usuarios Activos | [X] | - | - |
| Tiempo Promedio | [X]ms | <3000ms | [✅/⚠️/❌] |
| Cache Hit Rate | [X]% | >25% | [✅/⚠️/❌] |
| Fast Path Rate | [X]% | >75% | [✅/⚠️/❌] |
| Satisfaction Rate | [X]% | >80% | [✅/⚠️/❌] |
| Errores | [X] | <5% | [✅/⚠️/❌] |

## 📊 Distribución de Routes

| Route | Count | % |
|-------|-------|---|
| Market Data | [X] | [X]% |
| Knowledge | [X] | [X]% |
| Conversation | [X] | [X]% |

## 🔝 Top 5 Preguntas

1. [Query 1] ([X] veces)
2. [Query 2] ([X] veces)
3. [Query 3] ([X] veces)
4. [Query 4] ([X] veces)
5. [Query 5] ([X] veces)

## 🧠 Aprendizaje del Bot

- Keywords aprendidas esta semana: [+X]
- Keywords aprendidas total: [X]
- Fast path rate vs semana anterior: [↑/↓/→] [X]%

## 📝 Acciones Tomadas

- [ ] [Acción 1]
- [ ] [Acción 2]
- [ ] [Acción 3]

## 🎯 Plan Próxima Semana

1. [Acción 1]
2. [Acción 2]
3. [Acción 3]

## 📌 Notas

[Observaciones, patrones detectados, ideas para mejorar]

---
_Completado el: [FECHA]_
```

---

## 🚀 Workflow Recomendado

### Viernes (15 minutos)

```bash
# 1. Exportar logs de la semana
railway logs > logs_$(date +%Y-%m-%d).txt

# 2. Ejecutar análisis
bash analyze-logs.sh

# 3. Generar reporte
bash weekly-report.sh

# 4. Completar dashboard template
# (manual, con los datos del reporte)

# 5. Identificar acciones
# - ¿Nuevas FAQs necesarias?
# - ¿Keywords para agregar?
# - ¿Errores recurrentes?
```

### Lunes (5 minutos)

```bash
# Implementar acciones identificadas
# - Agregar keywords
# - Actualizar Vector Store
# - Fix de errores
```

---

## 🔍 Patrones Comunes

### Patrón 1: Query Repetida

```
📨 Usuario: "Cuánto vale en Núñez?"
🤖 Bot: [Respuesta genérica]
📨 Usuario: "No tenés datos de Núñez?"
❌ Feedback negativo detectado
```

**Acción:** Agregar datos de Núñez al market_data.json

### Patrón 2: Route Incorrecto

```
📨 Usuario: "Qué funciones tiene Fénix?"
🧠 Clasificación: conversation (high)  ← ERROR
💬 Ejecutando Conversation Agent...
📨 Usuario: "No, pregunto por el CRM"
❌ Feedback negativo detectado
```

**Acción:** Agregar "funciones" y "fenix" como keywords de mudafy_info

### Patrón 3: Respuestas Lentas

```
⏱️  Tiempo total: 5234ms  ← Muy lento
⏱️  Tiempo total: 4891ms
⏱️  Tiempo total: 5012ms
```

**Posibles causas:**
- File Search lento → Reducir tamaño de Vector Store
- Orchestrator siempre activo → Mejorar keywords
- Sin caché → Normal en primeras semanas

---

## 📚 Queries Útiles

```bash
# Usuarios únicos hoy
cat logs.txt | grep "De:" | awk '{print $2}' | sort -u | wc -l

# Mensajes por hora
cat logs.txt | grep "📨 MENSAJE RECIBIDO" | awk '{print $1}' | cut -d: -f1 | sort | uniq -c

# Queries que causaron errores
cat logs.txt | grep -B 10 "❌ ERROR:" | grep "Mensaje:"

# Keywords más aprendidas
cat logs.txt | grep "Aprendiendo:" | awk -F'"' '{print $2}' | sort | uniq -c | sort -rn

# Respuestas más largas
cat logs.txt | grep "✅ Respuesta final recibida" | awk '{print length, $0}' | sort -rn | head -10
```

---

## 🎓 Tips y Trucos

1. **Usa `grep` con contexto**
   ```bash
   grep -A 5 "❌ ERROR:"  # 5 líneas después
   grep -B 5 "❌ ERROR:"  # 5 líneas antes
   grep -C 5 "❌ ERROR:"  # 5 líneas antes y después
   ```

2. **Filtra por fecha**
   ```bash
   grep "2025-02-15" logs.txt | grep "📨 MENSAJE"
   ```

3. **Busca patrones específicos**
   ```bash
   # Mensajes de un usuario
   grep "De: 5491234567890" logs.txt -A 2

   # Solo Market Data queries
   grep "market_data" logs.txt -B 10 | grep "Mensaje:"
   ```

4. **Export a CSV para Excel**
   ```bash
   echo "Timestamp,User,Message,Route,Time" > export.csv
   # Parsear logs y agregar al CSV
   ```

---

**Última actualización:** 2025-01-30
**Versión:** 1.0.0
