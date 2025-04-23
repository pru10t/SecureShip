import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  const tiles = [
    { label: "Admin Panel", path: "/admin", emoji: "🔐" },
    { label: "Shipper Dashboard", path: "/shipper", emoji: "🚢" },
    { label: "Carrier Dashboard", path: "/carrier", emoji: "🚛" },
    { label: "Terminal Operator", path: "/terminal", emoji: "🏗️" },
    { label: "Consignee Dashboard", path: "/consignee", emoji: "📥" },
    { label: "View Bill of Lading", path: "/view-bol", emoji: "📄" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `url('darkship.jpeg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "60px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Title */}
      <h1 style={{ color: "#fff", fontSize: "40px", marginBottom: "8px" }}>SecureShip</h1>
      <p style={{ color: "#ddd", fontSize: "18px", marginBottom: "40px" }}>
        Blockchain-powered Logistics Platform
      </p>

      {/* Tile Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          width: "90%",
          maxWidth: "900px",
          marginTop: "60px",
        }}
      >
        {tiles.map((tile) => (
          <div
            key={tile.path}
            onClick={() => navigate(tile.path)}
            style={tileStyle}
          >
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>{tile.emoji}</div>
            <div style={{ fontSize: "18px", fontWeight: "bold" }}>{tile.label}</div>
          </div>
        ))}
      </div>

      <footer style={{ color: "#ccc", marginTop: "60px", fontSize: "14px" }}>
      </footer>
    </div>
  );
}

const tileStyle = {
  backgroundColor: "rgba(255, 255, 255, 0.92)",
  borderRadius: "16px",
  padding: "30px 20px",
  textAlign: "center",
  cursor: "pointer",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  backdropFilter: "blur(6px)",
  fontSize: "16px",
  userSelect: "none",
  fontWeight: "500",
};

tileStyle["&:hover"] = {
  transform: "translateY(-4px)",
  boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
};
