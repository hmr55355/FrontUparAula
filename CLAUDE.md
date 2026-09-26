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
  `utils/attendanceHelpers.ts`, que devuelven variables CSS definidas en
  `index.css` para claro y oscuro. Nunca hexadecimales sueltos en las pantallas.
- **Fechas**: usa `localDateString()` de `utils/dateHelpers.ts`. `toISOString()`
  da la fecha en UTC y en Colombia (UTC-5) corre un día después de las 7 p. m.
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
