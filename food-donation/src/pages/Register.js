import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'donor' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  // Extra fields for Donee
  const [donee, setDonee] = useState({
    head_name: '',
    income_group: 'low',           // low | medium | high
    custom_income_group: '',       // optional free-text override
    diet_flags_text: ''            // comma-separated input -> array
  });

  const isDonee = form.role === 'donee';

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    // Build payload
    const payload = { ...form };

    if (isDonee) {
      const dietFlags = donee.diet_flags_text
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      payload.donee_profile = {
        head_name: donee.head_name,
        income_group: donee.custom_income_group?.trim() || donee.income_group,
        diet_flags: dietFlags
      };
    }

    try {
      const { data } = await AuthAPI.register(payload);
      // expect backend to return { user_id, email, role, token }
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
              {/* Basic account info */}
              <div>
                <label className="form-label">Name</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Password</label>
                <input
                  className="form-control"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="donor">Donor</option>
                  <option value="donee">Donee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Conditional fields for Donee */}
              {isDonee && (
                <div className="border rounded p-3 bg-light">
                  <h2 className="h6 mb-3">Donee Details</h2>

                  <div className="mb-3">
                    <label className="form-label">Head of Household Name</label>
                    <input
                      className="form-control"
                      value={donee.head_name}
                      onChange={(e) => setDonee({ ...donee, head_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2">
                    <div className="col-md-12">
                      <label className="form-label">Income Group</label>
                      <select
                        className="form-select"
                        value={donee.income_group}
                        onChange={(e) => setDonee({ ...donee, income_group: e.target.value })}
                      >
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="form-label">Diet Flags</label>
                    <input
                      className="form-control"
                      placeholder='e.g. "vegetarian, halal"'
                      value={donee.diet_flags_text}
                      onChange={(e) => setDonee({ ...donee, diet_flags_text: e.target.value })}
                    />
                  </div>
                </div>
              )}

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
