import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Sidebar } from './components/layout/Sidebar'
import { BottomNav } from './components/layout/BottomNav'
import { Header } from './components/layout/Header'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { DirectorioPage } from './pages/DirectorioPage'
import { CRMPage } from './pages/CRMPage'
import { OperacionesPage, FinanzasPage, TalentosPage, SeguridadPage } from './pages/ModulosPages'
import { SeguridadDashboardPage } from './pages/SeguridadDashboardPage'
import { MarcasPage } from './pages/MarcasPage'
import { UsuariosPage } from './pages/UsuariosPage'
import { ContactosPage } from './pages/ContactosPage'
import { CiudadesPage } from './pages/CiudadesPage'
import { ProductosPage } from './pages/ProductosPage'
import { MaestrosPage } from './pages/MaestrosPage'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: true,
      staleTime: 300000, // 5 min
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Protected routes */}
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

function ProtectedLayout() {
  const { isAuthenticated } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  function handleMobileNavClick() {
    setMobileMenuOpen(false)
  }

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar - Desktop */}
      <div className="hidden md:block">
        <Sidebar onMobileNavClick={handleMobileNavClick} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Sidebar */}
          <div className="absolute left-0 top-0 h-full">
            <Sidebar onMobileNavClick={handleMobileNavClick} />
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-h-0">
        <Header onMenuToggle={() => setMobileMenuOpen(prev => !prev)} mobileMenuOpen={mobileMenuOpen} />

        <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/directorio" element={<DirectorioPage />} />
            <Route path="/crm" element={<CRMPage />} />
            <Route path="/operaciones" element={<OperacionesPage />} />
            <Route path="/finanzas" element={<FinanzasPage />} />
            <Route path="/talento" element={<TalentosPage />} />
            <Route path="/seguridad" element={<SeguridadDashboardPage />} />
            <Route path="/marcas" element={<MarcasPage />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/contactos" element={<ContactosPage />} />
            <Route path="/ciudades" element={<CiudadesPage />} />
            <Route path="/productos" element={<ProductosPage />} />
            <Route path="/maestros" element={<MaestrosPage />} />
            <Route path="/erp" element={<DashboardPage />} />
          </Routes>
        </main>

        {/* Bottom Nav - Mobile */}
        <BottomNav />
      </div>
    </div>
  )
}

export default App