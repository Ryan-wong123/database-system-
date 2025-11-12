const { pgPool } = require("./index");
const ALLOWED_DONATION_STATUSES = new Set(['pending', 'confirmed', 'cancelled', 'completed']);

async function getDonations() {
  const { rows } = await pgPool.query("SELECT to_jsonb(t) AS donations FROM donations_list() AS t");
  return rows; // [{ donations: {...} }, ...] matches your previous style
}

async function getDonationsByAccount(donor_id) {
  const { rows } = await pgPool.query(
    "SELECT to_jsonb(t) AS donations FROM donations_by_account($1) AS t",
    [donor_id]
  );
  return rows;
}

async function addDonation(payload) {
  const client = await pgPool.connect();
  try {
    // ---- 0) Validate + normalize ----
    if (!payload?.donor_id || !payload?.location_id || !Array.isArray(payload.items)) {
      throw new Error("Missing donor_id, location_id, or items");
    }

    // normalize each item (no de-dup, keep order)
    const normalized = payload.items.map((it, i) => {
      const qty = Number(it.qty);
      if (!it.name || !it.category_id || !it.unit_id || !Number.isFinite(qty) || qty < 1) {
        throw new Error(`Invalid item at index ${i}: ${JSON.stringify(it)}`);
      }

      // normalize expiry to YYYY-MM-DD or null
      let expiry = null;
      const raw = it.expiry_date || "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        expiry = raw;
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        expiry = `${m[3]}-${m[2]}-${m[1]}`;
      }

      return {
        name: String(it.name).trim(),
        category_id: Number(it.category_id),
        unit_id: Number(it.unit_id),
        ingredients: (it.ingredients && String(it.ingredients).trim()) || String(it.name).trim(),
        diet_ids: Array.isArray(it.diet_ids) ? it.diet_ids.map(Number).filter(Boolean) : [],
        qty,
        expiry
      };
    });

    await client.query("BEGIN");

    // ---- 1) Create donation ----
    const dRes = await client.query(
      "SELECT * FROM donation_create($1,$2)",
      [payload.donor_id, payload.location_id]
    );
    const donation_id = dRes.rows[0].donation_id;

    // ---- 2) Insert EVERY line as its own DonationItems row ----
    for (const it of normalized) {
      // still reuse the same FoodItems master (find-or-create by name/category/unit/ingredients)
      const fRes = await client.query(
        "SELECT * FROM fooditem_find_or_create($1,$2,$3,$4)",
        [it.name, it.category_id, it.unit_id, it.ingredients]
      );
      const food_item_id = fRes.rows[0].food_item_id;

      // link diets (if any)
      if (it.diet_ids.length) {
        for (const did of it.diet_ids) {
          await client.query("SELECT fooditemdiet_link($1,$2)", [food_item_id, did]);
        }
      }

      // one DonationItems row per line, even if identical to another
      await client.query(
        "SELECT donationitem_create($1,$2,$3,$4::date)",
        [donation_id, food_item_id, it.qty, it.expiry]
      );
    }

    await client.query("COMMIT");

    // ---- 3) Read back detail (1 row JSON) ----
    const detail = await client.query(
      "SELECT donation_detail_json($1) AS donation",
      [donation_id]
    );

    return {
      summary: { donation_id },
      donation: detail.rows[0]?.donation ?? null
    };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    throw err;
  } finally {
    client.release();
  }
}



async function approveDonation(donation_id) {
  const { rowCount, rows } = await pgPool.query(
    "SELECT * FROM donation_approve($1)",
    [donation_id]
  );
  return { rowCount, rows };
}

async function cancelDonation(donation_id) {
  const { rowCount, rows } = await pgPool.query(
    "SELECT * FROM donation_cancel($1)",
    [donation_id]
  );
  return { rowCount, rows };
}

async function getDonationHistory(donor_id) {
  const { rows } = await pgPool.query(
    "SELECT * FROM donation_history($1)",
    [donor_id]
  );
  return rows;
}

module.exports = { getDonations, getDonationsByAccount, addDonation, approveDonation, cancelDonation, getDonationHistory };