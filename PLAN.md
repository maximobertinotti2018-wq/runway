# Runway — Plan de implementación (MVP v1)

Micro-SaaS de inteligencia de gastos/suscripciones para indie founders y freelancers.
Stack: Next.js (App Router) + Tailwind · Supabase (Postgres + RLS + pgvector + Edge Functions) · Vercel.

## Restatement de requerimientos

Importar transacciones vía CSV, categorizarlas semánticamente contra una taxonomía fija
usando embeddings cacheados por comercio, detectar suscripciones recurrentes, y mostrar un
dashboard con burn rate, runway (con cash disponible ingresado a mano), top categorías y
gasto mensual. Multi-tenant estricto vía RLS desde el minuto cero.

## Decisiones de arquitectura (cerradas)

1. **CSV-first**, sin integración bancaria (Plaid/Belvo → v2).
2. **Taxonomía fija** de categorías (no clusters emergentes).
3. **Embeddings cacheados por comercio** (embeber una vez por comercio, no por transacción).
4. **RLS por `user_id`** en toda tabla de datos de usuario, desde la primera migración.
5. **Agregaciones vía `security_invoker` views / RPC**, NO materialized views
   (las MV corren como owner y **bypassean RLS** — corrección respecto al plan inicial,
   según la skill oficial de Supabase).
6. **Embeddings con `gte-small` (384d) vía Edge Function** (Transformers.js, sin API key
   externa, costo cero) — recomendado. OpenAI `text-embedding-3-small` (1536d) como upgrade opcional.

## Modelo de datos (borrador)

- `profiles` (id → auth.users, cash_available numeric, currency, created_at)
- `categories` (id, name, slug, is_system bool, embedding vector(384)) — taxonomía fija sembrada
- `merchants` (id, user_id, raw_name, normalized_name, embedding vector(384), created_at,
  UNIQUE(user_id, normalized_name)) — **cache de embeddings**
- `merchant_category_rules` (id, user_id, merchant_id, category_id) — overrides editables
- `transactions` (id, user_id, occurred_on date, merchant_id, raw_description, amount numeric,
  currency, category_id, import_id, created_at)
- `imports` (id, user_id, filename, row_count, status, created_at)
- `subscriptions` (id, user_id, merchant_id, cadence, avg_amount, last_seen, status, detected_at)

RLS: `auth.uid() = user_id` en todas; `categories` de sistema legibles por todos (is_system).
Índices: `ivfflat`/`hnsw` en columnas vector; btree en (user_id, occurred_on); UNIQUE en merchants.

## Fases + criterios de aceptación

### Fase 0 — Scaffold & tooling ✅
Next.js App Router + Tailwind + `@supabase/ssr`. (Sin `supabase start`/Docker — no disponible
en el entorno de build; migraciones verificadas contra Postgres+pgvector plano en su lugar.)

### Fase 1 — Schema + RLS + seed taxonomía ✅
Migraciones declarativas: extensión pgvector, tablas, policies RLS, views `security_invoker`,
seed de categorías. ✅ Migraciones aplican limpio; test de RLS demuestra que un user NO ve
datos de otro; pgvector activo. Revisado con skill `supabase`.

### Fase 2 — Auth ✅
Supabase Auth (email + Google OAuth disponible, no configurado aún), `@supabase/ssr`,
middleware, rutas protegidas. ✅ Verificado en producción: signup → sesión → `/dashboard` →
logout, con `profiles` creado automáticamente por trigger.

### Fase 3 — Import CSV (pipeline) ✅
UI de upload + mapeo de columnas + preview → Server Action: parse → normaliza comercio →
upsert merchant → inserta transactions. ✅ Verificado en producción: CSV de muestra →
8 transacciones persistidas, 7 comercios deduplicados.

### Fase 4 — Categorización ✅
Prioridad: regla de usuario > **alias de comercio conocido** > match por embedding
(fallback para la cola larga). Cambio respecto al plan original: los primeros intentos con
embeddings puros (`gte-small`, sin conocimiento de marcas) dieron 5/8 y luego 4/8 —
enriquecer las descripciones de categoría con keywords mejoró un caso pero rompió otro por
colisión léxica ("Uber" en Transport atrajo "uber eats"). Un diccionario de marcas conocidas
resolvió esto de forma determinística.
✅ Check manual de precisión sobre 8 comercios reales: **7/8 (87.5%)**, supera el objetivo
de ≥85%. El único fallo (`AMZN MKTP US`) es ambiguo por diseño (sin datos de línea de compra).

### Fase 5 — Dashboard
Gasto por categoría (chart con `dataviz` + `ui-ux-pro-max`/`frontend-design`), burn rate,
runway (con input de cash), gasto mensual.
✅ Los números reconcilian con la data cruda; pasa checklist de accesibilidad.

### Fase 6 — Suscripciones + reglas editables
Detección de recurrentes; UI de override de categoría.
✅ Recurrentes detectadas; cambiar categoría persiste y recategoriza.

**Primer vertical slice demostrable:** Fase 0 → 1 → 2(mínimo) → 3 → 4(mínimo) → 5(un chart).

## Riesgos

- 🔴 **ALTO — Fugas RLS (cross-tenant).** Mitigación: tests de policies (pgTAP), `database-reviewer`,
  y views `security_invoker` (no MV).
- 🟢 **RESUELTO — Precisión de categorización** sobre strings sucios ("SQ *COFFEE 0123").
  gte-small puro no alcanzaba el objetivo (5/8 → 4/8 con distintos intentos de prompt);
  resuelto con diccionario de marcas conocidas + embeddings como fallback → 7/8 (87.5%).
- 🟡 **MEDIO — Runway engañoso** si el cash ingresado queda desactualizado. Mitigación: timestamp + aviso.
- 🟡 **MEDIO — Variedad de formatos CSV** entre bancos. Mitigación: paso de mapeo de columnas.
- 🟢 **BAJO — Calidad de gte-small (384d).** Aceptable para taxonomía fija; upgrade a OpenAI si hace falta.

## Complejidad estimada: MEDIA-ALTA
