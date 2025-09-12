export default function PickupReceipt({ receipt }) {
  if (!receipt) return null;
  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h5 className="card-title mb-1">Pickup #{receipt.pickup_id}</h5>
        <p className="text-muted small mb-3">
          Completed: {new Date(receipt.completed_at).toLocaleString()}
        </p>
        <ul className="list-group mb-3">
          {(receipt.lines || []).map((ln) => (
            <li key={ln.line_id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-semibold">{ln.item_name}</div>
                <small className="text-muted">Lot {ln.lot_id}</small>
              </div>
              <span className="badge text-bg-secondary">{ln.qty_collected}</span>
            </li>
          ))}
        </ul>
        <div className="fw-semibold">Total Items: {receipt.total_items}</div>
      </div>
    </div>
  );
}
