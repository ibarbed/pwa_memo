---
name: code
description: Implementar una tarea siguiendo su plan
arguments:
  - name: task
    description: Path de la tarea (ej. features/2025-12-19-143052/tasks/001-crear-comentario)
    required: true
---

# Implementar Tarea

Ejecuta el plan de implementación de una tarea.

## Variables
task_path: $ARGUMENTS

## Instrucciones

1. **Leer el plan**
   - Cargar `{task_path}/plan.md`
   - Si no existe, sugerir `/plan {task_path}` primero

2. **Implementar**
   - Seguir los pasos del plan en orden
   - Ejecutar los comandos de validación del plan
   - Si algo no está claro, preguntar antes de continuar

3. **Actualizar estado**
   - Extraer feature_id del path (segundo segmento)
   - En `features/{feature_id}/feature.json`:
     - Cambiar status de la tarea a `"completed"`
     - Recalcular `progress` del feature
     - Actualizar `updated_at`

## Report

Mostrar:
- Resumen del trabajo en bullet points
- `git diff --stat`
- Progreso del feature: {X}% ({N}/{M} tareas)
- Siguiente paso: `/plan {siguiente_tarea}` o "Feature completado!"
