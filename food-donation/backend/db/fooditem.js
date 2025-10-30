const pgPool = require("./index");

async function getFoodItems(){
    const sql = `
        SELECT to_jsonb(t) AS fooditem 
        FROM (
            SELECT 
                fi.food_item_id,
                fi.name,
                fi.category_id,
                fc.name AS category_name,
                fi.unit_id,
                fu.unit AS unit_name,
                fi.ingredients,
                ARRAY_AGG(d.diet_id) FILTER (WHERE d.diet_id IS NOT NULL) AS diet_ids,
                ARRAY_AGG(d.diet_flags) FILTER (WHERE d.diet_flags IS NOT NULL) AS diet_flags
            FROM fooditems fi
            JOIN foodcategory fc ON fi.category_id = fc.category_id
            JOIN foodunit fu ON fi.unit_id = fu.unit_id
            LEFT JOIN fooditemdiet fid ON fi.food_item_id = fid.food_item_id
            LEFT JOIN diet d ON fid.diet_id = d.diet_id
            GROUP BY fi.food_item_id, fi.name, fi.category_id, fc.name, fi.unit_id, fu.unit, fi.ingredients
        ) AS t
    `;
    try{
        const { rows } = await pgPool.query(sql);
        return rows;
    }
    catch(err){
        throw err
    }
}

async function getFoodItem(id){
    const sql = `
        SELECT to_jsonb(t) AS fooditem 
        FROM (
            SELECT 
                fi.food_item_id,
                fi.name,
                fi.category_id,
                fc.name AS category_name,
                fi.unit_id,
                fu.unit AS unit_name,
                fi.ingredients,
                ARRAY_AGG(d.diet_id) FILTER (WHERE d.diet_id IS NOT NULL) AS diet_ids,
                ARRAY_AGG(d.diet_flags) FILTER (WHERE d.diet_flags IS NOT NULL) AS diet_flags
            FROM fooditems fi
            JOIN foodcategory fc ON fi.category_id = fc.category_id
            JOIN foodunit fu ON fi.unit_id = fu.unit_id
            LEFT JOIN fooditemdiet fid ON fi.food_item_id = fid.food_item_id
            LEFT JOIN diet d ON fid.diet_id = d.diet_id
            WHERE fi.food_item_id = $1
            GROUP BY fi.food_item_id, fi.name, fi.category_id, fc.name, fi.unit_id, fu.unit, fi.ingredients
        ) AS t
    `;
    const values = [id];
    try{
        const { rows } = await pgPool.query(sql, values);
        return rows[0]?.fooditem;
    }
    catch(err){
        throw err
    }
}

async function addFoodItem(payload) {
const sql = `SELECT to_jsonb(t) AS fooditem FROM add_food_item($1, $2, $3, $4, $5) AS t`;
    const values = [
        payload.name,
        payload.category_id,
        payload.unit_id,
        payload.ingredients,
        payload.diet_ids,
    ];
    

    try {
        const { rows } = await pgPool.query(sql, values);
        return rows[0]?.fooditem;
    } catch (err) {
        throw err;
    }
}


async function updateFoodItem(id, payload){
        const sql = `SELECT to_jsonb(t) AS fooditem FROM update_food_item_overwrite($1,$2,$3,$4,$5,$6) AS t`;
        const values = [id, payload.name, payload.category_id, payload.unit_id, payload.ingredients, payload.diet_ids ?? []];
    try{    
        const { rows } = await pgPool.query(sql, values);
        return rows[0]?.fooditem;
    } catch (err){
        throw err;
    }
}

module.exports = {getFoodItems, getFoodItem, addFoodItem, updateFoodItem };