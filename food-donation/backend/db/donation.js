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

    // normalize each item
    const normalized = payload.items.map((it) => {
      const qty = Number(it.qty);
      if (!it.name || !it.category_id || !it.unit_id || !Number.isFinite(qty) || qty < 1) {
        throw new Error(`Invalid item: ${JSON.stringify(it)}`);
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
        name: it.name.trim(),
        category_id: Number(it.category_id),
        unit_id: Number(it.unit_id),
        ingredients: (it.ingredients && String(it.ingredients).trim()) || it.name.trim(),
        diet_ids: Array.isArray(it.diet_ids) ? it.diet_ids.map(Number).filter(Boolean) : [],
        qty,
        expiry
      };
    });

    // ---- 1) DE-DUPLICATE items BEFORE inserting ----
    // Key: same name+category+unit+ingredients+expiry => merge qty and union diet_ids
    const map = new Map();
    for (const it of normalized) {
      const key = [
        it.name,
        it.category_id,
        it.unit_id,
        it.ingredients,
        it.expiry || ""
      ].join("|");

      if (!map.has(key)) {
        map.set(key, { ...it, diet_set: new Set(it.diet_ids) });
      } else {
        const cur = map.get(key);
        cur.qty += it.qty;
        for (const d of it.diet_ids) cur.diet_set.add(d);
      }
    }
    const deduped = Array.from(map.values()).map((x) => ({
      name: x.name,
      category_id: x.category_id,
      unit_id: x.unit_id,
      ingredients: x.ingredients,
      diet_ids: Array.from(x.diet_set.values()),
      qty: x.qty,
      expiry: x.expiry
    }));

    await client.query("BEGIN");

    // ---- 2) Create donation ----
    const dRes = await client.query(
      "SELECT * FROM donation_create($1,$2)",
      [payload.donor_id, payload.location_id]
    );
    const donation_id = dRes.rows[0].donation_id;

    // ---- 3) For each deduped item: find-or-create food, link diets, add donation item ----
    for (const it of deduped) {
      const fRes = await client.query(
        "SELECT * FROM fooditem_find_or_create($1,$2,$3,$4)",
        [it.name, it.category_id, it.unit_id, it.ingredients]
      );
      const food_item_id = fRes.rows[0].food_item_id;

      if (it.diet_ids.length) {
        for (const did of it.diet_ids) {
          await client.query("SELECT fooditemdiet_link($1,$2)", [food_item_id, did]);
        }
      }

      await client.query(
        "SELECT donationitem_create($1,$2,$3,$4::date)",
        [donation_id, food_item_id, it.qty, it.expiry]
      );
    }

    await client.query("COMMIT");

    // ---- 4) Read back detail (1 row JSON) ----
    const detail = await client.query(
      "SELECT donation_detail_json($1) AS donation",
      [donation_id]
    );

    return {
      summary: { donation_id },
      donation: detail.rows[0]?.donation ?? null
    };
  } catch (err) {
    await client.query("ROLLBACK");
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