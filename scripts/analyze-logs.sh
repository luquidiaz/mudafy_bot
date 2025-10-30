#!/bin/bash

# 📊 Script de Análisis de Logs del Mudafy Bot
# Uso: ./scripts/analyze-logs.sh [archivo_logs.txt]
# Si no se especifica archivo, lee desde stdin (ideal para railway logs | ./analyze-logs.sh)

LOGFILE="${1:-/dev/stdin}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 ANÁLISIS DE LOGS - MUDAFY BOT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# =============================================================================
# 1. MENSAJES PROCESADOS
# =============================================================================
echo "📨 MENSAJES PROCESADOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TOTAL_MENSAJES=$(grep -c "📨 MENSAJE RECIBIDO" "$LOGFILE" 2>/dev/null || echo "0")
echo "Total de mensajes recibidos: $TOTAL_MENSAJES"

if [ "$TOTAL_MENSAJES" -gt 0 ]; then
  echo ""
  echo "Top 10 usuarios más activos:"
  grep "📨 MENSAJE RECIBIDO" "$LOGFILE" -A1 | grep "De:" | awk '{print $2}' | sort | uniq -c | sort -rn | head -10 | awk '{print "  " $1 " mensajes - Usuario: " $2}'
fi

echo ""

# =============================================================================
# 2. TIEMPOS DE RESPUESTA
# =============================================================================
echo "⏱️  TIEMPOS DE RESPUESTA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "⏱️  Tiempo total:" "$LOGFILE" 2>/dev/null; then
  # Extraer tiempos en ms
  TIEMPOS=$(grep "⏱️  Tiempo total:" "$LOGFILE" | awk '{print $4}' | sed 's/ms//')

  if [ ! -z "$TIEMPOS" ]; then
    TOTAL_TIEMPOS=$(echo "$TIEMPOS" | wc -l | tr -d ' ')
    AVG=$(echo "$TIEMPOS" | awk '{sum+=$1} END {print sum/NR}')
    MIN=$(echo "$TIEMPOS" | sort -n | head -1)
    MAX=$(echo "$TIEMPOS" | sort -n | tail -1)

    # P95 (percentil 95)
    P95_LINE=$(echo "$TOTAL_TIEMPOS * 0.95" | bc | awk '{print int($1+0.5)}')
    P95=$(echo "$TIEMPOS" | sort -n | sed -n "${P95_LINE}p")

    echo "Respuestas analizadas: $TOTAL_TIEMPOS"
    echo "Tiempo promedio: ${AVG}ms"
    echo "Tiempo mínimo: ${MIN}ms"
    echo "Tiempo máximo: ${MAX}ms"
    echo "P95 (95% de respuestas): ${P95}ms"

    # Distribución
    echo ""
    echo "Distribución de tiempos:"
    UNDER_1S=$(echo "$TIEMPOS" | awk '$1 < 1000' | wc -l | tr -d ' ')
    UNDER_2S=$(echo "$TIEMPOS" | awk '$1 >= 1000 && $1 < 2000' | wc -l | tr -d ' ')
    UNDER_3S=$(echo "$TIEMPOS" | awk '$1 >= 2000 && $1 < 3000' | wc -l | tr -d ' ')
    UNDER_5S=$(echo "$TIEMPOS" | awk '$1 >= 3000 && $1 < 5000' | wc -l | tr -d ' ')
    OVER_5S=$(echo "$TIEMPOS" | awk '$1 >= 5000' | wc -l | tr -d ' ')

    echo "  < 1s:  $UNDER_1S ($(echo "scale=1; $UNDER_1S * 100 / $TOTAL_TIEMPOS" | bc)%)"
    echo "  1-2s:  $UNDER_2S ($(echo "scale=1; $UNDER_2S * 100 / $TOTAL_TIEMPOS" | bc)%)"
    echo "  2-3s:  $UNDER_3S ($(echo "scale=1; $UNDER_3S * 100 / $TOTAL_TIEMPOS" | bc)%)"
    echo "  3-5s:  $UNDER_5S ($(echo "scale=1; $UNDER_5S * 100 / $TOTAL_TIEMPOS" | bc)%)"
    echo "  > 5s:  $OVER_5S ($(echo "scale=1; $OVER_5S * 100 / $TOTAL_TIEMPOS" | bc)%)"
  fi
else
  echo "No se encontraron registros de tiempo"
fi

echo ""

# =============================================================================
# 3. CLASIFICACIÓN Y ROUTING
# =============================================================================
echo "🧠 CLASIFICACIÓN Y ROUTING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Fast path vs Orchestrator
FAST_PATH=$(grep -c "⚡ Fast route" "$LOGFILE" 2>/dev/null || echo "0")
ORCHESTRATOR=$(grep -c "🎭 Routing via Orchestrator" "$LOGFILE" 2>/dev/null || echo "0")
TOTAL_ROUTING=$((FAST_PATH + ORCHESTRATOR))

if [ "$TOTAL_ROUTING" -gt 0 ]; then
  FAST_PATH_RATE=$(echo "scale=1; $FAST_PATH * 100 / $TOTAL_ROUTING" | bc)
  echo "Total de queries ruteadas: $TOTAL_ROUTING"
  echo "Fast path (clasificador local): $FAST_PATH (${FAST_PATH_RATE}%)"
  echo "Via Orchestrator: $ORCHESTRATOR ($(echo "100 - $FAST_PATH_RATE" | bc)%)"
  echo ""
  echo "📊 Objetivo fast path rate: >75%"

  if [ $(echo "$FAST_PATH_RATE > 75" | bc) -eq 1 ]; then
    echo "✅ Objetivo alcanzado!"
  else
    echo "⚠️  Por debajo del objetivo - considerar agregar keywords"
  fi
fi

echo ""

# Distribución por route
echo "Distribución por route:"
grep "Ejecutando.*Agent" "$LOGFILE" 2>/dev/null | sed 's/.*Ejecutando //' | sed 's/ Agent.*//' | sort | uniq -c | sort -rn | awk '{print "  " $2 ": " $1 " queries"}'

echo ""

# =============================================================================
# 4. CACHÉ
# =============================================================================
echo "💾 CACHÉ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CACHE_HITS=$(grep -c "✅ Cache hit" "$LOGFILE" 2>/dev/null || echo "0")
CACHE_MISSES=$(grep -c "Cache miss" "$LOGFILE" 2>/dev/null || echo "0")
TOTAL_CACHE=$((CACHE_HITS + CACHE_MISSES))

if [ "$TOTAL_CACHE" -gt 0 ]; then
  CACHE_HIT_RATE=$(echo "scale=1; $CACHE_HITS * 100 / $TOTAL_CACHE" | bc)
  echo "Total de consultas: $TOTAL_CACHE"
  echo "Cache hits: $CACHE_HITS (${CACHE_HIT_RATE}%)"
  echo "Cache misses: $CACHE_MISSES"
  echo ""
  echo "📊 Objetivo hit rate: >25%"

  if [ $(echo "$CACHE_HIT_RATE > 25" | bc) -eq 1 ]; then
    echo "✅ Objetivo alcanzado!"
  else
    echo "⚠️  Por debajo del objetivo - normal en primeros días"
  fi
fi

echo ""

# =============================================================================
# 5. FEEDBACK
# =============================================================================
echo "📊 FEEDBACK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FEEDBACK_POSITIVO=$(grep -c "✅ Feedback implícito POSITIVO" "$LOGFILE" 2>/dev/null || echo "0")
FEEDBACK_NEGATIVO=$(grep -c "❌ Feedback implícito NEGATIVO" "$LOGFILE" 2>/dev/null || echo "0")
THUMBS_UP=$(grep -c "👍 Feedback positivo recibido" "$LOGFILE" 2>/dev/null || echo "0")
THUMBS_DOWN=$(grep -c "👎 Feedback negativo recibido" "$LOGFILE" 2>/dev/null || echo "0")

TOTAL_FEEDBACK=$((FEEDBACK_POSITIVO + FEEDBACK_NEGATIVO + THUMBS_UP + THUMBS_DOWN))

if [ "$TOTAL_FEEDBACK" -gt 0 ]; then
  echo "Feedback implícito:"
  echo "  ✅ Positivo: $FEEDBACK_POSITIVO"
  echo "  ❌ Negativo: $FEEDBACK_NEGATIVO"
  echo ""
  echo "Feedback pasivo (thumbs):"
  echo "  👍 Positivo: $THUMBS_UP"
  echo "  👎 Negativo: $THUMBS_DOWN"

  TOTAL_POSITIVO=$((FEEDBACK_POSITIVO + THUMBS_UP))
  TOTAL_NEGATIVO=$((FEEDBACK_NEGATIVO + THUMBS_DOWN))

  if [ $((TOTAL_POSITIVO + TOTAL_NEGATIVO)) -gt 0 ]; then
    SATISFACTION=$(echo "scale=1; $TOTAL_POSITIVO * 100 / ($TOTAL_POSITIVO + $TOTAL_NEGATIVO)" | bc)
    echo ""
    echo "Satisfacción general: ${SATISFACTION}%"
  fi
else
  echo "No se encontraron registros de feedback"
fi

echo ""

# =============================================================================
# 6. ERRORES
# =============================================================================
echo "❌ ERRORES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ERRORES=$(grep -c "❌ ERROR" "$LOGFILE" 2>/dev/null || echo "0")
echo "Total de errores: $ERRORES"

if [ "$ERRORES" -gt 0 ]; then
  echo ""
  echo "Últimos 5 errores:"
  grep "❌ ERROR" "$LOGFILE" -A2 | tail -15
fi

echo ""

# =============================================================================
# 7. TOP KEYWORDS APRENDIDAS
# =============================================================================
echo "🧠 KEYWORDS APRENDIDAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "🧠 CLASSIFIER STATS" "$LOGFILE" 2>/dev/null; then
  # Extraer última estadística
  grep "Keywords aprendidas:" "$LOGFILE" | tail -1

  echo ""
  echo "Top keywords aprendidas (últimas):"
  grep "Top Learned:" "$LOGFILE" -A5 | tail -6
else
  echo "No se encontraron estadísticas de keywords"
fi

echo ""

# =============================================================================
# 8. TOP 10 QUERIES
# =============================================================================
echo "🔝 TOP 10 QUERIES MÁS FRECUENTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

grep "📨 MENSAJE RECIBIDO" "$LOGFILE" -A2 | grep "Mensaje:" | awk -F'Mensaje: ' '{print $2}' | sort | uniq -c | sort -rn | head -10 | awk '{$1=$1; count=$1; $1=""; print "  " count "x - " $0}'

echo ""

# =============================================================================
# 9. RESUMEN EJECUTIVO
# =============================================================================
echo "📋 RESUMEN EJECUTIVO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Mensajes procesados: $TOTAL_MENSAJES"

if [ "$TOTAL_TIEMPOS" -gt 0 ]; then
  echo "Tiempo promedio de respuesta: ${AVG}ms"
fi

if [ "$TOTAL_ROUTING" -gt 0 ]; then
  echo "Fast path rate: ${FAST_PATH_RATE}%"
fi

if [ "$TOTAL_CACHE" -gt 0 ]; then
  echo "Cache hit rate: ${CACHE_HIT_RATE}%"
fi

if [ $((TOTAL_POSITIVO + TOTAL_NEGATIVO)) -gt 0 ]; then
  echo "Satisfacción: ${SATISFACTION}%"
fi

echo "Errores: $ERRORES"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Análisis completado"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
