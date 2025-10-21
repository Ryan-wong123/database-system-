const express = require("express");
const router = express.Router();
const { getFoodItems, getFoodItem, addFoodItem, updateFoodItem } = require("../db/fooditem");


//Get food items
//http://127.0.0.1:8000/fooditem/list
router.get("/list", async(req, res)=>{
    try{
        const rows = await getFoodItems();
        res.json({ ok: true, items: rows, count: rows.length });
        } catch (err) {
            console.error(err);
            res.status(500).json({ ok: false, error: err.message });
        }
})


//http://127.0.0.1:8000/fooditem/list/2
router.get("/list/:id", async(req, res)=>{
    try{
        const id = Number(req.params.id);
        const parsed = Number(id);
        if (!Number.isInteger(parsed)) {
            // surface a clear 400-style error to the caller
            const e = new Error(`Invalid id: ${id}`);
            e.status = 400;
            throw e;
        }
        
        const rows = await getFoodItem(id);

        //no result
        if (!rows){
            return res.status(404).json({ ok: false, error: "Not found" });
        }

        //have result
        res.json({ ok: true, item: rows });

        //some error
        } catch (err) {
            console.error(err);
            res.status(500).json({ ok: false, error: err.message });
        }
})

//Create Food Item
router.post("/create", async (req, res) => {
  try {
    const fooditem = await addFoodItem(req.body);

    if (!fooditem) {
      return res.status(500).json({ ok: false, error: "Insert failed" });
    }
      return res.status(201).json({ ok: true, fooditem });
  } catch (err) {
    // Map common Postgres error codes
    if (err.code === "23503") {
      // Fkey violation
      return res
        .status(400)
        .json({ ok: false, error: "Invalid reference: " + err.detail });
    }
    if (err.code === "23505") {
      // Unique constraint violation if have
      return res
        .status(409)
        .json({ ok: false, error: "Duplicate record." });
    }

    // Generic error
    console.error("DB error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/fooditems/:id', async (req, res) => {
  try{
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    // surface a clear 400-style error to the caller
    const e = new Error(`Invalid id: ${id}`);
    e.status = 400;
    throw e;
  }
  const item = await getFoodItem(id);

  //no result
  if (!item){
      return res.status(404).json({ ok: false, error: "Not found" });
  }

  const { name, category_id, unit_id, ingredients, diet_ids } = req.body;
  // 2. Compare values (lightweight equality check)
  const noChange =
    item.name === name &&
    item.category_id === category_id &&
    item.unit_id === unit_id &&
    item.ingredients === ingredients &&
    JSON.stringify(item.diet_ids?.sort()) === JSON.stringify((diet_ids ?? []).sort());

  if (noChange){
    return res.status(200).json({ ok: false, message: 'No changes detected' });
  }

  // 3. Proceed with update
  const rows = await updateFoodItem(id, req.body);
  return res.status(200).json({ ok: true, fooditem: rows[0].fooditem });
  }
  catch(err){
      // Map common Postgres error codes
    if (err.code === "23503") {
      // Fkey violation
      return res
        .status(400)
        .json({ ok: false, error: "Invalid reference: " + err.detail });
    }
    if (err.code === "23505") {
      // Unique constraint violation if have
      return res
        .status(409)
        .json({ ok: false, error: "Duplicate record." });
    }

    // Generic error
    console.error("DB error:", err);
    return res.status(500).json({ ok: false, error: err.message });
}
});

module.exports = router;