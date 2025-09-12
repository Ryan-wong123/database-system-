export default function ItemCard({ name, category, qty, expiry }) {
  return (
    <div className="card h-100 shadow-sm">
      <div className="card-body d-flex justify-content-between align-items-start">
        <div>
          <h5 className="card-title mb-1">{name}</h5>
          <p className="card-subtitle text-muted">{category}</p>
        </div>
        <div className="text-end">
          <div className="fw-bold fs-5">{qty}</div>
          {expiry && <div className="text-muted small">Expiry: {expiry}</div>}
        </div>
      </div>
    </div>
  );
}
