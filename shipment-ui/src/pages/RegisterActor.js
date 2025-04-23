import { useState } from "react";
import { ethers } from "ethers";
import ActorRegistryABI from "../contracts/ActorRegistry.json";
import { ACTOR_REGISTRY_ADDRESS } from "../contracts/addresses";
import { connectWallet, getProvider } from "../utils/connectWallet";

export default function RegisterActor() {
  const [actorAddress, setActorAddress] = useState("");
  const [role, setRole] = useState("1");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); // ✅ New

  const handleRegister = async () => {
    try {
      const account = await connectWallet();
      const provider = getProvider();
      const signer = await provider.getSigner();
      const registry = new ethers.Contract(ACTOR_REGISTRY_ADDRESS, ActorRegistryABI.abi, signer);

      const tx = await registry.registerActor(actorAddress, role);
      await tx.wait();

      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000);
    } catch (err) {
      console.error(err);
      const reasonMatch = err?.reason || err?.error?.message || "Unknown error occurred";
      setErrorMessage(reasonMatch);
      setShowErrorPopup(true);
      setTimeout(() => setShowErrorPopup(false), 4000);
    }
  };

  return (
    <div
      style={{
        backgroundImage: `url('ship.webp')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* ✅ Success popup */}
      {showSuccessPopup && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: "#28a745",
            color: "white",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
            fontSize: "16px",
            zIndex: 9999,
            transition: "opacity 0.5s ease-in-out"
          }}
        >
          ✅ Actor registered successfully!
        </div>
      )}

      {/* ❌ Error popup */}
      {showErrorPopup && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: "#dc3545",
            color: "white",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
            fontSize: "15px",
            maxWidth: "300px",
            zIndex: 9999,
            transition: "opacity 0.5s ease-in-out",
            whiteSpace: "pre-line"
          }}
        >
          ❌ Error: {errorMessage}
        </div>
      )}

      {/* Top bar */}
      <div
        style={{
          backgroundColor: '#000',
          color: '#fff',
          padding: '16px 24px',
          fontSize: '20px',
          fontWeight: 'bold',
          textAlign: 'center'
        }}
      >
        SecureShip
      </div>

      {/* Centered card */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100vh - 64px)',
        }}
      >
        <div
          style={{
            backgroundColor: '#fff',
            padding: '40px',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            width: '100%',
            maxWidth: '400px',
            textAlign: 'center',
            height: '300px',
          }}
        >
          <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>Register Actor</h2>

          <input
            placeholder="Actor Address"
            value={actorAddress}
            onChange={(e) => setActorAddress(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid #ccc',
            }}
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '24px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid #ccc',
            }}
          >
            <option value="1">Shipper</option>
            <option value="2">Carrier</option>
            <option value="3">Consignee</option>
            <option value="4">Terminal Operator</option>
          </select>

          <button
            onClick={handleRegister}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              borderRadius: '8px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
