const express = require("express");
const router = express.Router();
const { getFoodCategories, searchFoodCategory, addFoodCategory } = require("../db/foodcategory");



//Get food category
router.get("/list", async(req, res)=>{
    try{
        const rows = await getFoodCategories();
        res.json({ ok: true, items: rows, count: rows.length });
        } catch (err) {
            console.error(err);
            res.status(500).json({ ok: false, error: err.message });
        }
})



router.get("/list/:name", async(req, res)=>{
    try{
        const name = req.params.name;
        const rows = await searchFoodCategory(name);

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


router.post("/create", async (req, res) => {
  try {
    const category = await addFoodCategory(req.body);

    if (category) {
      return res.status(201).json({ ok: true, category });
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