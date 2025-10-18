const pgPool = require("./index");

async function getFoodCategories(){
    const sql = `SELECT * FROM v_food_category`;
    try{
        const { rows } = await pgPool.query(sql);
        return rows;
    }
    catch(err){
        throw err
    }
}

async function searchFoodCategory(name){
    const sql = `SELECT * FROM v_food_category where name like '$1%' `;
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
    const sql = `SELECT * from add_food_category($1)`;
    const values = [
        payload.name
    ];
    

    try {
        const { rows } = await pgPool.query(sql, values);
        return rows?.[0]?.ok === true;
    } catch (err) {
        throw err;
    }
}

module.exports = {getFoodCategories, searchFoodCategory, addFoodCategory};
