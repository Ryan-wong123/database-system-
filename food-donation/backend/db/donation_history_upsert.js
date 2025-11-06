// db/donation_history_upsert.js
const DonationHistory = require("./mongo_schema/donation_history");

function groupRows(donor_id, rows) {
  const byDonation = new Map();
  for (const r of rows) {
    const key = Number(r.donation_id);
    if (!byDonation.has(key)) {
      byDonation.set(key, {
        donor_id: Number(donor_id),
        donation_id: key,
        location_name: r.location_name || null,
        donated_at: r.donated_at ? new Date(r.donated_at) : null,
        approve_status: r.approve_status || "pending",
        items: []
      });
    }
    byDonation.get(key).items.push({
      food_name: r.food_name || "",
      category: r.category || "",
      qty: Number(r.qty) || 0,
      unit: r.unit || "",
      expiry_date: r.expiry_date ? new Date(r.expiry_date) : null
    });
  }
  return [...byDonation.values()];
}

async function upsertDonationHistory(donor_id, rows = []) {
  if (!rows.length) return;
  const docs = groupRows(donor_id, rows);

  const ops = docs.map(doc => ({
    updateOne: {
      filter: { donor_id: doc.donor_id, donation_id: doc.donation_id },
      update: {
        $set: {
          location_name: doc.location_name,
          donated_at: doc.donated_at,
          approve_status: doc.approve_status,
          items: doc.items,
          as_of: new Date(),
          cache_status: "fresh"
        }
      },
      upsert: true
    }
  }));
  const res = await DonationHistory.bulkWrite(ops, { ordered: false });
  return res;
}

async function listDonationHistoryFromMongo(donor_id) {
  return DonationHistory
    .find({ donor_id: Number(donor_id) })
    .sort({ donated_at: -1, createdAt: -1 })
    .lean();
}

module.exports = { upsertDonationHistory, listDonationHistoryFromMongo };
