# UparAula — Frontend (React)

Frontend de **UparAula**, desarrollado por UparTechnology. Este directorio (`FrontUparAula/`) contiene la SPA en React 18 + Vite + TypeScript, consumida contra la API en `backUparAula/`.

> Estado: **Fase 1 — Esqueleto completo.** Landing pública, autenticación, onboarding de institución (crear/unirse/aceptar invitación), dashboard con selector de curso activo, perfil, panel de administración de institución (docentes/grupos/materias) y navegación completa con páginas "en construcción" para los módulos que llegan en fases siguientes (planilla, asistencia, comportamiento, citaciones, tareas, bitácora, copias, reportes).

## Instalación en desarrollo local

```bash
cd FrontUparAula
npm install
cp .env.example .env
```

`.env`:

```
VITE_API_URL=http://localhost:8000/api
```

```bash
npm run dev
```

La app queda disponible en `http://localhost:5173`. Necesita el backend (`backUparAula/`) corriendo en `http://localhost:8000` — revisa su README para levantarlo y sembrar los datos demo.

### Cuenta demo

Inicia sesión con `hernis@uparaula.com` / `password` (creada por el seeder del backend) para ver el dashboard con cursos, grupos y materias ya cargados.

## Build de producción

```bash
npm run build
# sirve dist/ con Nginx, try_files $uri /index.html
```

## Stack

React 18 + Vite + TypeScript · Tailwind CSS 3 · shadcn/ui (Radix + CVA) · Zustand · TanStack Query · Axios · React Hook Form + Zod · React Router v6 · Sonner · Lucide React · vite-plugin-pwa
