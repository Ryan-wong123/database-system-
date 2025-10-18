const pgPool = require("./index");

async function getFoodItems(){
    const sql = `SELECT * FROM v_food_items`;
    try{
        const { rows } = await pgPool.query(sql);
        return rows;
    }
    catch(err){
        throw err
    }
}

async function getFoodItem(id){
    const sql = `SELECT * FROM v_food_items where food_item_id = $1 `;
    const values = [id];
    try{
        const { rows } = await pgPool.query(sql, values);
        return rows;
    }
    catch(err){
        throw err
    }
}

async function addFoodItem(payload) {
    const sql = `SELECT add_food_item($1,$2,$3,$4,$5) AS ok`;
    const values = [
        payload.name,
        payload.category_id,
        payload.unit_id,
        payload.ingredients,
        payload.diet_ids,
    ];
    

    try {
        const { rows } = await pgPool.query(sql, values);
        return rows?.[0]?.ok === true;
    } catch (err) {
        throw err;
    }
}

module.exports = {getFoodItems, getFoodItem, addFoodItem };
