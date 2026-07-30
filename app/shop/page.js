"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../../lib/supabase";

const GOLD = "#C9A227";
const GOLD_DARK = "#8F6D16";
const INK = "#1a1a1a";
const CARD_BG = "#f7f5f0";
const BORDER = "#e8e4da";
const PAGE_SIZE = 60;

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  // Filter option lists - fetched once, independent of what's currently loaded,
  // so they always show every real option rather than just what's on screen.
  const [categoryOptions, setCategoryOptions] = useState(["All"]);
  const [brandOptions, setBrandOptions] = useState([]); // [{id, name}]
  const [retailerOptions, setRetailerOptions] = useState([]); // [{id, name}]

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [gender, setGender] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRetailers, setSelectedRetailers] = useState([]);
  const [minDiscount, setMinDiscount] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

  const isFirstRun = useRef(true);
  const searchDebounce = useRef(null);

  // Load filter option lists once on mount
  useEffect(() => {
    loadFilterOptions();
    loadProducts(0);
  }, []);

  // Re-fetch from the start whenever a filter changes (debounced for search)
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      loadProducts(0);
    }, 350);
    return () => clearTimeout(searchDebounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, selectedBrands, selectedRetailers, gender, minDiscount, inStockOnly, sortBy]);

  async function loadFilterOptions() {
    const [{ data: cats }, { data: brandsData }, { data: retailersData }] = await Promise.all([
      supabase.from("products").select("category").eq("still_in_feed", true),
      supabase.from("brands").select("id, name").order("name"),
      supabase.from("retailers").select("id, name").order("name"),
    ]);

    if (cats) {
      const uniqueCats = Array.from(new Set(cats.map((c) => c.category).filter(Boolean))).sort();
      setCategoryOptions(["All", ...uniqueCats]);
    }
    if (brandsData) setBrandOptions(brandsData);
    if (retailersData) setRetailerOptions(retailersData);
  }

  async function loadProducts(offset) {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    setError("");

    try {
      let query = supabase
        .from("products")
        .select("*, brands(name), retailers(name)", { count: "exact" })
        .eq("still_in_feed", true);

      if (category !== "All") query = query.eq("category", category);
      if (gender !== "All") query = query.eq("gender", gender.toLowerCase());
      if (inStockOnly) query = query.neq("stock_status", "out_of_stock");
      if (minDiscount > 0) query = query.gte("discount_percentage", minDiscount);

      if (selectedBrands.length > 0) {
        const ids = brandOptions.filter((b) => selectedBrands.includes(b.name)).map((b) => b.id);
        if (ids.length > 0) query = query.in("brand_id", ids);
      }
      if (selectedRetailers.length > 0) {
        const ids = retailerOptions.filter((r) => selectedRetailers.includes(r.name)).map((r) => r.id);
        if (ids.length > 0) query = query.in("retailer_id", ids);
      }

      if (search.trim()) {
        const term = search.trim().replace(/[,()%]/g, "");
        const matchingBrandIds = brandOptions
          .filter((b) => b.name.toLowerCase().includes(term.toLowerCase()))
          .map((b) => b.id);

        const orParts = [`name.ilike.%${term}%`];
        if (matchingBrandIds.length > 0) {
          orParts.push(`brand_id.in.(${matchingBrandIds.join(",")})`);
        }
        query = query.or(orParts.join(","));
      }

      if (sortBy === "discount") {
        query = query.order("discount_percentage", { ascending: false, nullsFirst: false });
      } else if (sortBy === "price_low") {
        query = query.order("current_price", { ascending: true });
      } else if (sortBy === "price_high") {
        query = query.order("current_price", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      query = query.range(offset, offset + PAGE_SIZE - 1);

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setProducts((prev) => (offset === 0 ? data || [] : [...prev, ...(data || [])]));
        if (count !== null) setTotalCount(count);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
    setLoadingMore(false);
  }

  function handleLoadMore() {
    loadProducts(products.length);
  }

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

      {/* Category row */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 16px 12px", scrollbarWidth: "none" }}>
        {categoryOptions.map((c) => (
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

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px 10px", borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontSize: 12, color: "#888" }}>
          {loading ? "Loading..." : `Showing ${products.length} of ${totalCount} items`}
        </span>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, padding: "14px 16px 24px" }}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onClickItem={logClick} />
        ))}
      </div>

      {!loading && products.length === 0 && (
        <p style={{ textAlign: "center", color: "#999", padding: 60 }}>Nothing matches those filters yet — try widening your search.</p>
      )}

      {!loading && products.length < totalCount && (
        <div style={{ textAlign: "center", padding: "0 16px 40px" }}>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            style={{
              padding: "10px 28px",
              borderRadius: 24,
              border: `1px solid ${INK}`,
              background: loadingMore ? "#eee" : "#fff",
              color: INK,
              fontSize: 14,
              fontWeight: 600,
              cursor: loadingMore ? "not-allowed" : "pointer",
            }}
          >
            {loadingMore ? "Loading..." : `Load more (${totalCount - products.length} remaining)`}
          </button>
        </div>
      )}

      {showFilters && (
        <FilterSheet
          sortBy={sortBy}
          setSortBy={setSortBy}
          gender={gender}
          setGender={setGender}
          brands={brandOptions.map((b) => b.name)}
          selectedBrands={selectedBrands}
          toggleBrand={toggleBrand}
          retailers={retailerOptions.map((r) => r.name)}
          selectedRetailers={selectedRetailers}
          toggleRetailer={toggleRetailer}
          minDiscount={minDiscount}
          setMinDiscount={setMinDiscount}
          inStockOnly={inStockOnly}
          setInStockOnly={setInStockOnly}
          onClear={clearAllFilters}
          onClose={() => setShowFilters(false)}
          resultCount={totalCount}
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
