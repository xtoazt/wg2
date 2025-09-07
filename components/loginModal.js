import { useState } from 'react';
import { toast } from 'react-toastify';
import retryManager from './utils/retryFetch';
import clientConfig from '../clientConfig';

export default function LoginModal({ isOpen, onClose, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Use window.cConfig if available, otherwise fall back to clientConfig()
      const apiUrl = window.cConfig?.apiUrl || clientConfig().apiUrl;
      
      const response = await retryManager.fetchWithRetry(
        apiUrl + "/api/auth",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: isLogin ? 'login' : 'register',
            username,
            password
          }),
        },
        'auth'
      );

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        // Store session
        window.localStorage.setItem("wg_secret", data.secret);
        onLogin({ token: data });
        toast.success(isLogin ? 'Login successful!' : 'Registration successful!');
        onClose();
        setUsername('');
        setPassword('');
      }
    } catch (error) {
      console.error('Auth error:', error);
      
      // Provide more specific error messages
      if (error.name === 'AbortError') {
        toast.error('Request timed out. Please check your connection and try again.');
      } else if (error.message.includes('fetch')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error('Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isLogin ? 'Login' : 'Register'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? '...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
        
        <div className="modal-footer">
          <button 
            type="button" 
            className="switch-mode-btn"
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading}
          >
            {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
