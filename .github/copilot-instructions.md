# Copilot Instructions - Clinic Scheduler

## Project Overview

Sistema de gestión de turnos para clínica médica. Permite a administradores gestionar el calendario mensual de guardias de 24 horas y a los doctores auto-asignarse turnos disponibles.

**IMPORTANTE - Zona Horaria:**
- El sistema opera en zona horaria de Argentina (America/Argentina/Buenos_Aires, UTC-3)
- Todas las fechas y horas deben manejarse en esta zona horaria
- Backend: Usar funciones de `src/utils/dateHelpers.ts` para manejo consistente de fechas
- Frontend: Las fechas se manejan localmente (el navegador ya está en zona horaria local)
- Al parsear fechas desde strings YYYY-MM-DD, usar `new Date(year, month - 1, day)` para evitar problemas de UTC
- Nunca usar `.toISOString()` para comparar fechas o guardar fechas de calendario (solo para timestamps)

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
- **Server State:** TanStack Query (React Query) v5 para cache y fetching
- **UI State:** Zustand con persist middleware (auth, preferencias UI)
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

### Guardrails to avoid runtime errors and regressions

- **Do NOT** store JSX or React components inside state initializers or state values. State should hold serializable data only (primitives, objects, arrays) — never components, elements, or functions that render UI. This prevents confusing build/compile errors and unintended runtime behavior.
- **Avoid heavy inline logic inside `return` JSX.** Compute derived values, formatting, and conditional strings above the `return` into well-named variables or helper functions. This keeps JSX readable and simplifies unit testing.
- **Input validation & parsing:** Don't run `new Date()` or parse user input until you have validated it using util validators (e.g., `isValidMonth`, `isValidDateString` in `src/utils/validators.ts`). Invalid dates can cause NaN and blank pages.
- **Use 'selected' vs 'applied' pattern for filters.** For free-text or date input fields, keep an editable `selectedX` value and a separate `appliedX` value that triggers load or API calls. Apply filters only when the value is valid and accepted by the user (button or Enter), to avoid partial state crashes.
- **Don't mutate or reassign global state directly inside UI event handlers without validation.** Always validate, format, and guard before calling API or updating persisted stores.
- **Prefer reusable components over repeating JSX logic.** Extract common controls into `components/filters` or similar and use them across pages.
- **Always include unit or integration tests** for critical input handling and data parsing logic (`validators`, `formatters`) and for any component that accepts free-form input.

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

// Custom Hooks: Usar React Query para datos del servidor
// Ubicación: src/hooks/useShifts.ts, useUsers.ts, useHolidays.ts

// ❌ Incorrecto: useState + useEffect para datos del servidor
const [shifts, setShifts] = useState<Shift[]>([]);
useEffect(() => { fetchShifts().then(setShifts); }, []);

// ✅ Correcto: React Query hooks
const { data: shifts, isLoading, error } = useShifts(month, year);

// API calls: Centralizar en src/api/
// No hacer fetch directamente en componentes

// Estado del servidor: TanStack Query (src/hooks/)
// Estado de UI persistente: Zustand stores (src/store/)
// Estado local efímero: useState para UI específica del componente
```

### TanStack Query Conventions

```typescript
// Query Keys: Centralizados en src/lib/queryClient.ts
export const queryKeys = {
  shifts: {
    all: ['shifts'] as const,
    list: (filters: { month?: number; year?: number }) => 
      [...queryKeys.shifts.all, 'list', filters] as const,
    my: (month?: number, year?: number) => 
      [...queryKeys.shifts.all, 'my', { month, year }] as const,
  },
  // ... más keys
};

// Hooks de Query: Siempre retornar objeto completo
export const useShifts = (month?: number, year?: number) => {
  return useQuery({
    queryKey: queryKeys.shifts.list({ month, year }),
    queryFn: () => shiftsApi.getAll({ month, year }),
  });
};

// Mutations: Siempre invalidar cache relacionado
export const useUpdateShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => shiftsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
    },
  });
};

// Configuración de cache (ya definida en queryClient.ts):
// - staleTime: 2 minutos (datos considerados frescos)
// - gcTime: 10 minutos (retención en cache)
// - Doctors/Holidays: staleTime más largo (5-10 min) por ser datos estables

// ❌ Incorrecto: Llamar API directamente y manejar estado local
const handleSave = async () => {
  await api.updateShift(id, data);
  setShifts(prev => prev.map(s => s.id === id ? {...s, ...data} : s));
};

// ✅ Correcto: Usar mutation que invalida cache
const updateShift = useUpdateShift();
const handleSave = () => {
  updateShift.mutate({ id, data });
};
```

### Zustand UI Store Conventions

```typescript
// Solo para estado de UI persistente, NO para datos del servidor
// Ubicación: src/store/uiStore.ts

interface UIStore {
  // Preferencias de UI que persisten entre sesiones
  calendarPreferences: {
    viewMode: 'grid' | 'list';
    filterDoctorId: string | null;
  };
  sidebarOpen: boolean;
  lastViewedDate: string | null;
}

// Usar con persist middleware para localStorage
export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // ... estado y acciones
    }),
    { name: 'clinic-ui-preferences' }
  )
);
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

### Date Handling - Argentina Timezone

**Backend (src/utils/dateHelpers.ts):**
```typescript
// Parsear fecha YYYY-MM-DD en zona horaria Argentina
export const parseArgentinaDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Formatear fecha a YYYY-MM-DD
export const formatArgentinaDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Inicio y fin del día en Argentina
export const startOfDayArgentina = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};
```

**Frontend:**
- Usar `new Date(year, month - 1, day)` para parsear YYYY-MM-DD
- Evitar `.toISOString()` para fechas de calendario
- El navegador maneja automáticamente la zona horaria local
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
    hooks/        # React Query hooks (useShifts, useUsers, useHolidays)
    lib/          # Configuración de librerías (queryClient.ts)
    pages/        # Páginas/vistas
    store/        # Zustand stores (auth, UI preferences)
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

// Frontend con React Query: Los errores se manejan automáticamente
const { data, error, isError } = useShifts();
if (isError) {
  showError(getErrorMessage(error));
}

// Frontend Mutations: Usar callbacks onError/onSuccess
const updateShift = useUpdateShift();
updateShift.mutate(data, {
  onSuccess: () => showSuccess('Turno actualizado'),
  onError: (error) => showError(getErrorMessage(error)),
});

// Para operaciones fuera de React Query (legacy):
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
- [ ] Datos del servidor gestionados con React Query hooks (no useState+useEffect)
- [ ] Mutations invalidan cache correctamente

- [ ] Run TypeScript build on both backend & frontend
  - Backend: `npm --prefix backend run build`
  - Frontend: `npm --prefix frontend run build`
- [ ] Run linters and formatters (`npm --prefix backend run lint`, `npm --prefix frontend run lint` if configured)
- [ ] Run tests: `npm --prefix backend run test` and `npm --prefix frontend run test` (if present)
- [ ] Manual acceptance checks for UI input flows:
  - Validate month/day filters with correct and incorrect input
  - Verify UI doesn't crash when typing partially into date/month inputs
  - Confirm the selected vs applied filtering behavior
  - Confirm that frontend types match backend DTOs, and express-validator rules match TypeScript definitions

## When to run builds and tests

- Ensure `npm run build` (both backend and frontend) passes locally before creating a PR. Automated CI will still run it, but it prevents obvious regression from being proposed in a PR.
- If you change API payloads: update `frontend/src/types` and `backend/src/types` accordingly, then re-run the builds and tests.

## Mobile & Responsiveness (High Priority)

- The majority of users will use the application from mobile devices. **Design UI mobile-first** and ensure all features can be used on small screens.
- Components must be responsive and adapt to various screen sizes: use MUI responsive props, grid, and breakpoints.
- Do not rely exclusively on drag-and-drop for key workflows (e.g., self-assignment or bulk actions). Provide touch-friendly alternatives such as buttons, modals, and long-press menus for mobile users.
- Prioritize performance and reduce DOM complexity on mobile: lazy load heavy components, use list virtualization for long lists, and avoid expensive reflows.
- Accessibility: ensure keyboard navigation, proper aria labels, accessible color contrast, and test with screen readers.
- Touch interactions: implement larger tap targets (>44x44 px), confirm dialogs for destructive actions, and visual feedback for touch gestures.
- Test mobile flows across Android and iOS: event handling (touch vs mouse) can differ; prefer cross-platform libraries like dnd-kit that support touch sensors.

💡 **Tip**: For drag & drop features, always provide a fallback path (button/confirmation modal) to ensure mobile users can complete the same action as desktop users.
