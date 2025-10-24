import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'donor', // donor | donee | admin
  });
  const [error, setError] = useState('');

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password, // backend hashes it
        role: form.role,
      };

      const { data } = await AuthAPI.register(payload);
      // Expecting backend to return { user_id, email, role, token } (adjust if yours differs)
      login({ id: data.user_id, email: data.email, role: data.role, token: data.token });
      navigate('/');
    } catch (err) {
      console.error('Register error:', err);
      setError('Failed to register');
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-7 col-lg-6">
        <div className="card shadow-sm">
          <div className="card-body">
            <h1 className="h4 mb-3">Create an Account</h1>
            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="vstack gap-3">
              {/* Name */}
              <div>
                <label className="form-label">Name</label>
                <input
                  className="form-control"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  placeholder="Full name"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  placeholder="you@example.com"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="form-label">Password</label>
                <input
                  className="form-control"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                />
              </div>

              {/* Role */}
              <div>
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  name="role"
                  value={form.role}
                  onChange={onChange}
                  required
                >
                  <option value="donor">Donor</option>
                  <option value="donee">Donee</option>
                  <option value="admin">Admin</option>
                </select>
                {form.role === 'donee' && (
                  <div className="form-text">
                    After registering as a <strong>Donee</strong>, you can create or join a household from your dashboard.
                  </div>
                )}
              </div>

              <button className="btn btn-primary" type="submit">
                Register
              </button>
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
