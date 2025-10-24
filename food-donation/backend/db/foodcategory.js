const pgPool = require("./index");

async function getFoodCategories(){
    const sql = `SELECT to_jsonb(t) AS category FROM (SELECT * FROM v_food_category) as t`;
    try{
        const { rows } = await pgPool.query(sql);
        return rows;
    }
    catch(err){
        throw err
    }
}

async function searchFoodCategory(name){
    const sql = `SELECT to_jsonb(t) AS category FROM ( SELECT * FROM v_food_category where name like '$1%') as t `;
    const values = [name];
    try{
        const { rows } = await pgPool.query(sql, values);
        return rows;
    }
    catch(err){
        throw err
    }
}

async function addFoodCategory(payload) {
    const sql = `SELECT to_jsonb(t) AS category FROM add_food_category($1) AS t`;
    const values = [
        payload.name
    ];
    
    try {
        const { rows } = await pgPool.query(sql, values);
        return rows[0]?.category;
    } catch (err) {
        throw err;
    }
}

module.exports = {getFoodCategories, searchFoodCategory, addFoodCategory};