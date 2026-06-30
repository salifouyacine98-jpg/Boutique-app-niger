import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shopName, setShopName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email || !password) {
      setError('Remplis ton email et ton mot de passe.')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit avoir au moins 6 caractères.')
      return
    }

    setLoading(true)

    if (mode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (signUpError) {
        setError(traduireErreur(signUpError.message))
        setLoading(false)
        return
      }

      if (data?.user) {
        const { error: boutiqueError } = await supabase.from('boutiques').insert({
          user_id: data.user.id,
          name: shopName || 'Ma Boutique',
          loc: 'Niger',
          phone: '',
        })
        if (boutiqueError) {
          console.error(boutiqueError)
        }
      }

      if (data?.user && !data?.session) {
        setSuccess('Compte créé ! Vérifie ta boîte email pour confirmer, puis connecte-toi.')
        setMode('login')
      }
      setLoading(false)
      return
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) {
      setError(traduireErreur(loginError.message))
    }
    setLoading(false)
  }

  function traduireErreur(msg) {
    if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.'
    if (msg.includes('User already registered')) return 'Ce compte existe déjà. Connecte-toi plutôt.'
    if (msg.includes('Email not confirmed')) return 'Confirme ton email avant de te connecter.'
    return msg
  }

  return (
    <div className="auth-wrap">
      <div className="auth-logo">🏪</div>
      <div className="auth-title">BoutiqueApp Niger</div>
      <div className="auth-sub">
        {mode === 'login' ? 'Connecte-toi à ta boutique' : 'Crée le compte de ta boutique'}
      </div>

      {error && <div className="auth-error">{error}</div>}
      {success && <div className="auth-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <div className="auth-field">
            <label className="auth-label">Nom de ta boutique</label>
            <input
              className="auth-input"
              type="text"
              placeholder="Ex: Boutique Al-Amin"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
            />
          </div>
        )}

        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input
            className="auth-input"
            type="email"
            placeholder="ton@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoCapitalize="none"
          />
        </div>

        <div className="auth-field">
          <label className="auth-label">Mot de passe</label>
          <input
            className="auth-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? 'Patiente...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
      </form>

      <div className="auth-switch">
        {mode === 'login' ? (
          <>Pas encore de compte ? <span onClick={() => { setMode('signup'); setError(''); setSuccess('') }}>Créer un compte</span></>
        ) : (
          <>Déjà un compte ? <span onClick={() => { setMode('login'); setError(''); setSuccess('') }}>Se connecter</span></>
        )}
      </div>
    </div>
  )
}
