# Formateo de Moneda - Estándar Argentino

## Formato
- **Separador de miles:** Punto (.)
- **Separador decimal:** Coma (,)
- **Símbolo:** $ (peso argentino)

Ejemplos:
- `$1.500` → Mil quinientos pesos
- `$150.000` → Ciento cincuenta mil pesos
- `$1.500,50` → Mil quinientos pesos con cincuenta centavos
- `$1.234.567,89` → Un millón doscientos treinta y cuatro mil quinientos sesenta y siete con ochenta y nueve centavos

## Funciones Disponibles

### 1. `formatCurrency(amount: number)`
Formatea un número a string de moneda para **mostrar** (read-only).

```typescript
import { formatCurrency } from '../utils/formatters';

// Uso en display
<Typography>{formatCurrency(150000)}</Typography>
// Output: $150.000

<Typography>{formatCurrency(1500.50)}</Typography>
// Output: $1.500,50
```

### 2. `formatCurrencyInput(value: string)`
Formatea un string mientras el usuario escribe en un input (real-time formatting).

```typescript
import { formatCurrencyInput } from '../utils/formatters';

// Uso en TextField
<TextField
  value={amount}
  onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
  placeholder="0,00"
/>

// Usuario escribe: "1234567.89" o "1234567,89"
// Campo muestra: "1.234.567,89"
```

### 3. `parseCurrencyInput(value: string)`
Convierte un string formateado a número para enviar al backend.

```typescript
import { parseCurrencyInput } from '../utils/formatters';

const handleSubmit = () => {
  const numericValue = parseCurrencyInput(amount); // "1.234.567,89" → 1234567.89
  if (numericValue === null || numericValue <= 0) {
    setError('Ingrese un monto válido');
    return;
  }
  api.create({ amount: numericValue });
};
```

## Ejemplos Completos

### Ejemplo 1: Input de Descuento
```typescript
const [discountAmount, setDiscountAmount] = useState('');

const handleCreate = async () => {
  const amount = parseCurrencyInput(discountAmount);
  if (amount === null || amount <= 0) {
    setError('Ingrese un monto válido mayor a 0');
    return;
  }
  await createDiscount.mutateAsync({ amount });
};

return (
  <TextField
    label="Monto del Descuento"
    value={discountAmount}
    onChange={(e) => setDiscountAmount(formatCurrencyInput(e.target.value))}
    placeholder="0,00"
    InputProps={{
      startAdornment: <Typography>$</Typography>,
    }}
    helperText="Use punto (.) para miles y coma (,) para decimales"
  />
);
```

### Ejemplo 2: Mostrar Valor Formateado
```typescript
const totalPayment = 1234567.89;

return (
  <Box>
    <Typography variant="h4">
      {formatCurrency(totalPayment)}
    </Typography>
    {/* Output: $1.234.567,89 */}
  </Box>
);
```

### Ejemplo 3: Tabla con Montos
```typescript
{doctors.map((doctor) => (
  <TableRow key={doctor.id}>
    <TableCell>{doctor.name}</TableCell>
    <TableCell>{formatCurrency(doctor.paymentBruto)}</TableCell>
    <TableCell sx={{ color: 'error.main' }}>
      {formatCurrency(doctor.discountAmount)}
    </TableCell>
    <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>
      {formatCurrency(doctor.paymentNeto)}
    </TableCell>
  </TableRow>
))}
```

## Comportamiento de `formatCurrencyInput`

### Input del usuario → Output formateado
- `"123"` → `"123"`
- `"1234"` → `"1.234"`
- `"12345"` → `"12.345"`
- `"123456"` → `"123.456"`
- `"1234567"` → `"1.234.567"`
- `"1234567,5"` → `"1.234.567,5"`
- `"1234567,50"` → `"1.234.567,50"`

### Caracteres permitidos mientras se escribe
- **Números:** 0-9 ✅
- **Coma:** , (solo una, para decimales) ✅
- **Punto:** Se agrega automáticamente para miles ✅
- **Otros caracteres:** Se eliminan automáticamente ❌

### Validaciones automáticas
- Solo permite una coma decimal
- Elimina caracteres no numéricos (excepto coma)
- Agrega puntos como separadores de miles automáticamente
- Máximo 2 decimales después de la coma

## Integración con Backend

El backend siempre recibe y devuelve **números** sin formato:

```typescript
// Frontend → Backend
const formValue = "1.234.567,89";
const numericValue = parseCurrencyInput(formValue); // 1234567.89
await api.updateRate({ rate: numericValue }); // Envía 1234567.89

// Backend → Frontend
const response = await api.getRates();
const rate = response.data.rate; // Recibe 1234567.89
display = formatCurrency(rate); // Muestra "$1.234.567,89"
```

## Componentes que Usan Este Formato

- ✅ `DiscountManagement.tsx` - Input de nuevo descuento
- ✅ `RateSettings.tsx` - Inputs de tarifas por hora
- ✅ `DoctorsSummaryTable.tsx` - Display de pagos
- ✅ `MetricsCards.tsx` - Display de pago total
- ✅ `StatisticsCharts.tsx` - Display en gráficos
- ✅ `MyShifts.tsx` - Display de pagos de doctor
- ✅ `DoctorCalendar.tsx` - Tooltips con pagos
- ✅ `AvailableShifts.tsx` - Display de pagos estimados
