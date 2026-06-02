import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login as apiLogin } from '../api/crmApi'

export function LoginPage() {
  const navigate = useNavigate()
  const { login: authLogin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await apiLogin({ email, password })
      if (!response.data || !response.data.token || !response.data.usuario) {
        throw new Error('Respuesta inválida del servidor')
      }
      const { token, usuario } = response.data

      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify(usuario))

      await authLogin({ ...usuario, token })

      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      const message =
        axiosErr?.response?.data?.error ??
        (err instanceof Error
          ? err.message
          : 'Error de conexión')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-teal-500">CRM Tecnoinnsoft</h1>
          <p className="text-slate-400 mt-2">Ingresa a tu cuenta</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:text-slate-500 text-white font-medium rounded-xl transition-colors"
          >
            {loading ? 'Conectando...' : 'Iniciar sesión'}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 flex items-center justify-between">
          <a href="/forgot-password" className="text-sm text-teal-500 hover:text-teal-400">
            ¿Olvidaste tu contraseña?
          </a>
          <a href="/register" className="text-sm text-teal-500 hover:text-teal-400">
            Crear cuenta
          </a>
        </div>
      </div>
    </div>
  )
}