import { BrowserRouter, HashRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { AppRoutes } from './routes/AppRoutes';

import theme from './theme';
import { queryClient } from './lib/queryClient';

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <CssBaseline />
          {import.meta.env.VITE_USE_HASH_ROUTER === 'true' ? (
            <HashRouter>
              <AppRoutes />
            </HashRouter>
          ) : (
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          )}
        </LocalizationProvider>
      </ThemeProvider>
      {/* DevTools solo en desarrollo */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;
