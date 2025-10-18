import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await AuthAPI.login(email, password);
      login({ id: data.user_id, email: data.email, role: data.role, token: data.token });
      navigate('/');
    } catch {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-5">
        <div className="card shadow-sm">
          <div className="card-body">
            <h1 className="h4 mb-3">Login</h1>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <form className="d-grid gap-3" onSubmit={submit}>
              <div>
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={email}
                       onChange={(e)=>setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Password</label>
                <input className="form-control" type="password" value={password}
                       onChange={(e)=>setPassword(e.target.value)} required />
              </div>
              <button className="btn btn-primary" type="submit">Login</button>
            </form>
            <div className="mt-3 small">
              No account? <Link to="/register">Register</Link>
            </div>
            <div className="mt-3 d-grid gap-2">
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
