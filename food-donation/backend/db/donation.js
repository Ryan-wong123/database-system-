const { pgPool } = require("./index");
const ALLOWED_DONATION_STATUSES = new Set(['pending', 'confirmed', 'cancelled', 'completed']);

async function getDonations() {
    const sql = `SELECT to_jsonb(t) AS donations FROM (
    SELECT * FROM v_donations
    ) as t`;
    try {
        const { rows } = await pgPool.query(sql);
        return rows;
    }
    catch (err) {
        throw err
    }
}

async function getDonationsByAccount(donor_id) {
    const sql = `SELECT to_jsonb(t) AS donations FROM (
    SELECT * FROM v_donations where donor_id = $1
    ) as t`;
    try {
        const { rows } = await pgPool.query(sql, [donor_id]);
        return rows;
    }
    catch (err) {
        throw err
    }
}

async function addDonation(payload) {
    const client = await pgPool.connect();
    
    try {
        await client.query('BEGIN');
        
        // 1. Create donation record
        const donationResult = await client.query(
            `INSERT INTO donations (donor_id, location_id, approve_status, created_at)
             VALUES ($1, $2, 'pending', NOW())
             RETURNING donation_id`,
            [payload.donor_id, payload.location_id]
        );
        const donation_id = donationResult.rows[0].donation_id;
        
        // 2. Create food items and donation items (always create new food items)
        for (let i = 0; i < payload.items.length; i++) {
            const item = payload.items[i];
            
            // Always create new food item
            const foodResult = await client.query(
                `INSERT INTO fooditems (name, category_id, unit_id, ingredients)
                 VALUES ($1, $2, $3, $4)
                 RETURNING food_item_id`,
                [item.name, item.category_id, item.unit_id, item.ingredients || item.name]
            );
            const food_item_id = foodResult.rows[0].food_item_id;
            
            // Link diet restrictions if provided
            if (item.diet_ids && Array.isArray(item.diet_ids) && item.diet_ids.length > 0) {
                for (const diet_id of item.diet_ids) {
                    await client.query(
                        `INSERT INTO fooditemdiet (food_item_id, diet_id)
                         VALUES ($1, $2)
                         ON CONFLICT DO NOTHING`,
                        [food_item_id, diet_id]
                    );
                }
            }
            
            // Create donation item
            // normalize to YYYY-MM-DD just in case
            const isoExpiry =
            /^\d{4}-\d{2}-\d{2}$/.test(item.expiry_date)
                ? item.expiry_date
                : (item.expiry_date || "").replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$2-$1");

            await client.query(
            `INSERT INTO donationitems (donation_id, food_item_id, quantity, expiry_date)
            VALUES ($1, $2, $3, $4)`,
            [donation_id, food_item_id, Number(item.qty), isoExpiry]
            );
        }
        
        await client.query('COMMIT');
        
        // Fetch created donation details
        const detailResult = await client.query(
            `SELECT to_jsonb(t) AS donation 
             FROM v_donations t 
             WHERE t.donation_id = $1`,
            [donation_id]
        );
        
        return {
            summary: { donation_id },
            donation: detailResult.rows[0]?.donation
        };
        
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function approveDonation(donation_id) {
    const sql = `SELECT to_jsonb(t) AS approve_results FROM (
    SELECT * from approve_donation($1)) as t`;
    try {
        const { rowCount, rows } = await pgPool.query(sql, [donation_id]);
        return { rows, rowCount };
    }
    catch (err) {
        throw err;
    }
}

async function cancelDonation(donation_id) {
    const sql = `UPDATE donations SET approve_status = $1 WHERE donation_id = $2 and approve_status='pending'; `;
    const values = [
        approve_status = 'cancelled',
        donation_id
    ];
    try {
        const { rowCount, rows } = await pgPool.query(sql, values);
        return { rows, rowCount };
    }
    catch (err) {
        throw err;
    }
}

// TODO: Donation Histrory Query function
async function getDonationHistory(donor_id) {
    const sql = `
    SELECT 
    d.donation_id,
    fi.name              AS food_name,
    fc.name              AS category,
    di.quantity          AS qty,
    fu.unit              AS unit,
    di.expiry_date       AS expiry_date,
    l.name               AS location_name,
    d.created_at         AS donated_at,
    d.approve_status
    FROM donations d
    JOIN donationitems di ON d.donation_id = di.donation_id
    JOIN fooditems fi      ON di.food_item_id = fi.food_item_id
    JOIN foodcategory fc   ON fi.category_id = fc.category_id
    JOIN foodunit fu       ON fi.unit_id = fu.unit_id
    JOIN locations l       ON d.location_id = l.location_id
    WHERE d.donor_id = $1
    ORDER BY di.expiry_date ASC;
    `;
    try {
        const { rows } = await pgPool.query(sql, [donor_id]);
        return rows;
    } catch (err) {
        throw err;
    }
}

module.exports = { getDonations, getDonationsByAccount, addDonation, approveDonation, cancelDonation, getDonationHistory };