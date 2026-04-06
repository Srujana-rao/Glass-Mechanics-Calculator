import express from "express";
import cors from "cors";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { calculate, getCationAndOxygen, getMolecularWeight } from "./calculate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

function validateAndCalculate(body) {
  const { compounds } = body;
  if (!Array.isArray(compounds)) {
    const err = new Error("Request body must include compounds array");
    err.status = 400;
    throw err;
  }
  if (compounds.length < 2) {
    const err = new Error("At least 2 compounds required");
    err.status = 400;
    throw err;
  }

  for (const c of compounds) {
    if (c.density <= 0 || c.bde_kcal <= 0) {
      const err = new Error("Density and BDE must be positive");
      err.status = 400;
      throw err;
    }
    if (typeof c.formula !== "string" || !c.formula.trim()) {
      const err = new Error("Formula must not be empty");
      err.status = 400;
      throw err;
    }
    if (typeof c.coefficient !== "number" || c.coefficient <= 0) {
      const err = new Error("Coefficient must be positive");
      err.status = 400;
      throw err;
    }
  }

  for (const c of compounds) {
    try {
      getMolecularWeight(c.formula);
      getCationAndOxygen(c.formula);
    } catch (e) {
      if (e.message.startsWith("Unknown element:")) {
        const err = new Error(e.message);
        err.status = 400;
        throw err;
      }
      if (e.message === "FORMULA_NO_OXYGEN") {
        const err = new Error("Formula must contain oxygen (O)");
        err.status = 400;
        throw err;
      }
      if (e.message === "FORMULA_NO_CATION") {
        const err = new Error("No cation found in formula");
        err.status = 400;
        throw err;
      }
      throw e;
    }
  }

  try {
    return calculate(compounds);
  } catch (e) {
    if (e.message.startsWith("No ionic radius data for:")) {
      const err = new Error(e.message);
      err.status = 400;
      throw err;
    }
    throw e;
  }
}

app.post("/api/calculate", (req, res) => {
  try {
    const result = validateAndCalculate(req.body);
    const compoundsOut = result.compounds.map(
      ({
        formula,
        MW,
        xi,
        cation,
        oxidation,
        n,
        m,
        R_pm,
        Vi,
        Ui_kJ,
        Gi,
      }) => ({
        formula,
        MW,
        xi,
        cation,
        oxidation,
        n,
        m,
        R_pm,
        Vi,
        Ui_kJ,
        Gi,
      })
    );
    res.json({
      summary: result.summary,
      compounds: compoundsOut,
    });
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({ message: e.message || "Server error" });
  }
});

const clientDist = path.join(__dirname, "..", "client", "dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    const indexPath = path.join(clientDist, "index.html");
    if (!existsSync(indexPath)) {
      return next();
    }
    res.sendFile(indexPath, (err) => {
      if (err) next(err);
    });
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
