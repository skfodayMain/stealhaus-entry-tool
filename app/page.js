"use client";

import { useState, useEffect } from "react";

const GOLD = "#C9A227";
const GOLD_LIGHT = "#E8CE7A";

export default function ManagePage() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    loadProducts(page);
  }, [page]);

  async function loadProducts(pageNum) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin-products?page=${pageNum}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setProducts(data.products);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleDelete(id, mode) {
    const confirmMsg =
      mode === "permanent"
        ? "Delete this permanently? This cannot be undone."
        : "Hide this item from the shop and feed? You can still find it later, it won't show as live.";
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin-products/${id}?mode=${mode}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        loadProducts(page);
      }
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleSaveEdit(updatedFields) {
    try {
      const res = await fetch(`/api/admin-products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setEditingProduct(null);
        loadProducts(page);
      }
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0d0d0d", color: "#f5f5f5", fontFamily: "system-ui, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <img src="/logo.png" alt="StealHaus" style={{ height: 40, marginBottom: 4 }} />
        <p style={{ color: "#999", margin: "4px 0 24px" }}>
          Manage Products · {totalCount} total items - page {page} of {totalPages || 1}
        </p>

        {error && <p style={{ color: "#ff8080" }}>{error}</p>}
        {loading && <p style={{ color: "#777" }}>Loading...</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {products.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              onEdit={() => setEditingProduct(p)}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {!loading && products.length === 0 && (
          <p style={{ color: "#666", padding: 40, textAlign: "center" }}>No products found.</p>
        )}

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 32 }}>
          <PageButton disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Previous
          </PageButton>
          <span style={{ color: "#999", fontSize: 13 }}>
            Page {page} of {totalPages || 1}
          </span>
          <PageButton disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </PageButton>
        </div>
      </div>

      {editingProduct && (
        <EditModal
          product={editingProduct}
          onCancel={() => setEditingProduct(null)}
          onSave={handleSaveEdit}
        />
      )}
    </main>
  );
}

function PageButton({ children, disabled, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 6,
        border: "1px solid #333",
        background: disabled ? "#151515" : "#1a1a1a",
        color: disabled ? "#555" : "#ccc",
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function ProductRow({ product, onEdit, onDelete }) {
  const link = product.product_url;
  const statusColors = {
    in_stock: "#8fd88f",
    low_stock: GOLD_LIGHT,
    out_of_stock: "#999",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "#1a1a1a",
        borderRadius: 8,
        padding: 12,
        opacity: product.still_in_feed ? 1 : 0.5,
      }}
    >
      <div style={{ width: 56, height: 56, borderRadius: 6, overflow: "hidden", background: "#111", flexShrink: 0 }}>
        {product.image_url ? (
          <img src={product.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : null}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, color: GOLD_LIGHT }}>{product.brands?.name}</p>
        <p style={{ margin: "2px 0", fontSize: 14, color: "#eee", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {product.name}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
          {product.retailers?.name} · {product.currency} {product.current_price}
          {!product.still_in_feed && <span style={{ color: "#ff8080" }}> · Hidden</span>}
        </p>
      </div>

      <span
        style={{
          fontSize: 11,
          padding: "3px 8px",
          borderRadius: 4,
          background: "#111",
          color: statusColors[product.stock_status] || "#888",
          whiteSpace: "nowrap",
        }}
      >
        {product.stock_status || "unknown"}
      </span>

      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 12, color: GOLD, whiteSpace: "nowrap", textDecoration: "underline" }}
      >
        Check retailer ↗
      </a>

      <button
        onClick={onEdit}
        style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #333", background: "transparent", color: "#ccc", fontSize: 12, cursor: "pointer" }}
      >
        Edit
      </button>
      <button
        onClick={() => onDelete(product.id, "hide")}
        style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #333", background: "transparent", color: "#ccc", fontSize: 12, cursor: "pointer" }}
      >
        {product.still_in_feed ? "Hide" : "Unhide"}
      </button>
      <button
        onClick={() => onDelete(product.id, "permanent")}
        style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #442222", background: "transparent", color: "#ff8080", fontSize: 12, cursor: "pointer" }}
      >
        Delete
      </button>
    </div>
  );
}

function EditModal({ product, onCancel, onSave }) {
  const [form, setForm] = useState({
    name: product.name || "",
    description: product.description || "",
    category: product.category || "",
    gender: product.gender || "",
    current_price: product.current_price || "",
    original_price: product.original_price || "",
    currency: product.currency || "",
    stock_status: product.stock_status || "",
    product_url: product.product_url || "",
    affiliate_url: product.affiliate_url || "",
    image_url: product.image_url || "",
    still_in_feed: product.still_in_feed,
  });
  const [imageUrls, setImageUrls] = useState(
    product.image_urls && product.image_urls.length > 0 ? product.image_urls : [""]
  );

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateImageUrl(index, value) {
    setImageUrls((prev) => prev.map((url, i) => (i === index ? value : url)));
  }

  function addImageUrlField() {
    setImageUrls((prev) => [...prev, ""]);
  }

  function removeImageUrlField(index) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    onSave({
      ...form,
      image_urls: imageUrls.map((u) => u.trim()).filter(Boolean),
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 20px",
        overflowY: "auto",
        zIndex: 100,
      }}
    >
      <div style={{ background: "#1a1a1a", borderRadius: 10, padding: 24, maxWidth: 560, width: "100%" }}>
        <h2 style={{ color: GOLD_LIGHT, fontSize: 18, marginTop: 0 }}>Edit product</h2>

        <Field label="Product name" value={form.name} onChange={(v) => update("name", v)} />
        <Field label="Description" value={form.description} onChange={(v) => update("description", v)} />
        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Category" value={form.category} onChange={(v) => update("category", v)} />
          <Field label="Gender (men/women/unisex)" value={form.gender} onChange={(v) => update("gender", v)} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Original price" value={form.original_price} onChange={(v) => update("original_price", v)} />
          <Field label="Sale price" value={form.current_price} onChange={(v) => update("current_price", v)} />
          <Field label="Currency" value={form.currency} onChange={(v) => update("currency", v)} />
        </div>
        <Field label="Stock status (in_stock / low_stock / out_of_stock)" value={form.stock_status} onChange={(v) => update("stock_status", v)} />
        <Field label="Product URL" value={form.product_url} onChange={(v) => update("product_url", v)} />
        <Field label="Affiliate URL (leave same as product URL until approved)" value={form.affiliate_url} onChange={(v) => update("affiliate_url", v)} />
        <Field label="Main image URL" value={form.image_url} onChange={(v) => update("image_url", v)} />

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, color: "#999", marginBottom: 6 }}>
            Additional images (for the future Instagram/TikTok feed - not shown on the shop grid)
          </label>
          {imageUrls.map((url, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input
                type="text"
                value={url}
                onChange={(e) => updateImageUrl(i, e.target.value)}
                placeholder="https://..."
                style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #333", background: "#0d0d0d", color: "#fff", fontSize: 13 }}
              />
              <button
                onClick={() => removeImageUrlField(i)}
                style={{ padding: "0 10px", borderRadius: 6, border: "1px solid #333", background: "transparent", color: "#999", cursor: "pointer" }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={addImageUrlField}
            style={{ fontSize: 12, color: GOLD_LIGHT, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
          >
            + Add another image
          </button>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#ccc", marginBottom: 20, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={form.still_in_feed}
            onChange={(e) => update("still_in_feed", e.target.checked)}
          />
          Visible on shop page and feed
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleSubmit}
            style={{ padding: "10px 20px", borderRadius: 6, border: "none", background: GOLD, color: "#111", fontWeight: 600, cursor: "pointer" }}
          >
            Save changes
          </button>
          <button
            onClick={onCancel}
            style={{ padding: "10px 20px", borderRadius: 6, border: "1px solid #333", background: "transparent", color: "#ccc", cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 12, flex: 1 }}>
      <label style={{ display: "block", fontSize: 12, color: "#999", marginBottom: 4 }}>{label}</label>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 6,
          border: "1px solid #333",
          background: "#0d0d0d",
          color: "#fff",
          boxSizing: "border-box",
          fontSize: 13,
        }}
      />
    </div>
  );
}
