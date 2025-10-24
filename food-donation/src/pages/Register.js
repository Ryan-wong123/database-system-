import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthAPI, IncomeGroupAPI } from '../services/api'; // <-- add IncomeGroupAPI
import { useAuth } from '../context/AuthContext';
import useFetchData from '../hooks/useFetchData'; // <-- import your hook

export default function Register() {
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    role: 'donor' 
  });
  const [donee, setDonee] = useState({
    household_head_name: '',
    income_group: '',
    diet_flags_text: ''
  });

  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const isDonee = form.role === 'donee';

  // 🔹 Fetch income groups from backend
  const { data: incomeResp, loading: incomeLoading, error: incomeError } =
    useFetchData(() => IncomeGroupAPI.list(), []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    let payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role
    };

    if (isDonee) {
      const dietFlags = donee.diet_flags_text
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      payload = {
        ...payload,
        household_head_name: donee.household_head_name,
        income_group: donee.income_group, // this is now set from dropdown
        diet_flags: dietFlags
      };
    }

    try {
      const { data } = await AuthAPI.register(payload);
      login({ id: data.user_id, email: data.email, role: data.role, token: data.token });
      navigate('/');
    } catch (err) {
      console.error("Register error:", err);
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
              {/* Basic info */}
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

              {/* Conditional: only show for donee */}
              {isDonee && (
                <div className="border rounded p-3 bg-light">
                  <h2 className="h6 mb-3">Household Details</h2>

                  <div className="mb-3">
                    <label className="form-label">Head of Household Name</label>
                    <input
                      className="form-control"
                      value={donee.household_head_name}
                      onChange={(e) => setDonee({ ...donee, household_head_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Income Group</label>
                    <select
                      className="form-select"
                      value={donee.income_group}
                      disabled={incomeLoading}
                      onChange={(e) => setDonee({ ...donee, income_group: e.target.value })}
                      required
                    >
                      <option value="">-- Select Income Group --</option>
                      {(Array.isArray(incomeResp?.items) ? incomeResp.items : (incomeResp || []))
                        .map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                    </select>
                    {incomeLoading && <div className="form-text">Loading options…</div>}
                    {incomeError && (
                      <div className="text-danger small">Failed to load income groups</div>
                    )}
                  </div>

                  <div className="mb-3">
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
