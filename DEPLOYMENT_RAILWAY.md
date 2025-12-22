# Despliegue en Railway (guía rápida)

Esta guía explica los pasos mínimos para desplegar el backend y frontend en Railway. Está pensada para un despliegue `production` simple.

---

## 1) Preparar servicios en Railway

- Crea un proyecto en Railway.
- Añade un servicio PostgreSQL (Railway plugin) y copia la `DATABASE_URL` proporcionada.

---

## 2) Variables de entorno necesarias

### Backend (Service)
Configura estas variables en la sección _Variables_ del servicio backend:

- `DATABASE_URL` = (string) conexión PostgreSQL proporcionada por Railway
- `JWT_SECRET` = (string) secreto fuerte para firmar JWT
- `JWT_REFRESH_SECRET` = (string) secreto fuerte para refresh tokens
- `FRONTEND_URL` = URL pública del frontend (ej: `https://<tu-frontend>.up.railway.app`)
- `NODE_ENV` = `production` (opcional)
- `PORT` = (opcional, Railway asigna un puerto por defecto)

> Nota: No usar los valores de ejemplo que vienen en `.env.example` en producción.

### Frontend (Static Site o Service)
- `VITE_BACKEND_URL` = `https://<tu-backend>.up.railway.app` (incluye protocolo, sin barra final)

---

## 3) Comandos de build y start

### Backend
- Build command: `npm run build`
  - (El `build` ahora ejecuta `prisma generate && tsc` para asegurarse de que el cliente Prisma se genere durante la build.)
- Start command: `npm run start`

### Frontend (Static Site)
- Build command: `npm run build`
- Publish directory: `dist`

---

## 4) Migraciones de base de datos (prisma)

En producción, ejecutar migraciones una vez provisionada la DB:

- Desde la CLI local o desde el dashboard de Railway, ejecutar:

```bash
# En la carpeta backend
npx prisma migrate deploy --preview-feature
```

Si prefieres no ejecutar migraciones automáticamente, puedes usar `prisma db push` para aplicar el schema sin generar migraciones estructuradas.

---

## 5) Comprobaciones post-deploy

- API Health: `GET https://<tu-backend>/api/health` debe responder `{ status: 'ok', timestamp: '...' }`.
- Probar login, refresh token y endpoints críticos (crear turno, generar PDF, etc.).
- Verificar CORS: Backend debe permitir `FRONTEND_URL` en la configuración de CORS.

---

## 6) Notas de seguridad y recomendaciones

- Genera secretos fuertes para `JWT_SECRET` y `JWT_REFRESH_SECRET` (ej: 32+ caracteres aleatorios).
- Revisa que `DATABASE_URL` use SSL si tu proveedor lo requiere.
- No subas `.env` con secretos al repositorio. Mantén `.env.example` para referencia.
- Considera habilitar backups automáticos para la base de datos.

---

## 7) Problemas comunes

- `@prisma/client` faltante en producción: asegúrate de que `prisma generate` corra durante la build (ya incluido en `build` del backend).
- CORS bloquea peticiones: revisa que `FRONTEND_URL` esté correctamente configurada en backend.
- Variables de entorno del frontend no disponibles: en Vite, las variables deben empezar con `VITE_` (por ejemplo `VITE_BACKEND_URL`).

---

Si quieres, puedo:
- Ejecutar las migraciones y probar el build en tu entorno local o en Railway (con tus credenciales/configuración),
- O generar una checklist de pasos exactos para copiar/pegar en Railway UI.

Dime cuál prefieres hacer ahora.