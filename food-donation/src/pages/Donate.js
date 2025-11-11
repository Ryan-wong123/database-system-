import { useState } from 'react';
import UseFetchData from '../hooks/useFetchData';
import { DonationAPI, LocationsAPI, CategoriesAPI, DietAPI, UnitsAPI } from '../services/api';

export default function Donate() {
  const [form, setForm] = useState({
    location_id: '',
    items: [{ name: '', category_id: '', diet_ids: [], qty: 1, unit_id: '', expiry_date: '', ingredients: '' }],
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // Get today's date in Singapore timezone (UTC+8) in YYYY-MM-DD format
  const getSingaporeDate = () => {
    const now = new Date();
    const sgTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
    const year = sgTime.getFullYear();
    const month = String(sgTime.getMonth() + 1).padStart(2, '0');
    const day = String(sgTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const today = getSingaporeDate();

  // Load lists via shared hook
  const locations = UseFetchData(() => LocationsAPI.list(), []);
  const categories = UseFetchData(() => CategoriesAPI.list(), []);
  const dietaries = UseFetchData(() => DietAPI.list(), []);
  const units = UseFetchData(() => UnitsAPI.list(), []);

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
      items: [...f.items, { name: '', category_id: '', diet_ids: [], qty: 1, unit_id: '', expiry_date: '', ingredients: '' }],
    }));

  const removeItem = (idx) =>
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== idx),
    }));

  const validate = () => {
    if (!form.location_id) {
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
        setMsg(`Item ${i + 1}: Food name is required.`);
        return false;
      }
      const q = Number(it.qty);
      if (!Number.isFinite(q) || q < 1) {
        setMsg(`Item ${i + 1}: Quantity must be at least 1.`);
        return false;
      }
      if (!it.category_id) { 
        setMsg(`Item ${i+1}: Category is required.`); 
        return false; 
      }
      if (!it.unit_id) { 
        setMsg(`Item ${i+1}: Unit is required.`); 
        return false; 
      }
      if (!it.expiry_date || it.expiry_date.trim() === '') { 
        setMsg(`Item ${i+1}: Expiration date is required.`); 
        return false; 
      }
      if (it.expiry_date < today) {
        setMsg(`Item ${i+1}: Expiration date must be today or in the future.`);
        return false;
      }
      if (!it.ingredients || it.ingredients.trim() === '') {
        setMsg(`Item ${i+1}: Ingredients are required.`);
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
      console.log('Submitting donation:', form);
      const response = await DonationAPI.createDonation(form);
      console.log('Donation response:', response);
      
      setMsg('Donation recorded! Thank you.');
      setForm({
        location_id: '',
        items: [{ name: '', category_id: '', diet_ids: [], qty: 1, unit_id: '', expiry_date: '', ingredients: '' }],
      });
    } catch (err) {
      console.error('Donation error:', err);
      const errorMsg = err.response?.data?.error || 'Failed to submit donation.';
      setMsg(errorMsg);
    } finally {
      setBusy(false);
    }
  };

  // Helper to safely extract items array from API response
  const getItems = (response) => {
    if (!response) return [];
    if (response.items && Array.isArray(response.items)) return response.items;
    if (Array.isArray(response)) return response;
    return [];
  };

  // Transform locations
  const locationOptions = (Array.isArray(locations.data?.items) ? locations.data.items
                         : Array.isArray(locations.data) ? locations.data
                         : [])
  .map(item => ({
    id: item.location_id ?? item.id,   // <— key change
    name: item.name
  }));

  // Transform categories
  const categoryOptions = getItems(categories.data).map(item => {
    const cat = item.category || item;
    return {
      id: cat.category_id,
      name: cat.name
    };
  });

  // Transform diet
  const dietaryOptions = getItems(dietaries.data).map(item => {
    const diet = item.diet || item;
    return {
      id: diet.diet_id,
      name: diet.diet_flags
    };
  });

  // Transform units - matches API: { unit_id, unit }
  const unitOptions = getItems(units.data).map(item => ({
    id: item.unit_id,
    name: item.unit
  }));

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <h1 className="h4 mb-4">Record a Donation</h1>

      <form className="card p-4 shadow-sm" onSubmit={onSubmit}>
        <h4 className="h5 mb-4">Record Donation</h4>

        <div className="mb-4">
          <label className="form-label fw-medium">
            Location <span className="text-danger">*</span>
          </label>
          <select
            className="form-select"
            value={form.location_id}
            onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))}
            required
            disabled={locations.loading}
          >
            <option value="" disabled>
              {locations.loading ? 'Loading locations…' : 'Select a location'}
            </option>
            {locationOptions.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          {locations.error && <div className="text-danger small mt-1">Failed to load locations.</div>}
        </div>

        <div className="mb-3">
          {form.items.map((it, idx) => (
            <div key={idx} className="border rounded p-4 mb-3 position-relative" style={{ backgroundColor: '#f8f9fa' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0 fw-bold">Item {idx + 1}</h6>
                {form.items.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => removeItem(idx)}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="row g-3">
                {/* Row 1: Food Name and Category */}
                <div className="col-md-6">
                  <label className="form-label fw-medium">
                    Food Item Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Oat Bread"
                    value={it.name}
                    onChange={(e) => updateItem(idx, 'name', e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium">
                    Category <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={it.category_id}
                    onChange={(e) => updateItem(idx, 'category_id', e.target.value)}
                    disabled={categories.loading}
                    required
                  >
                    <option value="">Select Category</option>
                    {categoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {categories.error && <div className="text-danger small mt-1">Failed to load categories.</div>}
                </div>

                {/* Row 2: Quantity and Unit */}
                <div className="col-md-6">
                  <label className="form-label fw-medium">
                    Quantity <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    placeholder="3"
                    value={it.qty}
                    onChange={(e) => updateItem(idx, 'qty', Math.max(1, Number(e.target.value)))}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium">
                    Unit <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={it.unit_id}
                    onChange={(e) => updateItem(idx, 'unit_id', e.target.value)}
                    disabled={units.loading}
                    required
                  >
                    <option value="">Select Unit</option>
                    {unitOptions.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  {units.error && <div className="text-danger small mt-1">Failed to load units.</div>}
                </div>

                {/* Row 3: Dietary Flag and Expiry Date */}
                <div className="col-md-6">
                  <label className="form-label fw-medium">
                    Dietary Flag (Optional)
                  </label>
                  <select
                    className="form-select"
                    value={it.diet_ids[0] || ''}
                    onChange={(e) => updateItem(idx, 'diet_ids', e.target.value ? [Number(e.target.value)] : [])}
                    disabled={dietaries.loading}
                  >
                    <option value="">
                      {dietaries.loading ? 'Loading…' : 'Select (Optional)'}
                    </option>
                    {dietaryOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  {dietaries.error && (
                    <div className="text-danger small mt-1">Failed to load dietary tags.</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium">
                    Expiry Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={it.expiry_date}
                    min={today}
                    onChange={(e) => updateItem(idx, 'expiry_date', e.target.value)}
                    required
                  />
                </div>

                {/* Row 4: Ingredients - Full Width */}
                <div className="col-12">
                  <label className="form-label fw-medium">
                    Ingredients <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Oat, Milk"
                    value={it.ingredients}
                    onChange={(e) => updateItem(idx, 'ingredients', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="d-flex gap-2 mb-3">
          <button type="button" className="btn btn-outline-primary" onClick={addItem}>
            + Add Item
          </button>
        </div>

        <button className="btn btn-primary w-100 py-2" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit Donation'}
        </button>

        {msg && (
          <div className={`mt-3 alert ${msg.includes('successfully') || msg.includes('Thank you') ? 'alert-success' : 'alert-danger'}`}>
            {msg}
          </div>
        )}
      </form>
    </div>
  );
}