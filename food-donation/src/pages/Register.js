import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ email:'', password:'', name:'', role:'household' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await AuthAPI.register(form);
      login({ id: data.user_id, email: data.email, role: data.role, token: data.token });
      navigate('/');
    } catch {
      setError('Failed to register');
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-7 col-lg-6">
        <div className="card shadow-sm">
          <div className="card-body">
            <h1 className="h4 mb-3">Create an Account</h1>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <form className="d-grid gap-3" onSubmit={submit}>
              <div>
                <label className="form-label">Name</label>
                <input className="form-control" value={form.name}
                       onChange={(e)=>setForm({ ...form, name:e.target.value })} required />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={form.email}
                       onChange={(e)=>setForm({ ...form, email:e.target.value })} required />
              </div>
              <div>
                <label className="form-label">Password</label>
                <input className="form-control" type="password" value={form.password}
                       onChange={(e)=>setForm({ ...form, password:e.target.value })} required />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role}
                        onChange={(e)=>setForm({ ...form, role:e.target.value })}>
                  <option value="household">Household</option>
                  <option value="donor">Donor</option>
                  <option value="volunteer">Volunteer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button className="btn btn-primary" type="submit">Register</button>
            </form>
            <div className="mt-3 small">
              Already have an account? <Link to="/login">Login</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
