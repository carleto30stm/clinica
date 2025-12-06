# Copilot Instructions - Clinic Scheduler

## Project Overview

Sistema de gestión de turnos para clínica médica. Permite a administradores gestionar el calendario mensual de guardias de 24 horas y a los doctores auto-asignarse turnos disponibles.

## Tech Stack

### Backend
- **Runtime:** Node.js + Express
- **Language:** TypeScript (strict mode)
- **ORM:** Prisma con PostgreSQL
- **Auth:** JWT con refresh tokens
- **Validation:** express-validator

### Frontend
- **Framework:** React 18 + Vite
- **Language:** TypeScript
- **UI:** Material-UI v5
- **State:** Zustand con persist middleware
- **HTTP:** Axios con interceptors
- **Dates:** date-fns con locale español

## Code Standards

### General Best Practices

1. **DRY (Don't Repeat Yourself)**
   - Reutilizar código existente siempre que sea posible
   - Extraer lógica común a funciones utilitarias
   - Usar componentes compartidos para UI repetitiva

2. **Single Responsibility**
   - Cada función/componente debe hacer una sola cosa
   - Separar lógica de negocio de lógica de presentación

3. **Clean Code**
   - Nombres descriptivos para variables y funciones
   - Funciones pequeñas y enfocadas
   - Comentarios solo cuando el código no es auto-explicativo

### Utils & Formatters

Crear y usar utilidades compartidas:

```typescript
// Backend: src/utils/
// Frontend: src/utils/

// Ejemplos de utilidades que deben existir:
- formatters.ts    // Formateo de fechas, moneda, texto
- validators.ts    // Validaciones reutilizables
- helpers.ts       // Funciones auxiliares generales
- constants.ts     // Constantes compartidas
```

**Reglas para Utils:**
- Toda función de formateo debe ir en `formatters.ts`
- Toda validación reutilizable debe ir en `validators.ts`
- Funciones puras sin efectos secundarios
- Documentar con JSDoc cuando sea necesario

### TypeScript

```typescript
// ✅ Correcto: Usar tipos explícitos
const getUser = async (id: string): Promise<User | null> => { }

// ❌ Incorrecto: Evitar any
const data: any = response;

// ✅ Correcto: Usar interfaces para objetos
interface CreateShiftRequest {
  startDateTime: string;
  endDateTime: string;
  doctorId?: string;
}

// ✅ Correcto: Usar tipos de unión para estados
type ShiftType = 'FIXED' | 'ROTATING';
type UserRole = 'ADMIN' | 'DOCTOR';
```

### Backend Conventions

```typescript
// Controllers: Delgados, solo manejan request/response
export const createShift = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await shiftService.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// Services: Lógica de negocio (crear si es necesario)
// src/services/shift.service.ts

// Prisma: Usar transacciones para operaciones múltiples
await prisma.$transaction([...operations]);

// Errores: Usar middleware centralizado
throw new AppError('Mensaje de error', 400);
```

### Frontend Conventions

```typescript
// Componentes: Functional con hooks
const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => { };

// Custom Hooks: Extraer lógica reutilizable
const useShifts = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  // ...
  return { shifts, loading, error, refetch };
};

// API calls: Centralizar en src/api/
// No hacer fetch directamente en componentes

// Estado global: Zustand stores en src/store/
// Estado local: useState para UI específica
```

### Formatters (Crear en ambos proyectos)

```typescript
// src/utils/formatters.ts

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: es });
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy HH:mm", { locale: es });
};

export const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm', { locale: es });
};

export const formatShiftDuration = (start: Date, end: Date): string => {
  const hours = differenceInHours(end, start);
  return `${hours}h`;
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
```

## Language Guidelines

- **Code:** English (variables, functions, comments)
- **UI Text:** Spanish (labels, messages, buttons)
- **Git commits:** English

```typescript
// ✅ Correcto
const errorMessage = 'Credenciales inválidas';
const handleSubmit = () => { };

// ❌ Incorrecto
const mensajeError = 'Invalid credentials';
const manejarEnvio = () => { };
```

## File Structure

```
backend/
  src/
    config/       # Configuración (DB, JWT, constants)
    controllers/  # Controladores de rutas
    middleware/   # Auth, validation, error handling
    routes/       # Definición de rutas
    services/     # Lógica de negocio (opcional)
    types/        # Interfaces y tipos TypeScript
    utils/        # Utilidades y formatters

frontend/
  src/
    api/          # Llamadas HTTP centralizadas
    components/   # Componentes reutilizables/ modal/ tablas etc.
    hooks/        # Custom hooks
    pages/        # Páginas/vistas
    store/        # Zustand stores
    theme/        # Configuración MUI
    types/        # Interfaces TypeScript
    utils/        # Utilidades y formatters
```

## User Roles

- **ADMIN:** Gestiona doctores, crea/edita turnos, ve estadísticas
- **DOCTOR:** Ve sus turnos, se auto-asigna turnos disponibles

## API Response Format

```typescript
// Success
{ data: T, message?: string }

// Error
{ error: string }

// Paginated
{
  data: T[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

## Testing (Futuro)

- Backend: Jest + Supertest
- Frontend: Vitest + React Testing Library
- Nombrar tests: `*.test.ts` o `*.spec.ts`

## Common Patterns

### Error Handling

```typescript
// Backend: Middleware centralizado
app.use(errorHandler);

// Frontend: Try-catch con estados
try {
  setLoading(true);
  await api.createShift(data);
  showSuccess('Turno creado');
} catch (error) {
  showError(getErrorMessage(error));
} finally {
  setLoading(false);
}
```

### Form Handling

```typescript
// Usar estados controlados
const [formData, setFormData] = useState<FormData>(initialState);

// Handler genérico
const handleChange = (field: keyof FormData) => (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  setFormData(prev => ({ ...prev, [field]: e.target.value }));
};
```

## Checklist Before Committing

- [ ] No hay `any` en TypeScript
- [ ] Código duplicado extraído a utils
- [ ] Formatters usados para fechas/texto
- [ ] UI text en español
- [ ] Sin console.log en producción
- [ ] Errores manejados apropiadamente

## Mobile & Responsiveness (High Priority)

- The majority of users will use the application from mobile devices. **Design UI mobile-first** and ensure all features can be used on small screens.
- Components must be responsive and adapt to various screen sizes: use MUI responsive props, grid, and breakpoints.
- Do not rely exclusively on drag-and-drop for key workflows (e.g., self-assignment or bulk actions). Provide touch-friendly alternatives such as buttons, modals, and long-press menus for mobile users.
- Prioritize performance and reduce DOM complexity on mobile: lazy load heavy components, use list virtualization for long lists, and avoid expensive reflows.
- Accessibility: ensure keyboard navigation, proper aria labels, accessible color contrast, and test with screen readers.
- Touch interactions: implement larger tap targets (>44x44 px), confirm dialogs for destructive actions, and visual feedback for touch gestures.
- Test mobile flows across Android and iOS: event handling (touch vs mouse) can differ; prefer cross-platform libraries like dnd-kit that support touch sensors.

💡 **Tip**: For drag & drop features, always provide a fallback path (button/confirmation modal) to ensure mobile users can complete the same action as desktop users.
