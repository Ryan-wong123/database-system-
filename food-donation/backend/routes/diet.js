const express = require("express");
const router = express.Router();
const { getDiets, searchDiet, addDiet, updateDiet} = require("../db/diet");



//Get food category
router.get("/list", async(req, res)=>{
    try{
        const result = await getDiets();
        res.json({ ok: true, items: result, count: result.length });
        } catch (err) {
            console.error(err);
            res.status(500).json({ ok: false, error: err.message });
        }
})



router.get("/list/:name", async(req, res)=>{
    try{
        const name = req.params.name;
        const result = await searchDiet(name);

        //no result
        if (result.length === 0){
            return res.status(404).json({ ok: false, error: "Not found" });
        }

        //have result
        res.json({ ok: true, item: result[0] });

        //some error
        } catch (err) {
            console.error(err);
            res.status(500).json({ ok: false, error: err.message });
        }
})


router.post("/create", async (req, res) => {
  try {
    const result = await addDiet(req.body);

    if (result) {
      return res.status(201).json({ ok: true, result });
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


router.put("/update/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      // surface a clear 400-style error to the caller
      const e = new Error(`Invalid id: ${id}`);
      e.status = 400;
      throw e;
    }
    const result = await updateDiet(id, req.body);

    if (result) {
      return res.status(201).json({ ok: true, result });
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