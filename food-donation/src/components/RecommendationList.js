export default function RecommendationList({ items = [] }) {
  if (!items.length) return <div className="text-muted">No recommendations yet.</div>;
  return (
    <div className="row g-3">
      {items.map((it) => (
        <div key={it.item_id} className="col-md-6">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex justify-content-between">
              <div>
                <div className="fw-semibold">{it.item_name}</div>
                <div className="text-muted small">{(it.reason || []).join(', ')}</div>
              </div>
              <div className="small">
                {it.in_stock ? (
                  <span className="badge text-bg-success">In Stock</span>
                ) : (
                  <span className="badge text-bg-secondary">Out of Stock</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
