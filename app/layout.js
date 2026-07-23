export const metadata = {
  title: "StealHaus — Product Entry Tool",
  description: "Internal tool: paste a product link, review, save to database.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#111", fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
