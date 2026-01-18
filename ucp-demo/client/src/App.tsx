
import { useState, useEffect } from 'react'
import { ucpService } from './services/UCPService'
import type { Product, UCPProfile, CheckoutSession, Order } from './services/UCPService'
import './App.css'

function App() {
  const [profile, setProfile] = useState<UCPProfile | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [activeSession, setActiveSession] = useState<CheckoutSession | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    ucpService.discover()
      .then(setProfile)
      .catch(console.error)
  }, [])

  const handleSearch = async () => {
    setLoading(true)
    try {
      const results = await ucpService.search(searchQuery)
      setProducts(results)
    } finally {
      setLoading(false)
    }
  }

  const handleBuy = async (product: Product) => {
    if (!profile) return
    setLoading(true)
    try {
      // Find checkout endpoint from capabilities
      const checkoutEndpoint = profile.ucp.services['dev.ucp.shopping'].rest.endpoint;
      const session = await ucpService.createCheckoutSession(
        checkoutEndpoint,
        [{ item: { id: product.id, title: product.name, price: product.price }, quantity: 1 }],
        { name: 'Demo Buyer', email: 'buyer@example.com' }
      )
      setActiveSession(session)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!activeSession || !profile) return
    setLoading(true)
    try {
      const checkoutEndpoint = profile.ucp.services['dev.ucp.shopping'].rest.endpoint;
      const order = await ucpService.completeCheckout(checkoutEndpoint, activeSession.id)
      setActiveSession(prev => prev ? { ...prev, status: 'completed' } : null)
      setMessage(`Purchase Completed! Order ID: ${order.id}`)
      setTimeout(() => {
        setActiveSession(null)
        setMessage('')
      }, 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <header className="header">
        <h1>{profile?.business?.name || 'UCP Shop'}</h1>
        <p>Connected to: {profile?.ucp?.services['dev.ucp.shopping']?.rest?.endpoint}</p>
      </header>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search products (try 'Samsung')..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button onClick={handleSearch} disabled={loading}>Search</button>
      </div>

      <div className="product-list">
        {products.map(p => (
          <div key={p.id} className="product-card">
            <h3 className="product-name">{p.name}</h3>
            <p className="product-price">{p.currency} {p.price.toLocaleString()}</p>
            <button onClick={() => handleBuy(p)} disabled={loading}>Buy Now</button>
          </div>
        ))}
      </div>

      {activeSession && (
        <div className="checkout-overlay">
          <div className="modal">
            <h2>Checkout Session</h2>
            <p>ID: {activeSession.id}</p>
            <p>Status: <span className={`status-badge status-${activeSession.status}`}>{activeSession.status}</span></p>
            <div className="total">
              <h3>Total: {activeSession.totals.find(t => t.type === 'total')?.currency} {activeSession.totals.find(t => t.type === 'total')?.amount}</h3>
            </div>
            {activeSession.status === 'open' && (
              <button onClick={handleComplete} disabled={loading}>Complete Purchase</button>
            )}
            {message && <div className="success-message">{message}</div>}
            <button
              className="close-btn"
              onClick={() => setActiveSession(null)}
              style={{ marginTop: '1rem', background: '#475569' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
