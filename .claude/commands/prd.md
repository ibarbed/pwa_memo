---
name: prd
description: Crear un PRD (Product Requirements Document) para un feature (Principio de Fuente Única de Verdad)
arguments:
  - name: feature
    description: ID del feature (timestamp, ej. 2025-12-19-143052)
    required: true
---

# Crear PRD

Genera un documento PRD estructurado a partir de la descripción del feature siguiendo el **Principio de Fuente Única de Verdad**. Este PRD será usado por `/tasks` para generar las historias de usuario.

## Variables
feature_id: $ARGUMENTS    # OBLIGATORIO - ID del feature

## Principio: Fuente Única de Verdad

Cada PRD debe cumplir:

| Aspecto | Requisito |
|---------|-----------|
| **Único** | No duplicar requisitos de otros PRDs existentes |
| **Completo** | Toda la información del feature en un solo lugar |
| **Trazable** | Cada requisito con ID único para referenciar |
| **Verificable** | Requisitos específicos que se pueden probar |
| **Delimitado** | Alcance claro de qué incluye y qué excluye |

### Detección de Violaciones

**CRÍTICO**: Al analizar PRDs existentes, detectar activamente:

1. **Requisitos Duplicados**: Mismo requisito en múltiples PRDs
2. **Scope Overlap**: Funcionalidades que se solapan con otros features
3. **Dependencias Ocultas**: Requisitos que dependen de otros PRDs sin documentar
4. **Conflictos**: Requisitos que contradicen otros PRDs

**Si se encuentran violaciones, el PRD DEBE documentarlas y proponer resolución.**

## Instrucciones

### Fase 1: Localizar y Validar el Feature

**CRÍTICO**: Antes de crear el PRD, verificar:

1. Buscar en `features/{feature_id}/`
2. Verificar que existe `feature.json`
3. Si no existe, mostrar error y sugerir `/feature` primero
4. Cargar `feature.json` y extraer `title` y `description`

### Fase 2: Análisis de PRDs Existentes (OBLIGATORIO)

**Buscar PRDs que puedan solaparse:**

1. Listar todos los `features/*/prd.md` existentes
2. Para cada PRD, extraer:
   - Requisitos funcionales (RF-XX)
   - Alcance (incluido/excluido)
   - Flujos de usuario

**Crear matriz de solapamiento:**
```
| Aspecto | Este PRD | PRD Existente | Conflicto? |
|---------|----------|---------------|------------|
| Login flow | RF-01 | feature-abc/RF-03 | REVISAR |
| User model | RF-02 | feature-xyz/RF-01 | NO |
```

**Si se encuentra solapamiento:**
- Documentar en sección "Dependencias"
- Referenciar en vez de duplicar
- Proponer resolución si hay conflicto

### Fase 3: Investigar el Proyecto

Buscar en el codebase para entender el contexto:

1. **Leer `CLAUDE.md`**: Convenciones del proyecto
2. **Revisar estructura**: Modelos, controladores, vistas existentes
3. **Identificar patrones**: Cómo se implementan features similares
4. **Detectar constraints**: Limitaciones técnicas o de negocio

### Fase 4: Generar el PRD

Escribir el PRD en `features/{feature_id}/prd.md`

Usar el siguiente formato, reemplazando todos los placeholders con contenido real:

## Formato del PRD

```markdown
# {Título del Feature}

## Metadata
feature_id: `{feature_id}`
created_at: `{timestamp}`
status: `prd_created`

## Análisis de PRDs Existentes

### PRDs Revisados
<Lista de PRDs existentes que se revisaron>

### Matriz de Solapamiento

| Aspecto | Este PRD | PRD Existente | Conflicto? |
|---------|----------|---------------|------------|
| <aspecto 1> | <RF-XX> | <feature/RF-XX> | SÍ/NO |
| <aspecto 2> | <RF-XX> | <feature/RF-XX> | SÍ/NO |

**Solapamientos Encontrados**: <count> (Si > 0, documentar resolución)

### Resolución de Solapamientos
<Si hay solapamientos, cómo se resuelven:
- Referenciar PRD existente en vez de duplicar
- Extender funcionalidad existente
- Coordinar con otro feature>

## Resumen
{Descripción clara de qué es este feature y por qué es valioso para los usuarios}

## Problema
{Describe el problema específico que este feature resuelve}

## Usuarios
{Quién usará esta funcionalidad y cómo les beneficia}

## Alcance

### Incluido
- {Funcionalidad 1 que SÍ se implementará}
- {Funcionalidad 2 que SÍ se implementará}
- {Funcionalidad 3 que SÍ se implementará}

### Excluido (por ahora)
- {Funcionalidad futura 1}
- {Funcionalidad futura 2}

## Requisitos

### Funcionales
- **RF-01**: {Requisito funcional 1}
- **RF-02**: {Requisito funcional 2}
- **RF-03**: {Requisito funcional 3}

### No Funcionales
- **RNF-01 Rendimiento**: {Requisitos de velocidad/capacidad}
- **RNF-02 Seguridad**: {Requisitos de seguridad}
- **RNF-03 Usabilidad**: {Requisitos de facilidad de uso}

## Flujo de Usuario
1. El usuario {acción 1}
2. El sistema {respuesta 1}
3. El usuario {acción 2}
4. El sistema {respuesta 2}
5. Resultado: {estado final}

## Dependencias

### Con Otros Features
<Lista de features relacionados y cómo interactúan>
- Feature X: {relación}
- Feature Y: {relación}

### Técnicas
- {Librerías o recursos necesarios}
- {APIs externas}
- {Modelos existentes a usar}

## Notas
{Cualquier consideración adicional, riesgos, o decisiones pendientes}
```

### Fase 5: Actualizar Estado del Feature

1. Cargar `features/{feature_id}/feature.json`
2. Cambiar `status` a `"prd_created"`
3. Cambiar `current_phase` a `"prd"`
4. Actualizar `updated_at`
5. Guardar el archivo

### Fase 6: Validar el PRD Creado

Ejecutar validaciones:

```bash
# Verificar que el PRD existe
test -f features/{feature_id}/prd.md

# Verificar secciones obligatorias
grep -q "## Metadata" features/{feature_id}/prd.md
grep -q "## Requisitos" features/{feature_id}/prd.md
grep -q "### Funcionales" features/{feature_id}/prd.md
grep -q "## Alcance" features/{feature_id}/prd.md

# Verificar que hay al menos un requisito funcional
grep -c "RF-[0-9]" features/{feature_id}/prd.md

# Verificar referencias a otros PRDs si hay solapamiento
grep -l "{feature_id}" features/*/prd.md
```

## Report

- IMPORTANTE: Retornar exclusivamente el path del PRD creado:
  `features/{feature_id}/prd.md`

Y mostrar:
```
PRD creado exitosamente!

Feature: {título}
Archivo: features/{feature_id}/prd.md

Resumen del PRD:
- {N} requisitos funcionales identificados
- {M} requisitos no funcionales
- Alcance definido con {P} funcionalidades incluidas
- {S} solapamientos detectados con otros PRDs

Siguiente paso:
/tasks {feature_id}
```

## Consideraciones

- El PRD debe ser comprensible para personas no técnicas
- Usar lenguaje claro y evitar jerga técnica innecesaria
- Los requisitos deben ser específicos y verificables
- El alcance debe ser realista y bien delimitado
- NO duplicar requisitos de otros PRDs - referenciar en su lugar
- Documentar todas las dependencias con otros features
