const { pgPool } = require("./index");

async function getInventory(){
    const sql = `SELECT to_jsonb(t) AS inventory FROM (SELECT * FROM v_inventory) as t`;
    try{
        const { rows } = await pgPool.query(sql);
        return rows;
    }
    catch(err){
        throw err
    }
}


module.exports = {getInventory};
