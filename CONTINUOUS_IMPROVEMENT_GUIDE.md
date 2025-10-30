# 🧠 Guía de Mejora Continua del Bot

## 📊 Sistema de Aprendizaje Actual (Ya Funcionando)

### ✅ Aprendizaje Automático de Keywords

**Cómo funciona:**

```
Usuario: "Necesito info sobre la tecnología Fénix del portal"
   ↓
1. Classifier Local: mudafy_info (medium confidence)
   ↓
2. Consulta Orchestrator (por baja/media confianza)
   ↓
3. Orchestrator decide: mudafy_info
   ↓
4. APRENDIZAJE AUTOMÁTICO:
   Sistema extrae keywords:
   - "tecnologia fenix" → mudafy_info (peso +0.1)
   - "portal" → mudafy_info (peso +0.1)
   ↓
5. Próxima vez que alguien diga "portal":
   → ⚡ Fast path directo (sin Orchestrator)
   → Latencia: 2-4s en vez de 4-6s
```

**Esto sucede SOLO, sin intervención humana.**

### Métricas de Aprendizaje

Usa `/stats` para ver:

```
🧠 Clasificador:
• Keywords base: 184
• Keywords aprendidas: 23  ← Aumenta con el tiempo
• Knowledge: 8
• Market Data: 12
• Conversación: 3
```

**Evolución esperada:**

| Tiempo | Keywords Aprendidas | Fast Path Rate |
|--------|---------------------|----------------|
| Día 1-7 | 0-15 | 60-70% |
| Semana 2-4 | 15-50 | 70-80% |
| Mes 2+ | 50-150 | 80-90% |

---

## 🎯 Estrategias de Mejora Continua

## 1️⃣ **Monitoreo de Calidad de Respuestas**

### A. Sistema de Logs Estructurados

Actualmente los logs muestran:

```
📨 MENSAJE RECIBIDO
   De: 5491234567890
   Mensaje: Cuánto vale un depto en Palermo?
🧠 Clasificación: market_data (high) via local (12ms)
   Keywords: precio, palermo
⚡ Fast route (high confidence): market_data
📊 Ejecutando Market Data Agent...
⏱️  Tiempo total: 2456ms
```

**Qué analizar semanalmente:**

1. **Tiempo de respuesta promedio**
   - Objetivo: <3s P95
   - Si sube: revisar caché hit rate

2. **Fast path rate**
   - Objetivo: >75%
   - Si baja: agregar más keywords base

3. **Errores frecuentes**
   - Buscar "❌ Error" en logs
   - Identificar patrones

### B. Exportar Logs para Análisis

Crea un script semanal:

```bash
# En Railway o localmente
railway logs > logs_week_$(date +%Y-%m-%d).txt

# Analizar:
grep "⏱️  Tiempo total" logs_week_*.txt | awk '{print $4}' | sort -n
# Te da distribución de tiempos
```

---

## 2️⃣ **Feedback Loop de Usuarios (Opcional)**

### Sistema Simple con Reacciones

**Implementación básica:**

Después de cada respuesta del bot, el asesor puede responder:
- `👍` o `/good` → Respuesta útil
- `👎` o `/bad` → Respuesta no útil

```typescript
// Ya está preparado en feedback.service.ts

// Integración en app.ts:
if (userMessage === '👍' || userMessage.toLowerCase() === '/good') {
  await feedbackService.submitFeedback(userId, 'good')
  await flowDynamic('¡Gracias! Me ayuda a mejorar 😊')
  return
}

if (userMessage === '👎' || userMessage.toLowerCase() === '/bad') {
  await feedbackService.submitFeedback(userId, 'bad')
  await flowDynamic('Gracias por avisar. ¿Qué puedo mejorar?')
  return
}
```

### Análisis de Feedback

El sistema detecta patrones automáticamente:

```
⚠️  FEEDBACK NEGATIVO DETECTADO
   Usuario: 5491234567890
   Pregunta: "Cuánto vale en Núñez?"
   Route: market_data
   Tiempo: 3456ms

🔍 PATRÓN DETECTADO:
   3 quejas similares en route: market_data
   💡 Sugerencia: Revisar las instrucciones del agent
   💡 O agregar más datos al Vector Store
```

**Acción:** Si ves 3+ quejas sobre una zona → agregar datos de esa zona al market_data.json

---

## 3️⃣ **Optimización de Prompts de Agents**

### A. Testing A/B de Prompts

**Proceso:**

1. **Identifica el problema**
   ```
   Ejemplo: Market Data Agent da respuestas muy técnicas
   Usuarios prefieren algo más simple
   ```

2. **Crea versión alternativa**
   ```typescript
   // Prompt A (actual): "Sos un experto en datos de mercado..."
   // Prompt B (test): "Sos un asesor amigable que explica datos de mercado de forma simple..."
   ```

3. **Deploy y compara**
   - Usa por 1 semana
   - Mide satisfacción (feedback 👍👎)
   - Quédate con el mejor

### B. Evolución de Prompts

**Cada mes, revisar:**

- ¿Las respuestas son demasiado largas/cortas?
- ¿El tono es apropiado?
- ¿Falta información que usuarios preguntan seguido?

**Ejemplo de mejora iterativa:**

```
Versión 1.0: "Respondé con datos precisos"
↓ (usuarios piden contexto)
Versión 1.1: "Respondé con datos + insights"
↓ (respuestas muy largas)
Versión 1.2: "Datos + 1 insight clave, máximo 200 palabras"
```

---

## 4️⃣ **Enriquecimiento del Vector Store**

### A. Agregar Contenido Basado en Preguntas Frecuentes

**Proceso:**

1. **Cada 2 semanas, revisar logs:**
   ```bash
   grep "📨 MENSAJE RECIBIDO" logs.txt | grep "Mensaje:" | sort | uniq -c | sort -rn | head -20
   ```

2. **Identificar temas recurrentes:**
   ```
   10x "Cómo funciona el CRM Fénix?"
   8x "Qué incluye Mudacademy?"
   6x "Cómo exportar leads?"
   ```

3. **Agregar al Vector Store:**
   - Si es Knowledge: Actualizar FAQ o Manual
   - Si es Market Data: Agregar sección específica
   - Si es nueva categoría: Considerar nuevo agent

### B. Formato de FAQ Mejorado

```markdown
# FAQ Mudafy - Actualizado 2025-02

## Fénix CRM

### ¿Cómo funciona el CRM Fénix?
Fénix es el CRM de Mudafy que te permite gestionar propiedades, leads y clientes desde un solo lugar.

**Funcionalidades principales:**
- Gestión de propiedades
- Captura automática de leads
- Seguimiento de clientes
- Calendario integrado
- Reportes y analytics

**Cómo empezar:**
1. Ingresá a portal.mudafy.com
2. Navegá a "CRM Fénix"
3. Seguí el tutorial interactivo

### ¿Cómo exportar leads del CRM?
...
```

**Subir al Vector Store:**
```bash
# Actualizar el Knowledge Agent con nuevo FAQ
# (script similar a update-market-data.ts pero para Knowledge)
```

---

## 5️⃣ **Mejora de la Clasificación Local**

### A. Agregar Keywords Manualmente

Si ves que ciertas queries van mal ruteadas:

```typescript
// En classifier.service.ts

baseKeywords.set('market_data', [
  // ... existentes

  // AGREGAR basado en logs:
  'nuñez',           // ← Si usuarios preguntan mucho por Núñez
  'villa urquiza',   // ← Nueva zona frecuente
  'expensas',        // ← Ya está, pero reforzar
])
```

### B. Ajustar Umbrales de Confianza

Si el fast-path es muy agresivo (errores frecuentes):

```typescript
// En classifier.service.ts
private calculateConfidence(...) {
  // Más conservador:
  if (score >= 4 && ratio > 0.35) return 'high'  // antes: 3 y 0.30
  if (score >= 3 && ratio > 0.20) return 'medium' // antes: 2 y 0.15
  return 'low'
}
```

Si es muy tímido (demasiado Orchestrator):

```typescript
// Más agresivo:
if (score >= 2 && ratio > 0.25) return 'high'
if (score >= 1 && ratio > 0.10) return 'medium'
```

---

## 6️⃣ **Análisis de Conversaciones**

### Dashboard Semanal

Crea un resumen cada viernes:

```markdown
## Semana del 27 Ene - 2 Feb 2025

### Métricas Generales
- Total mensajes: 456
- Usuarios activos: 23
- Tiempo respuesta promedio: 2.8s (↓ 15% vs semana anterior)
- Cache hit rate: 32% (↑ 8% vs semana anterior)

### Por Agent
- Knowledge: 245 queries (54%)
- Market Data: 156 queries (34%)
- Conversation: 55 queries (12%)

### Top 5 Preguntas
1. "Cuánto vale en Palermo?" (18x)
2. "Cómo publicar propiedad?" (12x)
3. "Qué es Mudafy?" (9x)
4. "Tendencias mercado" (8x)
5. "Cómo captar leads?" (7x)

### Acciones
- ✅ Agregar FAQ "Cómo publicar propiedad" al Knowledge Agent
- ⏳ Actualizar datos de Palermo (mes nuevo)
- 📝 Considerar agent especializado en "Captación de Leads"
```

---

## 7️⃣ **Testing Continuo**

### A. Query Test Suite

Crea un archivo con queries de prueba:

```json
// test-queries.json
[
  {
    "query": "Cuánto vale un depto en Palermo?",
    "expected_route": "market_data",
    "expected_keywords": ["precio", "palermo"]
  },
  {
    "query": "Cómo crear un aviso en Fénix?",
    "expected_route": "mudafy_info",
    "expected_keywords": ["fenix", "crear"]
  }
]
```

**Script de testing:**

```typescript
// scripts/test-classification.ts
for (const test of testQueries) {
  const result = await classifierService.classify(test.query)

  if (result.route !== test.expected_route) {
    console.error(`❌ FALLO: "${test.query}"`)
    console.error(`   Esperado: ${test.expected_route}`)
    console.error(`   Obtenido: ${result.route}`)
  } else {
    console.log(`✅ PASS: "${test.query}" → ${result.route}`)
  }
}
```

**Ejecutar semanalmente** para detectar regresiones.

---

## 8️⃣ **Actualización de Datos**

### Calendario de Actualizaciones

| Frecuencia | Qué actualizar | Cómo |
|------------|----------------|------|
| **Mensual** | Market Data | `npm run update-market-data` |
| **Trimestral** | FAQ / Manual | Actualizar PDF y re-subir al Vector Store |
| **Semestral** | Prompts de Agents | Revisar y optimizar instrucciones |
| **Anual** | Arquitectura | Evaluar si agregar/quitar agents |

---

## 9️⃣ **Comunidad de Usuarios**

### Grupo de Beta Testers

**Idea:** Selecciona 5-10 asesores "power users"

**Les pides:**
- Feedback honesto semanal
- Reportar bugs o respuestas incorrectas
- Sugerir nuevas features

**Les das:**
- Acceso early a nuevas features
- Reconocimiento ("Thanks to beta testers")
- Input en roadmap del producto

---

## 🔟 **Machine Learning Avanzado (Futuro)**

### Fine-Tuning de Modelos

Cuando tengas 500+ conversaciones con feedback:

```python
# Preparar dataset de training
conversations = [
  {
    "messages": [
      {"role": "user", "content": "Cuánto vale en Palermo?"},
      {"role": "assistant", "content": "Según datos de Enero 2025..."}
    ],
    "rating": "good"
  }
]

# Fine-tune modelo custom
openai.FineTuningJob.create(
  training_file=training_file_id,
  model="gpt-4o-mini"
)
```

**Ventaja:** Modelo específico para tu dominio
**Cuando:** Después de 6 meses con >500 conversaciones

---

## 📊 KPIs a Trackear

### Métricas de Performance

| Métrica | Objetivo | Actual | Trend |
|---------|----------|--------|-------|
| Tiempo respuesta P95 | <3s | 2.8s | ↓ |
| Cache hit rate | >30% | 32% | ↑ |
| Fast path rate | >75% | 78% | → |
| Keywords aprendidas | +10/semana | +12/semana | ↑ |

### Métricas de Calidad

| Métrica | Objetivo | Cómo medir |
|---------|----------|------------|
| Satisfacción | >85% | Feedback 👍👎 |
| Queries resueltas | >90% | Sin follow-up "no entendí" |
| Errores | <5% | Logs de errores |

### Métricas de Negocio

| Métrica | Objetivo | Impacto |
|---------|----------|---------|
| Tiempo ahorrado por asesor | 2h/semana | ↑ Productividad |
| Queries por día | 50+ | ↑ Adopción |
| Usuarios activos | 80% de asesores | ↑ Engagement |

---

## 🛠️ Herramientas Recomendadas

### 1. Notion / Airtable
- Dashboard de métricas semanales
- Backlog de mejoras
- Registro de cambios de prompts

### 2. Google Sheets
- Exportar feedbacks
- Análisis de tendencias
- Gráficos de evolución

### 3. Slack/Discord (interno)
- Canal #bot-feedback
- Alertas automáticas de errores
- Discusiones sobre mejoras

### 4. GitHub Issues
- Trackear bugs
- Feature requests
- Roadmap público

---

## 🎯 Plan de Acción Semanal

### Lunes
- Revisar métricas de la semana anterior
- Identificar top 3 problemas

### Miércoles
- Implementar mejora #1
- Testear localmente

### Viernes
- Deploy a producción
- Documentar cambio
- Preparar dashboard semanal

---

## 🔮 Roadmap de Mejora (6 meses)

### Mes 1-2: Fundación
- ✅ Sistema de aprendizaje automático funcionando
- ✅ Logs estructurados
- ⏳ Sistema de feedback básico (👍👎)
- ⏳ Dashboard semanal de métricas

### Mes 3-4: Optimización
- Prompts optimizados por agent
- 100+ keywords aprendidas
- Cache hit rate >35%
- Test suite automatizado

### Mes 5-6: Escalamiento
- Fine-tuning de modelo custom (si es necesario)
- Agents adicionales según demanda
- Analytics avanzados
- A/B testing de features

---

## 💡 Mejores Prácticas

### 1. Itera Gradualmente
No cambies todo a la vez. Prueba 1 mejora por semana.

### 2. Mide Antes y Después
Siempre toma métricas antes de hacer cambios.

### 3. Escucha a los Usuarios
El mejor feedback viene de los asesores que lo usan daily.

### 4. Documenta Todo
Cada cambio de prompt, cada nueva keyword, cada bug fixed.

### 5. Celebra Pequeñas Victorias
- Keywords aprendidas +5 → 🎉
- Cache hit rate subió 10% → 🎉
- Primer feedback positivo → 🎉

---

## 🚀 Quick Wins (Implementar Esta Semana)

1. **Agregar comando `/feedback`**
   ```
   User: /feedback
   Bot: "¿Fue útil mi última respuesta? Respondé 👍 o 👎"
   ```

2. **Export semanal de stats**
   ```bash
   # Cada viernes
   npm run export-stats > stats_$(date +%Y-%m-%d).json
   ```

3. **Top 10 queries del mes**
   ```bash
   grep "📨 MENSAJE RECIBIDO" logs.txt | \
   awk -F'Mensaje: ' '{print $2}' | \
   sort | uniq -c | sort -rn | head -10
   ```

4. **Alertas automáticas**
   ```typescript
   // Si tiempo respuesta > 5s → notificar
   // Si errores > 5% → notificar
   // Si cache hit rate < 20% → notificar
   ```

---

**Última actualización:** 2025-01-30
**Versión:** 1.0.0
**Autor:** Lucas Diaz + Claude Code

🧠 El bot que aprende es el bot que mejora. ¡Éxito!
