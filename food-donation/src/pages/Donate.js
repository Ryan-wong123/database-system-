import { useState } from 'react';
import UseFetchData from '../hooks/useFetchData';
import { DonationAPI, LocationsAPI, FoodItemAPI, CategoriesAPI, DietAPI, UnitsAPI } from '../services/api';

export default function Donate() {
  const [form, setForm] = useState({
    location_id: '',
    items: [{ 
      food_item_id: '', 
      name: '', 
      category_id: '', 
      unit_id: '', 
      diet_ids: [], 
      ingredients: '',
      qty: 1, 
      expiry_date: '' 
    }],
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const getSingaporeDate = () => {
    const now = new Date();
    const sgTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
    const year = sgTime.getFullYear();
    const month = String(sgTime.getMonth() + 1).padStart(2, '0');
    const day = String(sgTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const today = getSingaporeDate();

  // Load data
  const locations = UseFetchData(() => LocationsAPI.list(), []);
  const foodItems = UseFetchData(() => FoodItemAPI.list(), []);
  const categories = UseFetchData(() => CategoriesAPI.list(), []);
  const units = UseFetchData(() => UnitsAPI.list(), []);
  const dietaries = UseFetchData(() => DietAPI.list(), []);

  const updateItem = (idx, key, value) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [key]: value };
      return { ...f, items };
    });
  };

  // Toggle dietary flag on/off for multi-select
  const toggleDietaryFlag = (itemIdx, dietId) => {
    setForm((f) => {
      const items = [...f.items];
      const currentDietIds = items[itemIdx].diet_ids || [];
      
      const newDietIds = currentDietIds.includes(dietId)
        ? currentDietIds.filter(id => id !== dietId)
        : [...currentDietIds, dietId];
      
      items[itemIdx] = { ...items[itemIdx], diet_ids: newDietIds };
      return { ...f, items };
    });
  };

  // Handle food item selection (existing or "Other")
  const handleFoodItemChange = (idx, selectedValue) => {
    if (selectedValue === 'other') {
      // "Other" selected - clear auto-filled fields and enable manual entry
      updateItem(idx, 'food_item_id', 'other');
      updateItem(idx, 'name', '');
      updateItem(idx, 'category_id', '');
      updateItem(idx, 'unit_id', '');
      updateItem(idx, 'diet_ids', []);
      updateItem(idx, 'ingredients', '');
    } else if (selectedValue) {
      // Existing food item selected - auto-fill details
      const selectedFood = foodItemOptions.find(f => f.id === parseInt(selectedValue));
      if (selectedFood) {
        setForm((f) => {
          const items = [...f.items];
          items[idx] = {
            ...items[idx],
            food_item_id: selectedFood.id,
            name: selectedFood.name,
            category_id: selectedFood.category_id,
            unit_id: selectedFood.unit_id,
            diet_ids: selectedFood.diet_ids || [],
            ingredients: selectedFood.ingredients || ''
          };
          return { ...f, items };
        });
      }
    } else {
      // Empty selection
      updateItem(idx, 'food_item_id', '');
    }
  };

  const addItem = () =>
    setForm((f) => ({
      ...f,
      items: [...f.items, { 
        food_item_id: '', 
        name: '', 
        category_id: '', 
        unit_id: '', 
        diet_ids: [], 
        ingredients: '',
        qty: 1, 
        expiry_date: '' 
      }],
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
      
      if (!it.food_item_id) {
        setMsg(`Item ${i + 1}: Please select a food item.`);
        return false;
      }
      
      if (it.food_item_id === 'other') {
        // Validate manual entry fields
        if (!it.name || !it.name.trim()) {
          setMsg(`Item ${i + 1}: Food name is required.`);
          return false;
        }
        if (!it.category_id) {
          setMsg(`Item ${i + 1}: Category is required.`);
          return false;
        }
        if (!it.unit_id) {
          setMsg(`Item ${i + 1}: Unit is required.`);
          return false;
        }
        if (!it.ingredients || !it.ingredients.trim()) {
          setMsg(`Item ${i + 1}: Ingredients are required.`);
          return false;
        }
      }
      
      const q = Number(it.qty);
      if (!Number.isFinite(q) || q < 1) {
        setMsg(`Item ${i + 1}: Quantity must be at least 1.`);
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
    }
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!validate()) return;

    setBusy(true);
    try {
      // Prepare payload based on whether it's existing item or "Other"
      const payload = {
        location_id: form.location_id,
        items: form.items.map(item => {
          if (item.food_item_id === 'other') {
            // New food item - send all details
            return {
              name: item.name,
              category_id: item.category_id,
              unit_id: item.unit_id,
              diet_ids: item.diet_ids,
              ingredients: item.ingredients,
              qty: item.qty,
              expiry_date: item.expiry_date
            };
          } else {
            // Existing food item - send only food_item_id, qty, expiry
            return {
              food_item_id: item.food_item_id,
              qty: item.qty,
              expiry_date: item.expiry_date
            };
          }
        })
      };

      console.log('Submitting donation:', payload);
      const response = await DonationAPI.createDonation(payload);
      console.log('Donation response:', response);
      
      setMsg('Donation recorded! Thank you.');
      setForm({
        location_id: '',
        items: [{ 
          food_item_id: '', 
          name: '', 
          category_id: '', 
          unit_id: '', 
          diet_ids: [], 
          ingredients: '',
          qty: 1, 
          expiry_date: '' 
        }],
      });
    } catch (err) {
      console.error('Donation error:', err);
      const errorMsg = err.response?.data?.error || 'Failed to submit donation.';
      setMsg(errorMsg);
    } finally {
      setBusy(false);
    }
  };

  // Helper to safely extract items
  const getItems = (response) => {
    if (!response) return [];
    if (response.items && Array.isArray(response.items)) return response.items;
    if (Array.isArray(response)) return response;
    return [];
  };

  const locationOptions = getItems(locations.data).map(item => ({
    id: item.id,
    name: item.name
  }));

  // Transform food items - handle nested structure
  const foodItemOptions = getItems(foodItems.data).map(item => {
    const fooditem = item.fooditem || item;
    return {
      id: fooditem.food_item_id,
      name: fooditem.name,
      category_id: fooditem.category_id,
      category_name: fooditem.category_name,
      unit_id: fooditem.unit_id,
      unit_name: fooditem.unit_name,
      ingredients: fooditem.ingredients,
      diet_ids: fooditem.diet_ids || [],
      diet_flags: fooditem.diet_flags || [],
      displayName: `${fooditem.name} (${fooditem.category_name}, ${fooditem.unit_name})`
    };
  });

  const categoryOptions = getItems(categories.data).map(item => {
    const cat = item.category || item;
    return { id: cat.category_id, name: cat.name };
  });

  const unitOptions = getItems(units.data).map(item => ({
    id: item.unit_id,
    name: item.unit
  }));

  const dietaryOptions = getItems(dietaries.data).map(item => {
    const diet = item.diet || item;
    return { id: diet.diet_id, name: diet.diet_flags };
  });

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
          {form.items.map((it, idx) => {
            const isOther = it.food_item_id === 'other';
            const isExisting = it.food_item_id && it.food_item_id !== 'other';
            
            return (
              <div key={idx} className="border rounded p-4 mb-3" style={{ backgroundColor: '#f8f9fa' }}>
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
                  {/* Food Item Dropdown (with "Other" option) */}
                  <div className="col-12">
                    <label className="form-label fw-medium">
                      Food Item <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={it.food_item_id}
                      onChange={(e) => handleFoodItemChange(idx, e.target.value)}
                      disabled={foodItems.loading}
                      required
                    >
                      <option value="">
                        {foodItems.loading ? 'Loading food items…' : 'Select a food item'}
                      </option>
                      {foodItemOptions.map((food) => (
                        <option key={food.id} value={food.id}>
                          {food.displayName}
                        </option>
                      ))}
                      <option value="other">➕ Other (Add New Item)</option>
                    </select>
                    {foodItems.error && <div className="text-danger small mt-1">Failed to load food items.</div>}
                  </div>

                  {/* Show details if existing item selected */}
                  {isExisting && (
                    <div className="col-12">
                      <div className="alert alert-info py-2 px-3" style={{ fontSize: '0.9rem' }}>
                        <strong>Item Details:</strong><br />
                        <span className="text-muted">
                          Name: <strong>{it.name}</strong> | 
                          Category: <strong>{categoryOptions.find(c => c.id === it.category_id)?.name}</strong> | 
                          Unit: <strong>{unitOptions.find(u => u.id === it.unit_id)?.name}</strong>
                        </span>
                        {it.ingredients && (
                          <>
                            <br />
                            <span className="text-muted">
                              Ingredients: <em>{it.ingredients}</em>
                            </span>
                          </>
                        )}
                        {it.diet_ids && it.diet_ids.length > 0 && (
                          <>
                            <br />
                            <span className="text-muted">
                              Dietary Flags: {it.diet_ids.map((dietId, i) => {
                                const dietName = dietaryOptions.find(d => d.id === dietId)?.name;
                                return (
                                  <span key={i}>
                                    {i > 0 && ', '}
                                    <span className="badge bg-success ms-1">{dietName}</span>
                                  </span>
                                );
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Manual entry fields (only if "Other" selected) */}
                  {isOther && (
                    <>
                      <div className="col-12">
                        <div className="alert alert-warning py-2 px-3" style={{ fontSize: '0.9rem' }}>
                          <strong>ℹ️ Adding New Item:</strong> Please fill in all details below.
                        </div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-medium">
                          Food Item Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g., Organic Oat Bread"
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
                      </div>

                      {/* UPDATED: Multi-select Dietary Flags with Checkboxes */}
                      <div className="col-md-6">
                        <label className="form-label fw-medium">
                          Dietary Flags (Optional)
                        </label>
                        <div className="border rounded p-3" style={{ backgroundColor: 'white', minHeight: '120px', maxHeight: '180px', overflowY: 'auto' }}>
                          {dietaries.loading && <div className="text-muted small">Loading dietary flags...</div>}
                          {dietaries.error && <div className="text-danger small">Failed to load dietary flags.</div>}
                          {!dietaries.loading && !dietaries.error && dietaryOptions.length === 0 && (
                            <div className="text-muted small">No dietary flags available</div>
                          )}
                          {!dietaries.loading && !dietaries.error && dietaryOptions.map((d) => (
                            <div key={d.id} className="form-check">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                id={`diet-${idx}-${d.id}`}
                                checked={(it.diet_ids || []).includes(d.id)}
                                onChange={() => toggleDietaryFlag(idx, d.id)}
                              />
                              <label className="form-check-label" htmlFor={`diet-${idx}-${d.id}`}>
                                {d.name}
                              </label>
                            </div>
                          ))}
                        </div>
                        {it.diet_ids && it.diet_ids.length > 0 && (
                          <div className="small text-muted mt-1">
                            ✓ {it.diet_ids.length} selected
                          </div>
                        )}
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-medium">
                          Ingredients <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className="form-control"
                          rows="2"
                          placeholder="e.g., Oat, Milk, Sugar"
                          value={it.ingredients}
                          onChange={(e) => updateItem(idx, 'ingredients', e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* Quantity and Expiry Date (always shown) */}
                  <div className="col-md-6">
                    <label className="form-label fw-medium">
                      Quantity <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      placeholder="1"
                      value={it.qty}
                      onChange={(e) => updateItem(idx, 'qty', Math.max(1, Number(e.target.value)))}
                      required
                    />
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
                </div>
              </div>
            );
          })}
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
          <div className={`mt-3 alert ${msg.includes('Thank you') ? 'alert-success' : 'alert-danger'}`}>
            {msg}
          </div>
        )}
      </form>
    </div>
  );
}