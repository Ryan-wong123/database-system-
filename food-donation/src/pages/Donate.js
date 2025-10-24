import { useMemo, useState } from 'react';
import UseFetchData from '../hooks/useFetchData';
import {
  DonationAPI,
  LocationsAPI,
  CategoriesAPI,
  DietaryAPI,
  UnitsAPI,
} from '../services/api';

// Helper: Extract array from various response shapes
const getList = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.items && Array.isArray(data.items)) return data.items;
  if (data.data && Array.isArray(data.data)) return data.data;
  return [];
};

export default function Donate() {
  const [form, setForm] = useState({
    location_id: '',
    items: [
      {
        name: '',
        category_id: '',
        unit_id: '',
        ingredients: '',
        diet_id: '', // ← Changed from diet_ids array to single diet_id
        qty: 1,
        expiry_date: '',
      },
    ],
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // Fetch all the data
  const locations = UseFetchData(() => LocationsAPI.list(), []);
  const categories = UseFetchData(() => CategoriesAPI.list(), []);
  const dietaries = UseFetchData(() => DietaryAPI.list(), []);
  const units = UseFetchData(() => UnitsAPI.list(), []);

  // Build location options
  const locationOptions = useMemo(() => {
    const arr = getList(locations.data);
    return arr
      .map((loc) => ({
        id: loc.location_id || loc.id,
        name: loc.location_name || loc.name,
      }))
      .filter((loc) => loc.id && loc.name);
  }, [locations.data]);

  // Build category options - UNWRAP if needed
  const categoryOptions = useMemo(() => {
    const arr = getList(categories.data);
    return arr
      .map((item) => {
        const cat = item.category || item;
        return {
          id: cat.category_id || cat.id,
          name: cat.name || cat.category_name,
        };
      })
      .filter((cat) => cat.id && cat.name);
  }, [categories.data]);

  // Build unit options
  const unitOptions = useMemo(() => {
    const arr = getList(units.data);
    return arr
      .map((unit) => ({
        id: unit.unit_id || unit.id,
        name: unit.unit || unit.name,
      }))
      .filter((unit) => unit.id && unit.name);
  }, [units.data]);

  // Build dietary options
  const dietaryOptions = useMemo(() => {
    const arr = getList(dietaries.data);
    return arr
      .map((diet) => ({
        id: diet.diet_id || diet.id,
        name: diet.diet_flags || diet.name,
      }))
      .filter((diet) => diet.id && diet.name);
  }, [dietaries.data]);

  const updateItem = (idx, key, value) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [key]: value };
      return { ...f, items };
    });
  };

  const addItem = () =>
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          name: '',
          category_id: '',
          unit_id: '',
          ingredients: '',
          diet_id: '', // ← Single value, not array
          qty: 1,
          expiry_date: '',
        },
      ],
    }));

  const removeItem = (idx) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const isValidFutureDate = (yyyyMMdd) => {
    if (!yyyyMMdd) return false;
    const d = new Date(yyyyMMdd + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  };

  const validate = () => {
    if (!String(form.location_id).trim()) {
      setMsg('Please select a location.');
      return false;
    }
    if (form.items.length === 0) {
      setMsg('Please add at least one item.');
      return false;
    }

    for (let i = 0; i < form.items.length; i++) {
      const it = form.items[i];

      if (!String(it.name).trim()) {
        setMsg(`Row ${i + 1}: Food item name is required.`);
        return false;
      }

      if (!String(it.category_id).trim()) {
        setMsg(`Row ${i + 1}: Category is required.`);
        return false;
      }

      if (!String(it.unit_id).trim()) {
        setMsg(`Row ${i + 1}: Unit is required.`);
        return false;
      }

      if (!String(it.ingredients).trim()) {
        setMsg(`Row ${i + 1}: Ingredients are required.`);
        return false;
      }

      const q = Number(it.qty);
      if (!Number.isFinite(q) || q < 1) {
        setMsg(`Row ${i + 1}: Quantity must be at least 1.`);
        return false;
      }

      if (!isValidFutureDate(it.expiry_date)) {
        setMsg(`Row ${i + 1}: Expiration must be today or later.`);
        return false;
      }
    }
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!validate()) return;

    setBusy(true);
    try {
      let donor_id = null;
      try {
        const raw = localStorage.getItem('auth:user');
        donor_id = raw ? JSON.parse(raw)?.user_id ?? null : null;
      } catch {}

      const payload = {
        location_id: Number(form.location_id),
        donor_id: donor_id ?? undefined,
        items: form.items.map((it) => ({
          name: it.name.trim(),
          category_id: Number(it.category_id),
          unit_id: Number(it.unit_id),
          ingredients: it.ingredients.trim(),
          // Send diet_ids as array if selected, undefined if not
          diet_ids: it.diet_id ? [Number(it.diet_id)] : undefined,
          qty: Number(it.qty),
          expiry_date: it.expiry_date,
        })),
      };

      console.log('Submitting payload:', payload);
      await DonationAPI.createDonation(payload);

      setMsg('✓ Donation recorded successfully! Thank you.');
      setForm({
        location_id: '',
        items: [
          {
            name: '',
            category_id: '',
            unit_id: '',
            ingredients: '',
            diet_id: '',
            qty: 1,
            expiry_date: '',
          },
        ],
      });
    } catch (err) {
      console.error('Submission error:', err);
      setMsg('✗ ' + (err.response?.data?.error || 'Failed to submit donation.'));
    } finally {
      setBusy(false);
    }
  };

  const isLoading = locations.loading || categories.loading || dietaries.loading || units.loading;

  // Get today's date for min date on date input
  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Record a Donation</h1>

      {isLoading && (
        <div style={{ padding: '1rem', backgroundColor: '#d1ecf1', color: '#0c5460', borderRadius: '4px', marginBottom: '1rem' }}>
          Loading form data...
        </div>
      )}

      <form onSubmit={onSubmit} style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h4 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Donation Details</h4>

        {/* Location */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
            Location <span style={{ color: '#dc3545' }}>*</span>
          </label>
          <select
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '1rem' }}
            value={form.location_id}
            onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))}
            required
            disabled={locations.loading}
          >
            <option value="">
              {locations.loading ? 'Loading locations…' : locationOptions.length === 0 ? 'No locations available' : '-- Select a location --'}
            </option>
            {locationOptions.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #dee2e6' }} />

        <h5 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Food Items</h5>

        {/* Items */}
        {form.items.map((it, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: '#f8f9fa',
              padding: '1.5rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #e0e0e0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h6 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Item {idx + 1}</h6>
              {form.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  Remove
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {/* Food Name */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Food Item Name <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '1rem' }}
                  value={it.name}
                  onChange={(e) => updateItem(idx, 'name', e.target.value)}
                  placeholder="e.g., Rice, Canned Beans"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Category <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <select
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '1rem' }}
                  value={it.category_id}
                  onChange={(e) => updateItem(idx, 'category_id', e.target.value)}
                  required
                >
                  <option value="">-- Select category --</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {/* Quantity */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Quantity <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="number"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '1rem' }}
                  min="1"
                  value={it.qty}
                  onChange={(e) => updateItem(idx, 'qty', Math.max(1, Number(e.target.value)))}
                  required
                />
              </div>

              {/* Unit */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Unit <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <select
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '1rem' }}
                  value={it.unit_id}
                  onChange={(e) => updateItem(idx, 'unit_id', e.target.value)}
                  required
                >
                  <option value="">-- Select unit --</option>
                  {unitOptions.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ingredients */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Ingredients <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <textarea
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '1rem', resize: 'vertical' }}
                value={it.ingredients}
                onChange={(e) => updateItem(idx, 'ingredients', e.target.value)}
                placeholder="e.g., Rice, water, salt"
                rows="2"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Diet Flags - SINGLE SELECT DROPDOWN (OPTIONAL) */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Dietary Flag (Optional)
                </label>
                <select
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '1rem' }}
                  value={it.diet_id}
                  onChange={(e) => updateItem(idx, 'diet_id', e.target.value)}
                >
                  <option value="">-- None / Not specified --</option>
                  {dietaryOptions.map((diet) => (
                    <option key={diet.id} value={diet.id}>
                      {diet.name}
                    </option>
                  ))}
                </select>
                <small style={{ display: 'block', color: '#6c757d', marginTop: '0.25rem', fontSize: '0.85rem' }}>
                  Leave as "None" if not applicable
                </small>
              </div>

              {/* Expiry Date */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Expiry Date <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="date"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '1rem' }}
                  value={it.expiry_date}
                  onChange={(e) => updateItem(idx, 'expiry_date', e.target.value)}
                  min={today}
                  required
                />
                {it.expiry_date && !isValidFutureDate(it.expiry_date) && (
                  <small style={{ display: 'block', color: '#dc3545', marginTop: '0.25rem' }}>
                    Date must be today or later.
                  </small>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Add Item Button */}
        <button
          type="button"
          onClick={addItem}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            width: '100%',
          }}
        >
          + Add Another Item
        </button>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={busy || isLoading}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: busy || isLoading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: busy || isLoading ? 'not-allowed' : 'pointer',
            fontSize: '1.1rem',
            fontWeight: '600',
            width: '100%',
          }}
        >
          {busy ? 'Submitting…' : 'Submit Donation'}
        </button>

        {/* Message */}
        {msg && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '4px',
              backgroundColor: msg.includes('✗') || msg.includes('required') ? '#f8d7da' : '#d4edda',
              color: msg.includes('✗') || msg.includes('required') ? '#721c24' : '#155724',
              border: msg.includes('✗') || msg.includes('required') ? '1px solid #f5c6cb' : '1px solid #c3e6cb',
            }}
          >
            {msg}
          </div>
        )}
      </form>
    </div>
  );
}