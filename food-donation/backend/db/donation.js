const pgPool = require("./index");
const ALLOWED_DONATION_STATUSES = new Set(['pending','confirmed','cancelled','completed']);
async function getDonations(){
    const sql = `SELECT to_jsonb(t) AS donations FROM (
    SELECT * FROM v_donations
    ) as t`;
    try{
        const { rows } = await pgPool.query(sql);
        return rows;
    }
    catch(err){
        throw err
    }
}

async function getDonationsByAccount(donor_id){
    const sql = `SELECT to_jsonb(t) AS donations FROM (
    SELECT * FROM v_donations where donor_id = $1
    ) as t`;
    try{
        const { rows } = await pgPool.query(sql, [donor_id]);
        return rows;
    }
    catch(err){
        throw err
    }
}

async function approveDonation(donation_id){
    const sql = `SELECT to_jsonb(t) AS approve_results FROM (
    SELECT * from approve_donation($1)) as t`;
    try{
        const { rowCount, rows } = await pgPool.query(sql, [donation_id]);
        return {rows, rowCount};
    }
    catch(err){
        throw err;
    }
}


async function cancelDonation(donation_id){
    const sql = `UPDATE donations SET approve_status = $1 WHERE donation_id = $2 and approve_status='pending'; `;
    const values = [
        approve_status = 'cancelled',
        donation_id
    ];
    try{
        const {rowCount, rows } = await pgPool.query(sql,values);
        return {rows, rowCount};
    }
    catch(err){
        throw err;
    }
}
module.exports = {getDonations, getDonationsByAccount, approveDonation, cancelDonation};