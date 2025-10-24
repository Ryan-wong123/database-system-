import { useMemo, useState } from 'react';
import UseFetchData from '../hooks/useFetchData';
import { CategoriesAPI, DietAPI } from '../services/api';

export default function CatalogTab() {
  const [kind, setKind] = useState('category'); // 'category' | 'diet'
  const api = useMemo(() => (kind === 'category' ? CategoriesAPI : DietAPI), [kind]);
  const isDiet = kind === 'diet';

  // tick forces refetch after create/update
  const [tick, setTick] = useState(0);
  const list = UseFetchData(() => api.list(), [api, tick]);

  // optional search “override” rows (so we don't mutate list.data)
  const [query, setQuery] = useState('');
  const [rowsOverride, setRowsOverride] = useState(null);

  // create/edit form
  const [form, setForm] = useState({ id: null, name: '', diet_flags: '', isEditing: false });

  // ---- Normalizers ----------------------------------------------------------
  const extractPayload = (resp) => {
    // Accept axios and fetch return shapes
    const data = resp?.data ?? resp ?? {};
    // Common shapes we’ll accept:
    // - { ok, items: [...] }
    // - { items: [...] }
    // - raw array [...]
    if (Array.isArray(data)) return { ok: true, items: data, count: data.length };
    if (Array.isArray(data?.items)) return { ok: data.ok ?? true, items: data.items, count: data.count ?? data.items.length };
    if (Array.isArray(data?.data))  return { ok: true, items: data.data,  count: data.data.length };
    // Fallback: no items
    return { ok: !!data.ok, items: [], count: 0 };
  };

  const normalizeRows = (payloadItems) => {
    // Backend example for categories:
    // { "items": [ { "category": { "name": "...", "category_id": 12 } }, ... ] }
    // We’ll also support flat forms just in case.
    return (payloadItems || []).map((row) => {
      if (!isDiet) {
        const c = row?.category ?? row; // support both nested and flat
        return {
          id: c?.category_id ?? c?.id ?? null,
          name: c?.name ?? '',
        };
      } else {
        const d = row?.diet ?? row;
        return {
          id: d?.diet_id ?? d?.id ?? null,
          diet_flags: d?.diet_flags ?? '',
        };
      }
    }).filter(r => r.id != null);
  };

  const rows = useMemo(() => {
    // if we have an override (from search), show that; otherwise, show list
    if (rowsOverride) return rowsOverride;

    const payload = extractPayload(list?.data);
    return normalizeRows(payload.items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list?.data, rowsOverride, isDiet]);

  // ---- Actions --------------------------------------------------------------
  const startEdit = (row) => {
    setForm({
      id: row?.id ?? null,
      name: row?.name ?? '',
      diet_flags: row?.diet_flags ?? '',
      isEditing: true,
    });
  };

  const resetForm = () => setForm({ id: null, name: '', diet_flags: '', isEditing: false });

  const onSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setRowsOverride(null);      // clear override, return to full list
      setTick(t => t + 1);        // refresh full list (optional)
      return;
    }
    try {
      const res = isDiet ? await api.searchByFlags(query.trim()) : await api.searchByName(query.trim());
      const payload = extractPayload(res);
      const norm = normalizeRows(payload.items);
      setRowsOverride(norm);
    } catch {
      alert('Search failed.');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      // Basic validation to avoid empty creates/updates
      if (!isDiet) {
        if (!form.name || !form.name.trim()) {
          alert('Category name cannot be empty.');
          return;
        }
      } else {
        if (!form.diet_flags || !form.diet_flags.trim()) {
          alert('diet_flags cannot be empty.');
          return;
        }
      }

      let res;
      if (form.isEditing && form.id != null) {
        const payload = isDiet ? { diet_flags: form.diet_flags.trim() } : { name: form.name.trim() };
        res = await api.update(form.id, payload);
        const data = res?.data ?? res ?? {};
        const result = data.result ?? {};
        if (data?.ok && typeof result?.rows_affected === 'number' && result.rows_affected === 0) {
          alert('No changes detected.');
        } else if (data?.ok) {
          alert('Saved changes.');
        } else {
          alert('Update failed.');
        }
      } else {
        const payload = isDiet ? { diet_flags: form.diet_flags.trim() } : { name: form.name.trim() };
        res = await api.create(payload);
        const data = res?.data ?? res ?? {};
        if (data?.ok) {
          alert('Created successfully.');
        } else {
          // Some backends return 201 without { ok:true }; handle gracefully
          alert(data?.message || 'Create completed (verify in list).');
        }
      }

      // Clear search override so the new/updated record appears in the full list
      setRowsOverride(null);
      resetForm();
      setTick(t => t + 1);
    } catch (err) {
      // Axios errors often live in err.response.data
      const msg = err?.response?.data?.message || err?.message || 'Something went wrong.';
      alert(msg);
    }
  };

  // ---- a11y-friendly IDs ----------------------------------------------------
  const nameId = 'category-name';    // constant is fine since this form repeats once
  const flagsId = 'diet-flags';
  const searchId = 'catalog-search';

  return (
    <div className="d-grid gap-3">
      <div className="d-flex gap-2 align-items-center">
        <div className="btn-group" role="group" aria-label="Catalog kind">
          <button
            type="button"
            className={`btn btn-sm ${!isDiet ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => { setKind('category'); resetForm(); setRowsOverride(null); }}
          >
            Categories
          </button>
        </div>
        <div className="btn-group" role="group" aria-label="Catalog kind">
          <button
            type="button"
            className={`btn btn-sm ${isDiet ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => { setKind('diet'); resetForm(); setRowsOverride(null); }}
          >
            Diets
          </button>
        </div>

        <form className="ms-auto d-flex gap-2" onSubmit={onSearch}>
          <label className="visually-hidden" htmlFor={searchId}>Search</label>
          <input
            id={searchId}
            name={searchId}
            className="form-control form-control-sm"
            placeholder={isDiet ? "Search diet_flags…" : "Search category name…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-sm btn-outline-secondary" type="submit">Search</button>
        </form>
      </div>

      <div className="card">
        <div className="card-body d-grid gap-3">
          <h2 className="h6 mb-0">
            {form.isEditing ? `Edit ${isDiet ? 'Diet' : 'Category'}` : `Create ${isDiet ? 'Diet' : 'Category'}`}
          </h2>

          <form className="row g-2" onSubmit={onSubmit}>
            {!isDiet && (
              <div className="col-md-4">
                <label className="form-label" htmlFor={nameId}>Name</label>
                <input
                  id={nameId}
                  name={nameId}
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            )}
            {isDiet && (
              <div className="col-md-4">
                <label className="form-label" htmlFor={flagsId}>diet_flags</label>
                <input
                  id={flagsId}
                  name={flagsId}
                  className="form-control"
                  value={form.diet_flags}
                  onChange={(e) => setForm({ ...form, diet_flags: e.target.value })}
                />
              </div>
            )}
            <div className="col-md-3 align-self-end d-flex gap-2">
              <button className="btn btn-primary" type="submit">
                {form.isEditing ? 'Save' : 'Create'}
              </button>
              {form.isEditing && (
                <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{isDiet ? 'diet_flags' : 'Name'}</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={3} className="text-muted">No records.</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.id}</strong></td>
                    <td>{isDiet ? (r.diet_flags || '—') : (r.name || '—')}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => startEdit(r)}
                        type="button"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
