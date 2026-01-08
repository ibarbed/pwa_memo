---
name: tasks
description: Generar tareas (historias de usuario) a partir del PRD de un feature
arguments:
  - name: feature
    description: ID del feature (timestamp, ej. 2025-12-19-143052)
    required: true
---

# Generar Tareas

Crea tareas (historias de usuario) a partir del PRD del feature siguiendo el **Principio de Independencia**. Estas tareas serán planificadas con `/plan` e implementadas con `/code`.

## Variables
feature_id: $ARGUMENTS    # OBLIGATORIO - ID del feature

## Principio: Independencia de Tareas

Cada tarea debe cumplir:

| Aspecto | Requisito |
|---------|-----------|
| **Independiente** | Puede implementarse sin depender de tareas no completadas |
| **Atómica** | Una sola funcionalidad por tarea |
| **Verificable** | Criterios de aceptación claros y testeables |
| **Estimable** | Tamaño razonable para una sesión de trabajo |
| **Ordenada** | Prioridad clara basada en dependencias y valor |

### Detección de Violaciones

**CRÍTICO**: Al generar tareas, detectar activamente:

1. **Dependencias Circulares**: Tarea A depende de B, B depende de A
2. **Tareas Muy Grandes**: Más de 5 criterios de aceptación
3. **Tareas Duplicadas**: Misma funcionalidad en diferentes tareas
4. **Conflictos con Otros Features**: Tareas que modifican los mismos archivos

**Si se encuentran violaciones, dividir o reorganizar las tareas.**

## Instrucciones

### Fase 1: Localizar y Validar el Feature

**CRÍTICO**: Antes de generar tareas, verificar:

1. Buscar en `features/{feature_id}/`
2. Verificar que existe `feature.json` y `prd.md`
3. Si falta el PRD, mostrar error y sugerir `/prd {feature_id}` primero

### Fase 2: Análisis de Tareas Existentes (OBLIGATORIO)

**Buscar tareas de otros features que puedan conflicturar:**

1. Listar todas las tareas en `features/*/tasks/*/`
2. Identificar tareas con status `defined`, `planned`, `in_progress`
3. Extraer archivos que planean modificar (de sus plan.md si existen)

**Crear matriz de conflictos potenciales:**
```
| Archivo/Recurso | Este Feature | Otro Feature | Conflicto? |
|-----------------|--------------|--------------|------------|
| users_controller.rb | Tarea 001 | feature-abc/002 | REVISAR |
| User model | Tarea 002 | feature-xyz/001 | NO |
```

**Si se encuentran conflictos:**
- Documentar en las notas de la tarea
- Sugerir orden de implementación
- Marcar dependencias explícitas

### Fase 3: Leer y Analizar el PRD

1. Cargar `features/{feature_id}/prd.md`
2. Identificar los requisitos funcionales (RF-XX)
3. Entender el flujo de usuario
4. Identificar dependencias entre funcionalidades
5. Revisar el alcance (incluido vs excluido)

### Fase 4: Crear Carpeta de Tareas

1. Crear `features/{feature_id}/tasks/` si no existe

### Fase 5: Generar Tareas

Aplicar criterios:

1. **Una tarea por requisito funcional principal**
2. **Ordenar por dependencias** (las base primero)
3. **IDs secuenciales**: 001, 002, 003...
4. **Slugs descriptivos**: `crear-comentario`, `responder-comentario`

### Fase 6: Crear Estructura de Cada Tarea

Para cada tarea:

```
features/{feature_id}/tasks/{id}-{slug}/
features/{feature_id}/tasks/{id}-{slug}/user-story.md
```

## Formato de User Story

```markdown
# Tarea {ID}: {Título}

## Metadata
task_id: `{id}`
feature_id: `{feature_id}`
requisito: `RF-{XX}`
created_at: `{timestamp}`
status: `defined`
priority: `{1-4}`

## Análisis de Conflictos

### Tareas Relacionadas
<Lista de tareas de este u otros features que podrían afectar>

### Matriz de Conflictos

| Archivo/Recurso | Esta Tarea | Otra Tarea | Conflicto? |
|-----------------|------------|------------|------------|
| <archivo> | <acción> | <feature/tarea> | SÍ/NO |

**Conflictos Encontrados**: <count> (Si > 0, documentar resolución)

### Dependencias
- **Requiere completar antes**: <lista de tareas o "ninguna">
- **Bloquea a**: <lista de tareas que dependen de esta>

## Historia de Usuario
**Como** {tipo de usuario}
**Quiero** {acción o funcionalidad deseada}
**Para** {beneficio o valor obtenido}

## Criterios de Aceptación
- [ ] {Criterio específico y verificable 1}
- [ ] {Criterio específico y verificable 2}
- [ ] {Criterio específico y verificable 3}
- [ ] {Criterio específico y verificable 4}

## Escenarios

### Escenario 1: {Camino feliz}
- **Dado** {estado inicial}
- **Cuando** {acción del usuario}
- **Entonces** {resultado esperado}

### Escenario 2: {Caso alternativo o error}
- **Dado** {estado inicial}
- **Cuando** {acción que causa situación especial}
- **Entonces** {cómo se maneja}

## Notas
{Contexto adicional, dependencias con otras tareas, consideraciones técnicas}
```

### Fase 7: Actualizar feature.json

1. Cargar `features/{feature_id}/feature.json`
2. Agregar array `tasks` con cada tarea:
   ```json
   {
     "id": "001",
     "slug": "crear-comentario",
     "title": "Crear comentario en artículo",
     "status": "defined",
     "priority": 1,
     "requisito": "RF-01",
     "depends_on": []
   }
   ```
3. Cambiar `status` a `"tasks_created"`
4. Cambiar `current_phase` a `"tasks"`
5. Actualizar `updated_at`
6. Guardar el archivo

### Fase 8: Validar Tareas Creadas

Ejecutar validaciones:

```bash
# Verificar que existe al menos una tarea
ls features/{feature_id}/tasks/*/user-story.md | wc -l

# Verificar que cada user-story tiene las secciones obligatorias
for story in features/{feature_id}/tasks/*/user-story.md; do
  echo "Validando: $story"
  grep -q "## Metadata" "$story" || echo "  FALTA: Metadata"
  grep -q "## Historia de Usuario" "$story" || echo "  FALTA: Historia"
  grep -q "## Criterios de Aceptación" "$story" || echo "  FALTA: Criterios"
  grep -q "## Escenarios" "$story" || echo "  FALTA: Escenarios"
done

# Verificar que no hay dependencias circulares
# (revisar manualmente el campo depends_on en feature.json)

# Verificar tamaño de tareas (máximo 5 criterios por tarea)
for story in features/{feature_id}/tasks/*/user-story.md; do
  count=$(grep -c "^\- \[ \]" "$story")
  if [ "$count" -gt 5 ]; then
    echo "WARNING: $story tiene $count criterios (máximo recomendado: 5)"
  fi
done
```

## Criterios de Priorización

| Prioridad | Descripción | Ejemplo |
|-----------|-------------|---------|
| **1** | Funcionalidad base necesaria para otras tareas | Modelo de datos |
| **2** | Funcionalidad de alto valor para el usuario | CRUD principal |
| **3** | Funcionalidades complementarias o de mejora | Validaciones extra |
| **4** | Funcionalidades opcionales o de bajo impacto | Mejoras de UX |

## Report

- IMPORTANTE: Retornar el resumen de tareas creadas:

```
Tareas generadas exitosamente!

Feature: {título}
Total: {N} tareas creadas

TAREAS:
001 - {título tarea 1} [defined] (RF-01) P1
     Depende de: ninguna
002 - {título tarea 2} [defined] (RF-02) P1
     Depende de: 001
003 - {título tarea 3} [defined] (RF-03) P2
     Depende de: 001, 002

Conflictos detectados: {M}
- {descripción del conflicto si hay}

Siguiente paso:
/plan features/{feature_id}/tasks/001-{slug}
```

## Consideraciones

- Las tareas deben ser independientes cuando sea posible
- Si hay dependencias, la tarea dependiente debe tener prioridad mayor (número mayor)
- Cada tarea debe ser lo suficientemente pequeña para completarse en una sesión
- Los criterios de aceptación deben ser verificables objetivamente
- Documentar conflictos con tareas de otros features
- Máximo 5 criterios de aceptación por tarea (dividir si hay más)
