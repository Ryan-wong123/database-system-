const pgPool = require("./index");
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

// TODO: Donation Food Query function
async function getDonationFood(donation_id) {

}

// TODO: Donation Histrory Query function
async function getDonationHistory(donor_id) {
    const sql = `
    SELECT 
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

module.exports = { getDonations, getDonationsByAccount, approveDonation, cancelDonation, getDonationFood, getDonationHistory };