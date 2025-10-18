const express = require("express");
const router = express.Router();
const { getFoodItems, getFoodItem, addFoodItem } = require("../db/fooditem");


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
        if (rows.length === 0){
            return res.status(404).json({ ok: false, error: "Not found" });
        }

        //have result
        res.json({ ok: true, item: rows[0] });

        //some error
        } catch (err) {
            console.error(err);
            res.status(500).json({ ok: false, error: err.message });
        }
})

//Create Food Item
router.post("/create", async (req, res) => {
  try {
    const success = await addFoodItem(req.body);

    if (success) {
      return res.status(201).json({ ok: true });
    }
    return res.status(500).json({ ok: false, error: "Insert failed" });

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

module.exports = router;