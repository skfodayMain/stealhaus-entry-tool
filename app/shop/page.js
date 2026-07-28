"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";

const GOLD = "#C9A227";
const GOLD_DARK = "#8F6D16";
const INK = "#1a1a1a";
const CARD_BG = "#f7f5f0";
const BORDER = "#e8e4da";

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [gender, setGender] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRetailers, setSelectedRetailers] = useState([]);
  const [minDiscount, setMinDiscount] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("products")
      .select("*, brands(name), retailers(name)")
      .eq("still_in_feed", true)
      .order("created_at", { ascending: false })
      .limit(200);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [products]);

  const brands = useMemo(() => {
    const set = new Set(products.map((p) => p.brands?.name).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const retailers = useMemo(() => {
    const set = new Set(products.map((p) => p.retailers?.name).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (selectedBrands.length > 0 && !selectedBrands.includes(p.brands?.name)) return false;
      if (selectedRetailers.length > 0 && !selectedRetailers.includes(p.retailers?.name)) return false;
      if (gender !== "All" && p.gender !== gender.toLowerCase()) return false;
      if (inStockOnly && p.stock_status === "out_of_stock") return false;
      if (minDiscount > 0 && (p.discount_percentage || 0) < minDiscount) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${p.brands?.name || ""} ${p.name || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === "discount") {
      result = [...result].sort((a, b) => (b.discount_percentage || 0) - (a.discount_percentage || 0));
    } else if (sortBy === "price_low") {
      result = [...result].sort((a, b) => (a.current_price || 0) - (b.current_price || 0));
    } else if (sortBy === "price_high") {
      result = [...result].sort((a, b) => (b.current_price || 0) - (a.current_price || 0));
    }

    return result;
  }, [products, category, selectedBrands, selectedRetailers, gender, inStockOnly, minDiscount, search, sortBy]);

  function toggleBrand(name) {
    setSelectedBrands((prev) => (prev.includes(name) ? prev.filter((b) => b !== name) : [...prev, name]));
  }
  function toggleRetailer(name) {
    setSelectedRetailers((prev) => (prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]));
  }

  async function logClick(productId) {
    try {
      await supabase.from("product_clicks").insert([{ product_id: productId }]);
    } catch (e) {
      // fail silently
    }
  }

  const activeFilterCount =
    selectedBrands.length +
    selectedRetailers.length +
    (gender !== "All" ? 1 : 0) +
    (minDiscount > 0 ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  function clearAllFilters() {
    setSelectedBrands([]);
    setSelectedRetailers([]);
    setGender("All");
    setMinDiscount(0);
    setInStockOnly(false);
    setSortBy("newest");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#fff", color: INK, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ textAlign: "center" }}>
        <img src="/banner.jpg" alt="StealHaus - Luxury for Less" style={{ width: "100%", height: "auto", display: "block" }} />
      </div>

      {/* Search */}
      <div style={{ padding: "16px 16px 12px" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍  Search by brand or item..."
          style={{
            width: "100%",
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: "11px 14px",
            fontSize: 14,
            color: INK,
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Category row - horizontally scrollable */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 16px 12px", scrollbarWidth: "none" }}>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{
              flexShrink: 0,
              padding: "7px 16px",
              borderRadius: 20,
              border: `1px solid ${category === c ? GOLD : BORDER}`,
              background: category === c ? GOLD : "transparent",
              color: category === c ? INK : "#444",
              fontSize: 13,
              fontWeight: category === c ? 600 : 400,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Toolbar: item count + Filters button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px 10px", borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontSize: 12, color: "#888" }}>{loading ? "Loading..." : `${filtered.length} items`}</span>
        <button
          onClick={() => setShowFilters(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: INK,
            color: "#fff",
            border: "none",
            padding: "7px 14px",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Filters
          {activeFilterCount > 0 && (
            <span style={{ background: GOLD, color: "#111", fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>
              {activeFilterCount}
            </span>
          )}
          ▾
        </button>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div style={{ display: "flex", gap: 6, padding: "10px 16px 4px", flexWrap: "wrap" }}>
          {selectedBrands.map((b) => (
            <ActiveChip key={b} label={b} onRemove={() => toggleBrand(b)} />
          ))}
          {selectedRetailers.map((r) => (
            <ActiveChip key={r} label={r} onRemove={() => toggleRetailer(r)} />
          ))}
          {gender !== "All" && <ActiveChip label={gender} onRemove={() => setGender("All")} />}
          {minDiscount > 0 && <ActiveChip label={`${minDiscount}%+ off`} onRemove={() => setMinDiscount(0)} />}
          {inStockOnly && <ActiveChip label="In stock only" onRemove={() => setInStockOnly(false)} />}
        </div>
      )}

      {error && <p style={{ padding: "0 16px", color: "#c0392b" }}>{error}</p>}

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, padding: "14px 16px 40px" }}>
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} onClickItem={logClick} />
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <p style={{ textAlign: "center", color: "#999", padding: 60 }}>Nothing matches those filters yet — try widening your search.</p>
      )}

      {/* Bottom sheet */}
      {showFilters && (
        <FilterSheet
          sortBy={sortBy}
          setSortBy={setSortBy}
          gender={gender}
          setGender={setGender}
          brands={brands}
          selectedBrands={selectedBrands}
          toggleBrand={toggleBrand}
          retailers={retailers}
          selectedRetailers={selectedRetailers}
          toggleRetailer={toggleRetailer}
          minDiscount={minDiscount}
          setMinDiscount={setMinDiscount}
          inStockOnly={inStockOnly}
          setInStockOnly={setInStockOnly}
          onClear={clearAllFilters}
          onClose={() => setShowFilters(false)}
          resultCount={filtered.length}
        />
      )}
    </main>
  );
}

function ActiveChip({ label, onRemove }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${GOLD}`,
        color: GOLD_DARK,
        fontSize: 12,
        padding: "4px 10px",
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      {label}
      <span onClick={onRemove} style={{ cursor: "pointer", fontWeight: 700 }}>
        ✕
      </span>
    </div>
  );
}

function ProductCard({ product, onClickItem }) {
  const discount = product.discount_percentage;
  const link = product.affiliate_url || product.product_url;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onClickItem && onClickItem(product.id)}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ position: "relative", aspectRatio: "3/4", background: "#e5e0d3" }}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
          ) : null}

          {discount ? (
            <span
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                background: GOLD,
                color: "#1a1a1a",
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 7px",
                borderRadius: 4,
              }}
            >
              -{discount}%
            </span>
          ) : null}

          {product.stock_status === "low_stock" && (
            <span style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 10, padding: "3px 8px", borderRadius: 4 }}>
              Low stock
            </span>
          )}
          {product.stock_status === "out_of_stock" && (
            <span style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,0.7)", color: "#ddd", fontSize: 10, padding: "3px 8px", borderRadius: 4 }}>
              Sold out
            </span>
          )}
        </div>

        <div style={{ padding: "9px 10px 12px" }}>
          <p style={{ margin: 0, fontSize: 11, color: GOLD_DARK, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
            {product.brands?.name}
          </p>
          <p style={{ margin: "3px 0 6px", fontSize: 12, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {product.name}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            {product.original_price && product.original_price !== product.current_price && (
              <span style={{ fontSize: 11, color: "#999", textDecoration: "line-through" }}>
                {product.currency} {product.original_price}
              </span>
            )}
            <span style={{ fontSize: 14, color: "#111", fontWeight: 700 }}>
              {product.currency} {product.current_price}
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 10, color: "#aaa" }}>{product.retailers?.name}</p>
        </div>
      </div>
    </a>
  );
}

function FilterSheet({
  sortBy,
  setSortBy,
  gender,
  setGender,
  brands,
  selectedBrands,
  toggleBrand,
  retailers,
  selectedRetailers,
  toggleRetailer,
  minDiscount,
  setMinDiscount,
  inStockOnly,
  setInStockOnly,
  onClear,
  onClose,
  resultCount,
}) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 100 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", width: "100%", maxWidth: 600, margin: "0 auto", borderRadius: "20px 20px 0 0", padding: "18px 20px 24px", maxHeight: "82vh", overflowY: "auto" }}
      >
        <div style={{ width: 40, height: 4, background: "#ddd", borderRadius: 2, margin: "0 auto 14px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: INK }}>Filters</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span onClick={onClear} style={{ fontSize: 13, color: GOLD_DARK, cursor: "pointer" }}>
              Clear all
            </span>
            <span
              onClick={onClose}
              style={{
                fontSize: 15,
                color: "#666",
                cursor: "pointer",
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: "#f0f0f0",
              }}
            >
              ✕
            </span>
          </div>
        </div>

        <FilterGroup label="Sort by">
          {["newest", "discount", "price_low", "price_high"].map((val) => (
            <Option
              key={val}
              label={{ newest: "Newest", discount: "Biggest discount", price_low: "Price: low to high", price_high: "Price: high to low" }[val]}
              selected={sortBy === val}
              onClick={() => setSortBy(val)}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Gender">
          {["All", "Women", "Men", "Unisex"].map((g) => (
            <Option key={g} label={g} selected={gender === g} onClick={() => setGender(g)} />
          ))}
        </FilterGroup>

        {brands.length > 0 && (
          <FilterGroup label="Brand">
            {brands.map((b) => (
              <Option key={b} label={b} selected={selectedBrands.includes(b)} onClick={() => toggleBrand(b)} />
            ))}
          </FilterGroup>
        )}

        {retailers.length > 0 && (
          <FilterGroup label="Retailer">
            {retailers.map((r) => (
              <Option key={r} label={r} selected={selectedRetailers.includes(r)} onClick={() => toggleRetailer(r)} />
            ))}
          </FilterGroup>
        )}

        <FilterGroup label="Minimum discount">
          {[0, 30, 50, 70].map((d) => (
            <Option key={d} label={d === 0 ? "Any" : `${d}%+`} selected={minDiscount === d} onClick={() => setMinDiscount(d)} />
          ))}
        </FilterGroup>

        <FilterGroup label="Availability">
          <Option label="In stock only" selected={inStockOnly} onClick={() => setInStockOnly(!inStockOnly)} />
        </FilterGroup>

        <div
          onClick={onClose}
          style={{ background: INK, color: "#fff", textAlign: "center", padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600, marginTop: 8, cursor: "pointer" }}
        >
          Show {resultCount} items
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, margin: "0 0 10px" }}>{label}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{children}</div>
    </div>
  );
}

function Option({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 18,
        border: `1px solid ${selected ? GOLD : BORDER}`,
        background: selected ? GOLD : "transparent",
        color: selected ? INK : "#444",
        fontSize: 13,
        fontWeight: selected ? 600 : 400,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
