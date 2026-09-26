# UparAula — Frontend (React 18 + Vite + TypeScript)

Interfaz de la app de gestión escolar. La API vive en otro repositorio:
`UparAulaBack` (Laravel 11), en `http://localhost:8000/api` durante desarrollo.

El historial detallado del proyecto (fases, bugs reales y sus causas, decisiones
tomadas con el usuario) está en el repo del backend, en `docs/contexto-claude.md`.

## Comandos

```bash
npm run dev      # http://localhost:5173 — el backend solo acepta CORS desde ese puerto
npx tsc -b       # chequeo de tipos
npm run build    # compila a dist/ con .env.production (URL de producción)
```

Si el puerto 5173 está ocupado, Vite salta al 5174 y el login falla por CORS.
Libera el puerto en vez de cambiar la configuración.

## Convenciones

- **Tailwind 3** con primitivas de shadcn/ui escritas a mano en `components/ui/`.
  No hay CLI de shadcn: los componentes nuevos se escriben siguiendo los existentes.
- **Estado**: Zustand para sesión, tema, curso activo y vista (admin/docente);
  TanStack Query para todo lo que venga del servidor.
- **Claves de caché**: dos consultas con la misma clave deben devolver **la misma
  forma**. La caché se indexa por clave, no por función; mezclarlas ya rompió una
  pantalla en producción (`['institutions', id, 'teachers', 1]`).
- **Colores de notas y asistencia**: siempre por `utils/gradeHelpers.ts` y
  `utils/attendanceHelpers.ts`. Las notas toman el color del nivel de la escala de
  la institución (`levelColors` mezcla ese color con variables del tema para claro
  y oscuro). Nunca hexadecimales sueltos en las pantallas; los de la escala son
  datos que elige la institución.
- **Fechas**: usa `localDateString()` de `utils/dateHelpers.ts`. `toISOString()`
  da la fecha en UTC y en Colombia (UTC-5) corre un día después de las 7 p. m.
- **Jornada activa**: `useActiveShift()` (jornadas del docente = las de los
  grupos de sus cursos; por defecto la del día y la hora según su horario).
  El selector de cursos solo lista la jornada activa. `useEnsureActiveCourse`
  sincroniza curso ↔ jornada en un solo efecto: si cambió el curso, la jornada
  lo sigue; si cambió la jornada, el curso pasa a uno de ella.
- **Vistas separadas**: `navItemsFor(rol)` decide el menú; `TeacherViewGuard` y
  `RoleGuard` bloquean las rutas de la otra vista incluso entrando por URL.
  Los monitores tienen su propia app en `/monitor` (`MonitorLayout`), sin nada
  del docente.
- **Diálogos por curso**: van con `key` que incluya curso y período, o conservan
  el borrador del curso anterior al cambiar de curso.

## Trampas conocidas

- Un `<input>` dentro de una tabla con `table-layout: auto` ensancha su columna;
  la única solución que funcionó fue fijar el ancho en el `<td>` (ver
  `GradeSheetTable.tsx`). Pruébalo en pantallas anchas o no se reproduce.
- `flex-wrap` sobre un componente con alto fijo (como `TabsList`) necesita
  `h-auto` o la segunda fila se monta sobre el contenido.
- Un enlace en el menú no garantiza que la ruta exista, y un endpoint en el
  backend no garantiza que haya pantalla: ambos casos ya aparecieron.
- `tsc -b` y `npm run build` en verde no prueban que la pantalla funcione:
  las reglas de hooks y los errores de render solo salen abriéndola.

## Producción

Frontend en `https://uparaula.upartechnology.com` (Apache/cPanel). `npm run build`
usa `.env.production` para apuntar a la API real; `public/.htaccess` se copia solo
a `dist/` y resuelve las rutas del router. Se sube el contenido de `dist/`.

## Plan de trabajo único: lo que la base guarda y la app no deja crear ni editar

Auditoría del 2026-09-25, en tres capas (repetibles):
1. Rutas: `php artisan route:list --path=api --json` contra las llamadas
   `api.get/post/put/patch/delete` de `src/` (ojo: `api` + salto de línea + `.get`).
2. Servicios: funciones de `services/api/*` que ninguna pantalla llama
   (así aparecieron editar/eliminar tareas y copias, que tenían servicio pero no botón).
3. Columnas: cada columna de la base (`information_schema`) contra lo que valida el
   backend y lo que envían los formularios. Buscar solo el nombre del campo en el
   frontend no sirve: los tipos y las pantallas que solo muestran también lo contienen
   (así se escapó el color de las materias).

Se marca `[x]` al terminar. **F** = solo frontend. **B+F** = falta también el backend.

### Fase 1 — lo que más se usa en el aula (F) — hecha 2026-09-25
- [x] 1.1 Editar y eliminar **tareas** (`homeworksApi.update/remove`, sin botón). Incluir `notes` (el backend lo acepta).
- [x] 1.2 Editar y eliminar **anotaciones de comportamiento** (`PUT/DELETE /behavior/{id}`); botón "Acudiente contactado" (`behaviorApi.markContacted`, sin uso) y marcarlo solo al crear la citación de seguimiento.
- [x] 1.3 Reprogramar (fecha, lugar, motivo, tipo, acudiente) y eliminar **citaciones** (`PUT/DELETE /citations/{id}`).
- [x] 1.4 Editar **acudientes** (`PUT /parents/{id}`) en el perfil del estudiante.
- [x] 1.5 Editar y eliminar **cobros de copias** (`copyChargesApi.update/remove`, sin botón).
- [x] 1.6 Planilla: en "Configurar planilla" faltan la **nota máxima**, la **fecha** y la **descripción** de cada columna, y la **etiqueta de la definitiva** de la sección (`section_final_label`). Todo lo acepta `bulk-save`.
- [x] 1.7 **Copiar la configuración desde otro período** (`gradeSectionsApi.copyFromPeriod`, sin botón).
- [x] 1.8 Peso **automático** al crear una tarea que genera nota (`weight_mode: automatic` reparte la sección por igual y recalcula).
- [x] 1.9 **Escala de valoración institucional** (Admin → Institución → Escala de valoración): niveles con rango, equivalencia nacional (Decreto 1290/2009 art. 5 = Decreto 1075/2015 art. 2.3.3.3.3.5) y color. Colorea la planilla (`getGradeColor` → `performanceLevelFor`/`levelColors`, escala fijada en `AppLayout` con `setGradeScale`), los reportes y el boletín, que ahora muestra el desempeño en la escala nacional. La nota mínima para aprobar sale de la escala.

Al hacer la Fase 1 aparecieron (y se arreglaron) problemas del backend que la
auditoría no veía: borrar una tarea con nota no recalculaba las definitivas;
`bulk-save` devolvía todas las columnas a nota máxima 10 en cada guardado (y
borraba fecha/descripción; `section_final_label` ni se guardaba); cualquier
colega podía editar o borrar anotaciones y citaciones ajenas (ahora solo el autor
o un admin); cambiar el total de un cobro no reevaluaba quién había pagado; y la
hora de las citaciones se mostraba 5 horas antes (el backend está en UTC: usar
`formatWallClock`/`wallClockInputValue` de `utils/dateHelpers.ts` para fechas con
hora escritas por el docente).

### Fase 2 — administración (F)
- [ ] 2.1 **Períodos**: cambiar nombre y fechas, y **cerrar/reabrir** (`periodsApi.update`, sin uso). Con el período cerrado, la planilla queda en solo lectura con un aviso (el backend ya responde 422).
- [ ] 2.2 **Datos de la institución**: nombre, NIT, rector, ciudad y departamento (`PUT /institutions/{id}`). La escala y la nota mínima ya no van aquí: están en la escala de valoración (1.9).
- [ ] 2.3 **Rol de un docente** (admin ↔ docente) (`PATCH …/teachers/{userId}/role`). Revisar que no se pueda quitar el último admin.
- [ ] 2.4 **Renombrar grados** y cambiar su número (`PUT /grade-levels/{id}`); reutilizar `InlineNameEdit`.
- [ ] 2.5 Renombrar y eliminar **plantillas** de planilla (`PUT/DELETE /grade-templates/{id}`).
- [ ] 2.6 **Foto de perfil** del usuario (`avatar` en `PUT /auth/profile`; el backend la acepta, Perfil no la pide).

### Fase 3 — estudiantes y matrícula (B+F). Hoy los estudiantes solo entran por Excel
- [ ] 3.1 **Crear y editar un estudiante** a mano: no hay endpoint. Columnas sin uso en `students`: `birthdate`, `gender`, `address`, `phone`, `photo`, `is_active`. El importador solo llena nombres, documento y correo.
- [ ] 3.2 **Retirar o trasladar** a un estudiante de grupo: `student_groups.status`, `withdrawal_date` y `withdrawal_reason` existen sin endpoint (el observer de `student_count` ya reacciona).
- [ ] 3.3 **Acudientes**: `document_number`, `address`, `occupation` e `is_primary_contact` existen en la base, pero el backend no los acepta.
- [ ] 3.4 **Año escolar**: no hay endpoint para editar fechas ni para cambiar el año activo (solo se crea).

### Fase 4 — seguridad de datos (B)
- [ ] 4.1 **`DELETE /groups/{id}` sin protección**: borra en cascada, sin papelera, cursos, matrículas, notas, anotaciones, citaciones, observaciones y copias. Negarse (422) si el grupo tiene estudiantes o cursos, y agregar la prueba. Recién ahí, poner el botón "Eliminar grupo" con confirmación.

### Fase 5 — decidir con el usuario (columnas o rutas sin uso)
- [ ] 5.1 `grades.is_excused`/`excused_reason`: el backend lo acepta, pero se solapa con las convenciones "sin nota".
- [ ] 5.2 Notas de voz en comportamiento, observaciones y citaciones (el backend las soporta; hoy solo están en la bitácora).
- [ ] 5.3 `period_finals.is_promoted`: nadie lo calcula; hoy siempre es null (el boletín ya no lo usa: muestra el nivel de la escala).
- [ ] 5.4 Tabla `documents`: modelo sin controlador ni rutas (adjuntos). Construirla o eliminarla.
- [ ] 5.5 `parent_citations.attachments_note`, `attendance_records.notes`, `class_schedules.is_active`: columnas que el backend nunca escribe (`notification_date` sí: se llena al marcar "notificado").
- [ ] 5.6 `sort_order` de grados y jornadas: no hay forma de reordenarlos.
- [ ] 5.7 `GET /schedule/today`: nadie lo usa.

**No son huecos**: CRUD suelto de `grade-sections`/`grade-columns` y sus `reorder`
(pasan por `bulk-save`); `GET/PUT /grades/{id}`, `/grades/student/{id}`,
`section-finals`, `period-finals` (vienen en `GET /grades`); `PUT /attendance/{id}`
(lo cubre `attendance/bulk`); `POST/PUT /group-subjects` (lo cubren `assign-course`
y `unassign-course`); `copyChargesApi.updatePayment` (lo cubre `bulkPayments`).

**Cómo cerrar cada fase**: pruebas de backend si se tocó, `npx tsc -b`, `npm run lint`
y una pasada con Playwright sobre la base local **sin borrar datos del usuario**
(la base local tiene datos reales: restaurar exactamente lo que se cambie).
