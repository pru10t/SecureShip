import { useState } from "react";
import { ethers } from "ethers";
import ActorRegistryABI from "../contracts/ActorRegistry.json";
import { ACTOR_REGISTRY_ADDRESS } from "../contracts/addresses";
import { connectWallet, getProvider } from "../utils/connectWallet";

export default function RegisterActor() {
  const [actorAddress, setActorAddress] = useState("");
  const [role, setRole] = useState("1"); // Default to Shipper
  const [status, setStatus] = useState("");

  const handleRegister = async () => {
    try {
      const account = await connectWallet();
      const provider = getProvider();
      const signer = await provider.getSigner();
      const registry = new ethers.Contract(ACTOR_REGISTRY_ADDRESS, ActorRegistryABI.abi, signer);

      const tx = await registry.registerActor(actorAddress, role);
      await tx.wait();

      setStatus("Actor registered successfully!");
    } catch (err) {
      console.error(err);
      setStatus("Error registering actor");
    }
  };

  
  return (
    <div
    style={{
      backgroundImage: `url('ship.webp')`, // 🔁 Replace with your image path
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
    }}
  >
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
          height: 'calc(100vh - 64px)', // adjust to account for top bar height
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
  
          <p style={{ marginTop: '16px', fontSize: '14px', color: '#333' }}>{status}</p>
        </div>
      </div>
    </div>
  );  
    
}
