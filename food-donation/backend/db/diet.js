const pgPool = require("./index");

async function getDiets(){
    const sql = `SELECT to_jsonb(t) AS diet FROM (SELECT * FROM v_diet) as t`;
    try{
        const { rows } = await pgPool.query(sql);
        return rows;
    }
    catch(err){
        throw err
    }
}

async function searchDiet(name){
    const sql = `SELECT to_jsonb(t) AS diet FROM ( SELECT * FROM v_diet where diet_flags ILIKE $1 || '%') as t `;
    const values = [name];
    try{
        const { rows } = await pgPool.query(sql, values);
        return rows;
    }
    catch(err){
        throw err
    }
}

async function addDiet(payload) {
    const sql = `SELECT to_jsonb(t) AS diet FROM add_diet($1) AS t`;
    const values = [
        payload.diet_flags
    ];
    
    try {
        const { rows } = await pgPool.query(sql, values);
        return rows[0]?.diet;
    } catch (err) {
        throw err;
    }
}

async function updateDiet(id, payload) {
    const sql = `SELECT to_jsonb(t) AS diet FROM update_diet($1, $2) AS t`;
    const values = [
        id,
        payload.diet_flags
    ];
    
    try {
        const { rows } = await pgPool.query(sql, values);
        return rows[0]?.diet;
    } catch (err) {
        throw err;
    }
}

module.exports = {getDiets, searchDiet, addDiet, updateDiet};
