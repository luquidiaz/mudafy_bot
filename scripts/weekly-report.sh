#!/bin/bash

# 📊 Script de Reporte Semanal del Mudafy Bot
# Uso: ./scripts/weekly-report.sh [archivo_logs.txt]
# Genera un reporte semanal en formato Markdown

LOGFILE="${1:-/dev/stdin}"
FECHA=$(date +"%Y-%m-%d")
SEMANA=$(date +"%U")

OUTPUT_FILE="reports/weekly_report_${FECHA}.md"

# Crear directorio de reportes si no existe
mkdir -p reports

# =============================================================================
# EXTRAER DATOS
# =============================================================================

TOTAL_MENSAJES=$(grep -c "📨 MENSAJE RECIBIDO" "$LOGFILE" 2>/dev/null || echo "0")
USUARIOS_ACTIVOS=$(grep "📨 MENSAJE RECIBIDO" "$LOGFILE" -A1 | grep "De:" | awk '{print $2}' | sort -u | wc -l | tr -d ' ')

# Tiempos de respuesta
TIEMPOS=$(grep "⏱️  Tiempo total:" "$LOGFILE" | awk '{print $4}' | sed 's/ms//')
if [ ! -z "$TIEMPOS" ]; then
  AVG=$(echo "$TIEMPOS" | awk '{sum+=$1} END {print sum/NR}')
  AVG_INT=$(echo "$AVG" | awk '{print int($1)}')
else
  AVG_INT="N/A"
fi

# Cache
CACHE_HITS=$(grep -c "✅ Cache hit" "$LOGFILE" 2>/dev/null || echo "0")
CACHE_MISSES=$(grep -c "Cache miss" "$LOGFILE" 2>/dev/null || echo "0")
TOTAL_CACHE=$((CACHE_HITS + CACHE_MISSES))

if [ "$TOTAL_CACHE" -gt 0 ]; then
  CACHE_HIT_RATE=$(echo "scale=1; $CACHE_HITS * 100 / $TOTAL_CACHE" | bc)
else
  CACHE_HIT_RATE="N/A"
fi

# Fast path
FAST_PATH=$(grep -c "⚡ Fast route" "$LOGFILE" 2>/dev/null || echo "0")
ORCHESTRATOR=$(grep -c "🎭 Routing via Orchestrator" "$LOGFILE" 2>/dev/null || echo "0")
TOTAL_ROUTING=$((FAST_PATH + ORCHESTRATOR))

if [ "$TOTAL_ROUTING" -gt 0 ]; then
  FAST_PATH_RATE=$(echo "scale=1; $FAST_PATH * 100 / $TOTAL_ROUTING" | bc)
else
  FAST_PATH_RATE="N/A"
fi

# Feedback
FEEDBACK_POSITIVO=$(grep -c "✅ Feedback implícito POSITIVO" "$LOGFILE" 2>/dev/null || echo "0")
FEEDBACK_NEGATIVO=$(grep -c "❌ Feedback implícito NEGATIVO" "$LOGFILE" 2>/dev/null || echo "0")
THUMBS_UP=$(grep -c "👍 Feedback positivo recibido" "$LOGFILE" 2>/dev/null || echo "0")
THUMBS_DOWN=$(grep -c "👎 Feedback negativo recibido" "$LOGFILE" 2>/dev/null || echo "0")

TOTAL_POSITIVO=$((FEEDBACK_POSITIVO + THUMBS_UP))
TOTAL_NEGATIVO=$((FEEDBACK_NEGATIVO + THUMBS_DOWN))

if [ $((TOTAL_POSITIVO + TOTAL_NEGATIVO)) -gt 0 ]; then
  SATISFACTION=$(echo "scale=1; $TOTAL_POSITIVO * 100 / ($TOTAL_POSITIVO + $TOTAL_NEGATIVO)" | bc)
else
  SATISFACTION="N/A"
fi

# Errores
ERRORES=$(grep -c "❌ ERROR" "$LOGFILE" 2>/dev/null || echo "0")

# =============================================================================
# GENERAR REPORTE MARKDOWN
# =============================================================================

cat > "$OUTPUT_FILE" <<EOF
# 📊 Reporte Semanal - Mudafy Bot

**Fecha:** $FECHA
**Semana:** #$SEMANA
**Período:** $(date -v-7d +"%Y-%m-%d" 2>/dev/null || date -d "7 days ago" +"%Y-%m-%d" 2>/dev/null || echo "Última semana") - $FECHA

---

## 📈 Métricas Generales

| Métrica | Valor |
|---------|-------|
| Total mensajes | $TOTAL_MENSAJES |
| Usuarios activos | $USUARIOS_ACTIVOS |
| Tiempo respuesta promedio | ${AVG_INT}ms |
| Cache hit rate | ${CACHE_HIT_RATE}% |
| Fast path rate | ${FAST_PATH_RATE}% |
| Satisfacción | ${SATISFACTION}% |
| Errores | $ERRORES |

---

## 🧠 Performance

### Tiempos de Respuesta

EOF

# Agregar distribución de tiempos si hay datos
if [ ! -z "$TIEMPOS" ]; then
  TOTAL_TIEMPOS=$(echo "$TIEMPOS" | wc -l | tr -d ' ')
  UNDER_1S=$(echo "$TIEMPOS" | awk '$1 < 1000' | wc -l | tr -d ' ')
  UNDER_2S=$(echo "$TIEMPOS" | awk '$1 >= 1000 && $1 < 2000' | wc -l | tr -d ' ')
  UNDER_3S=$(echo "$TIEMPOS" | awk '$1 >= 2000 && $1 < 3000' | wc -l | tr -d ' ')
  UNDER_5S=$(echo "$TIEMPOS" | awk '$1 >= 3000 && $1 < 5000' | wc -l | tr -d ' ')
  OVER_5S=$(echo "$TIEMPOS" | awk '$1 >= 5000' | wc -l | tr -d ' ')

  cat >> "$OUTPUT_FILE" <<EOF
| Rango | Cantidad | Porcentaje |
|-------|----------|------------|
| < 1s  | $UNDER_1S | $(echo "scale=1; $UNDER_1S * 100 / $TOTAL_TIEMPOS" | bc)% |
| 1-2s  | $UNDER_2S | $(echo "scale=1; $UNDER_2S * 100 / $TOTAL_TIEMPOS" | bc)% |
| 2-3s  | $UNDER_3S | $(echo "scale=1; $UNDER_3S * 100 / $TOTAL_TIEMPOS" | bc)% |
| 3-5s  | $UNDER_5S | $(echo "scale=1; $UNDER_5S * 100 / $TOTAL_TIEMPOS" | bc)% |
| > 5s  | $OVER_5S | $(echo "scale=1; $OVER_5S * 100 / $TOTAL_TIEMPOS" | bc)% |

**Objetivo P95:** < 3s

EOF
fi

# Distribución por Agent
cat >> "$OUTPUT_FILE" <<EOF
### Distribución por Agent

EOF

grep "Ejecutando.*Agent" "$LOGFILE" 2>/dev/null | sed 's/.*Ejecutando //' | sed 's/ Agent.*//' | sort | uniq -c | sort -rn | awk '{
  total+=$1
  agents[NR]=$2
  counts[NR]=$1
}
END {
  print "| Agent | Queries | Porcentaje |"
  print "|-------|---------|------------|"
  for (i=1; i<=NR; i++) {
    pct = (counts[i] * 100 / total)
    printf "| %s | %d | %.1f%% |\n", agents[i], counts[i], pct
  }
}' >> "$OUTPUT_FILE"

# Top 10 queries
cat >> "$OUTPUT_FILE" <<EOF

---

## 🔝 Top 10 Queries Más Frecuentes

EOF

grep "📨 MENSAJE RECIBIDO" "$LOGFILE" -A2 | grep "Mensaje:" | awk -F'Mensaje: ' '{print $2}' | sort | uniq -c | sort -rn | head -10 | awk '{
  count=$1
  $1=""
  printf "| %d | %s |\n", count, $0
}' | sed '1i| Cantidad | Query |\n|----------|-------|' >> "$OUTPUT_FILE"

# Feedback detallado
cat >> "$OUTPUT_FILE" <<EOF

---

## 📊 Feedback

### Feedback Implícito

| Tipo | Cantidad |
|------|----------|
| ✅ Positivo | $FEEDBACK_POSITIVO |
| ❌ Negativo | $FEEDBACK_NEGATIVO |

### Feedback Pasivo (Thumbs)

| Tipo | Cantidad |
|------|----------|
| 👍 Positivo | $THUMBS_UP |
| 👎 Negativo | $THUMBS_DOWN |

**Satisfacción general:** ${SATISFACTION}%

EOF

# Errores si hay
if [ "$ERRORES" -gt 0 ]; then
  cat >> "$OUTPUT_FILE" <<EOF

---

## ❌ Errores Detectados

**Total:** $ERRORES errores

### Últimos errores:

\`\`\`
EOF

  grep "❌ ERROR" "$LOGFILE" -A2 | tail -20 >> "$OUTPUT_FILE"

  cat >> "$OUTPUT_FILE" <<EOF
\`\`\`

EOF
fi

# Keywords aprendidas
cat >> "$OUTPUT_FILE" <<EOF

---

## 🧠 Aprendizaje del Clasificador

EOF

if grep -q "Keywords aprendidas:" "$LOGFILE" 2>/dev/null; then
  KEYWORDS_APRENDIDAS=$(grep "Keywords aprendidas:" "$LOGFILE" | tail -1 | awk '{print $3}')

  cat >> "$OUTPUT_FILE" <<EOF
**Keywords aprendidas esta semana:** $KEYWORDS_APRENDIDAS

### Top keywords aprendidas:

\`\`\`
EOF

  grep "Top Learned:" "$LOGFILE" -A5 | tail -6 >> "$OUTPUT_FILE"

  cat >> "$OUTPUT_FILE" <<EOF
\`\`\`

EOF
else
  cat >> "$OUTPUT_FILE" <<EOF
No se encontraron datos de keywords aprendidas en los logs.

EOF
fi

# Acciones recomendadas
cat >> "$OUTPUT_FILE" <<EOF

---

## 🎯 Acciones Recomendadas

EOF

# Generar recomendaciones basadas en métricas
ACCIONES=""

if [ "$AVG_INT" != "N/A" ] && [ "$AVG_INT" -gt 3000 ]; then
  ACCIONES="${ACCIONES}- ⚠️ Tiempo de respuesta promedio alto (${AVG_INT}ms). Revisar caché hit rate y fast path rate.\n"
fi

if [ "$CACHE_HIT_RATE" != "N/A" ] && [ $(echo "$CACHE_HIT_RATE < 25" | bc) -eq 1 ]; then
  ACCIONES="${ACCIONES}- ⚠️ Cache hit rate bajo (${CACHE_HIT_RATE}%). Normal en primeras semanas, mejorará con el tiempo.\n"
fi

if [ "$FAST_PATH_RATE" != "N/A" ] && [ $(echo "$FAST_PATH_RATE < 75" | bc) -eq 1 ]; then
  ACCIONES="${ACCIONES}- ⚠️ Fast path rate bajo (${FAST_PATH_RATE}%). Considerar agregar más keywords al clasificador.\n"
fi

if [ "$SATISFACTION" != "N/A" ] && [ $(echo "$SATISFACTION < 80" | bc) -eq 1 ]; then
  ACCIONES="${ACCIONES}- ⚠️ Satisfacción baja (${SATISFACTION}%). Revisar queries con feedback negativo.\n"
fi

if [ "$ERRORES" -gt 10 ]; then
  ACCIONES="${ACCIONES}- ❌ Alto número de errores ($ERRORES). Revisar logs de errores urgentemente.\n"
fi

if [ -z "$ACCIONES" ]; then
  echo "✅ Todas las métricas dentro de objetivos. ¡Excelente trabajo!" >> "$OUTPUT_FILE"
else
  echo -e "$ACCIONES" >> "$OUTPUT_FILE"
fi

# Próximos pasos
cat >> "$OUTPUT_FILE" <<EOF

---

## 📅 Próximos Pasos

- [ ] Revisar top 10 queries para identificar patrones
- [ ] Analizar queries con feedback negativo
- [ ] Actualizar keywords del clasificador si es necesario
- [ ] Revisar errores (si los hay)
- [ ] Considerar actualizar Market Data (si es inicio de mes)

---

**Generado por:** weekly-report.sh
**Fecha de generación:** $(date)
EOF

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Reporte semanal generado"
echo "📄 Archivo: $OUTPUT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
cat "$OUTPUT_FILE"
