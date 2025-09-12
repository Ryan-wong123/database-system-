import { useEffect, useState } from 'react';
import { RecommendationsAPI, PickupAPI } from '../services/api';
import RecommendationList from '../components/RecommendationList';
import PickupReceipt from '../components/PickupReceipt';

export default function Profile() {
  const [recs, setRecs] = useState([]);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await RecommendationsAPI.mine();
        setRecs(data?.suggested_items || []);
      } catch {
        setRecs([]);
      }
    }
    load();
  }, []);

  const demoReceipt = async () => {
    try {
      const { data } = await PickupAPI.receipt(1); // replace with real pickup id
      setReceipt(data);
    } catch {}
  };

  return (
    <div className="d-grid gap-4">
      <section className="d-grid gap-2">
        <h1 className="h4">My Recommendations</h1>
        <RecommendationList items={recs} />
      </section>

      <section className="d-grid gap-3">
        <div className="d-flex justify-content-between align-items-center">
          <h2 className="h5 mb-0">Recent Pickup</h2>
          <button className="btn btn-outline-secondary" onClick={demoReceipt}>
            Load Sample Receipt
          </button>
        </div>
        <PickupReceipt receipt={receipt} />
      </section>
    </div>
  );
}
