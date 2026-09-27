import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useRoutes } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { routes } from './router';
import './styles.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4a5cc4' },
    secondary: { main: '#7b4ac4' },
    background: { default: '#f5f6fa', paper: '#ffffff' },
  },
  shape: { borderRadius: 8 },
  typography: { fontSize: 13.5 },
});

function RoutesView() {
  return useRoutes(routes);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <RoutesView />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
