import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/shared/context/AuthContext';
import { PlacementFiltersProvider } from '@/shared/context/PlacementFiltersContext';
import { Toaster } from '@/shared/ui/sonner';
import { AppRoutes } from './routes';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlacementFiltersProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors closeButton />
        </PlacementFiltersProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
