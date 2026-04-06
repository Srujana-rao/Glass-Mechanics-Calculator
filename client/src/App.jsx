import { useCallback, useId, useRef, useState } from "react";

let nextId = 5;

const defaultRows = [
  { id: 1, formula: "B2O3", coefficient: 60, density: 2.46, bde_kcal: 296 },
  { id: 2, formula: "Bi2O3", coefficient: 20, density: 8.9, bde_kcal: 241.6 },
  { id: 3, formula: "SrO", coefficient: 10, density: 4.7, bde_kcal: 155 },
  { id: 4, formula: "Li2O", coefficient: 10, density: 2.013, bde_kcal: 147 },
];

function fmt(n, decimals) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return Number(n).toFixed(decimals);
}

export default function App() {
  const [compounds, setCompounds] = useState(() => defaultRows.map((r) => ({ ...r })));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const resultsRef = useRef(null);
  const formId = useId();

  const validate = useCallback(() => {
    const errs = {};
    if (compounds.length < 2) {
      errs._general = "At least 2 compounds required";
    }
    compounds.forEach((row) => {
      if (!String(row.formula || "").trim()) {
        errs[`${row.id}-formula`] = "Required";
      }
      if (row.coefficient === "" || row.coefficient == null || Number(row.coefficient) <= 0) {
        errs[`${row.id}-coefficient`] = "Must be > 0";
      }
      if (row.density === "" || row.density == null || Number(row.density) <= 0) {
        errs[`${row.id}-density`] = "Must be > 0";
      }
      if (row.bde_kcal === "" || row.bde_kcal == null || Number(row.bde_kcal) <= 0) {
        errs[`${row.id}-bde_kcal`] = "Must be > 0";
      }
    });
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }, [compounds]);

  const handleCalculate = async () => {
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        compounds: compounds.map((c) => ({
          formula: String(c.formula).trim(),
          coefficient: Number(c.coefficient),
          density: Number(c.density),
          bde_kcal: Number(c.bde_kcal),
        })),
      };
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Calculation failed");
      setResult(data);
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (id, key, value) => {
    setCompounds((rows) => rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };

  const addRow = () => {
    setCompounds((rows) => [
      ...rows,
      { id: nextId++, formula: "", coefficient: 1, density: 1, bde_kcal: 1 },
    ]);
  };

  const removeRow = (id) => {
    setCompounds((rows) => (rows.length <= 2 ? rows : rows.filter((r) => r.id !== id)));
  };

  return (
    <div className="app">
      <header className="hero">
        <h1>Glass Mechanics Calculator</h1>
        <p className="subtitle">Makarov Empirical Model for Glass Elastic Properties</p>
      </header>

      <section className="panel" aria-labelledby={`${formId}-input-heading`}>
        <h2 id={`${formId}-input-heading`} className="section-title">
          Compound input
        </h2>
        <div className="table-wrap">
          <table className="input-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Formula</th>
                <th>Coefficient</th>
                <th>Density (g/cm³)</th>
                <th>BDE (kcal/mol)</th>
                <th aria-label="Remove row" />
              </tr>
            </thead>
            <tbody>
              {compounds.map((row, i) => (
                <tr key={row.id}>
                  <td className="num">{i + 1}</td>
                  <td>
                    <input
                      className={fieldErrors[`${row.id}-formula`] ? "invalid" : ""}
                      type="text"
                      value={row.formula}
                      onChange={(e) => updateRow(row.id, "formula", e.target.value)}
                      onBlur={(e) =>
                        updateRow(row.id, "formula", e.target.value.trim().toUpperCase())
                      }
                      placeholder="e.g. B2O3"
                      aria-invalid={!!fieldErrors[`${row.id}-formula`]}
                    />
                    {fieldErrors[`${row.id}-formula`] && (
                      <span className="field-error">{fieldErrors[`${row.id}-formula`]}</span>
                    )}
                  </td>
                  <td>
                    <input
                      className={fieldErrors[`${row.id}-coefficient`] ? "invalid" : ""}
                      type="number"
                      step="any"
                      min="0"
                      value={row.coefficient}
                      onChange={(e) => updateRow(row.id, "coefficient", e.target.value)}
                      aria-invalid={!!fieldErrors[`${row.id}-coefficient`]}
                    />
                    {fieldErrors[`${row.id}-coefficient`] && (
                      <span className="field-error">{fieldErrors[`${row.id}-coefficient`]}</span>
                    )}
                  </td>
                  <td>
                    <input
                      className={fieldErrors[`${row.id}-density`] ? "invalid" : ""}
                      type="number"
                      step="any"
                      min="0"
                      value={row.density}
                      onChange={(e) => updateRow(row.id, "density", e.target.value)}
                      aria-invalid={!!fieldErrors[`${row.id}-density`]}
                    />
                    {fieldErrors[`${row.id}-density`] && (
                      <span className="field-error">{fieldErrors[`${row.id}-density`]}</span>
                    )}
                  </td>
                  <td>
                    <input
                      className={fieldErrors[`${row.id}-bde_kcal`] ? "invalid" : ""}
                      type="number"
                      step="any"
                      min="0"
                      value={row.bde_kcal}
                      onChange={(e) => updateRow(row.id, "bde_kcal", e.target.value)}
                      aria-invalid={!!fieldErrors[`${row.id}-bde_kcal`]}
                    />
                    {fieldErrors[`${row.id}-bde_kcal`] && (
                      <span className="field-error">{fieldErrors[`${row.id}-bde_kcal`]}</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => removeRow(row.id)}
                      disabled={compounds.length <= 2}
                      title={compounds.length <= 2 ? "Minimum 2 rows" : "Remove row"}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="btn-add" onClick={addRow}>
          ＋ Add compound
        </button>
      </section>

      <div className="calc-wrap">
        <button
          type="button"
          className="btn-calculate"
          onClick={handleCalculate}
          disabled={loading}
        >
          {loading ? (
            <span className="btn-inner">
              <span className="spinner" aria-hidden />
              Calculating…
            </span>
          ) : (
            "Calculate"
          )}
        </button>
        {error && (
          <p className="api-error" role="alert">
            {error}
          </p>
        )}
        {fieldErrors._general && <p className="api-error">{fieldErrors._general}</p>}
      </div>

      {result && (
        <div ref={resultsRef} className="results">
          <section className="panel">
            <h2 className="section-title">Per-compound results</h2>
            <div className="table-wrap scroll">
              <table className="result-table">
                <thead>
                  <tr>
                    <th>Formula</th>
                    <th>MW (g/mol)</th>
                    <th>xi</th>
                    <th>Cation</th>
                    <th>Ox. state</th>
                    <th>n</th>
                    <th>m</th>
                    <th>R (pm)</th>
                    <th>Vi (cm³/mol)</th>
                    <th>Ui (kJ/mol)</th>
                    <th>Gi (kJ/cm³)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.compounds.map((c, idx) => (
                    <tr key={`${idx}-${c.formula}`}>
                      <td className="mono">{c.formula}</td>
                      <td>{fmt(c.MW, 3)}</td>
                      <td>
                        <span className="mono">{fmt(c.xi, 6)}</span>
                        <span className="xi-pct"> ({fmt(c.xi * 100, 4)}%)</span>
                      </td>
                      <td>{c.cation}</td>
                      <td>{c.oxidation}</td>
                      <td>{c.n}</td>
                      <td>{c.m}</td>
                      <td>{fmt(c.R_pm, 2)}</td>
                      <td>{fmt(c.Vi, 4)}</td>
                      <td>{fmt(c.Ui_kJ, 3)}</td>
                      <td>{fmt(c.Gi, 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2 className="section-title">Intermediate values</h2>
            <div className="cards-row">
              <div className="card small">
                <div className="card-label">Vm</div>
                <div className="card-value">
                  {fmt(result.summary.Vm, 4)} <span className="unit">cm³/mol</span>
                </div>
              </div>
              <div className="card small">
                <div className="card-label">Σ(xi·Vi)</div>
                <div className="card-value">
                  {fmt(result.summary.sumXiVi, 4)} <span className="unit">cm³/mol</span>
                </div>
              </div>
              <div className="card small">
                <div className="card-label">Vt</div>
                <div className="card-value mono">{fmt(result.summary.Vt, 6)}</div>
              </div>
              <div className="card small">
                <div className="card-label">Gt</div>
                <div className="card-value">
                  {fmt(result.summary.Gt, 6)} <span className="unit">kJ/cm³</span>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2 className="section-title">Elastic properties</h2>
            <div className="grid-elastic">
              <div className="card elastic">
                <div className="card-head">
                  <span className="card-prop">Young&apos;s modulus</span>
                  <span className="card-symbol">E</span>
                </div>
                <div className="card-value big">
                  {fmt(result.summary.E, 4)} <span className="unit">GPa</span>
                </div>
                <div className="card-formula">8.36 × Vt × Gt</div>
              </div>
              <div className="card elastic">
                <div className="card-head">
                  <span className="card-prop">Bulk modulus</span>
                  <span className="card-symbol">K</span>
                </div>
                <div className="card-value big">
                  {fmt(result.summary.K, 4)} <span className="unit">GPa</span>
                </div>
                <div className="card-formula">10 × Vt² × Gt</div>
              </div>
              <div className="card elastic">
                <div className="card-head">
                  <span className="card-prop">Shear modulus</span>
                  <span className="card-symbol">S</span>
                </div>
                <div className="card-value big">
                  {fmt(result.summary.S, 4)} <span className="unit">GPa</span>
                </div>
                <div className="card-formula">3K / (10.2·Vt − 1)</div>
              </div>
              <div className="card elastic">
                <div className="card-head">
                  <span className="card-prop">Longitudinal modulus</span>
                  <span className="card-symbol">L</span>
                </div>
                <div className="card-value big">
                  {fmt(result.summary.L, 4)} <span className="unit">GPa</span>
                </div>
                <div className="card-formula">K + 4S/3</div>
              </div>
              <div className="card elastic">
                <div className="card-head">
                  <span className="card-prop">Poisson&apos;s ratio</span>
                  <span className="card-symbol">ν</span>
                </div>
                <div className="card-value big mono">{fmt(result.summary.nu, 6)}</div>
                <div className="card-formula">0.5 − 1/(7.2·Vt)</div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
