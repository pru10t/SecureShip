"use client";

import React, { useState } from 'react';
import { ethers } from 'ethers';
import ShipmentManagerABI from '../contracts/ShipmentManager.json';
import { SHIPMENT_MANAGER_ADDRESS } from '../contracts/addresses';
import { connectWallet } from '../utils/connectWallet';

export default function ViewBoL() {
  const [account, setAccount] = useState(null);
  const [shipmentId, setShipmentId] = useState('');
  const [bolAdded, setBolAdded] = useState(false);
  const [bolLocation, setBolLocation] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Load shipment core details to check if BoL exists
  async function loadDetails(e) {
    e.preventDefault();
    setError('');
    setAccessDenied(false);
    setBolLocation('');
    setIsLoading(true);
    try {
      await connectWallet();
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const acct = await signer.getAddress();
      setAccount(acct.toLowerCase());

      // Read-only call for shipment
      const contract = new ethers.Contract(
        SHIPMENT_MANAGER_ADDRESS,
        ShipmentManagerABI.abi,
        provider
      );
      const details = await contract.getShipmentCoreDetails(shipmentId);
      setBolAdded(details.bolAdded);
    } catch (e) {
      setError(e?.reason || e?.message || 'Failed to load shipment');
      setBolAdded(false);
    } finally {
      setIsLoading(false);
    }
  }

  // Attempt to view BoL location
  async function handleViewBoL() {
    setError('');
    setAccessDenied(false);
    setBolLocation('');
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const contract = new ethers.Contract(
        SHIPMENT_MANAGER_ADDRESS,
        ShipmentManagerABI.abi,
        provider // view call requires only provider
      );
      const location = await contract.getDocumentLocation(shipmentId);
      setBolLocation(location);
    } catch (e) {
      setAccessDenied(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Background */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh',
          backgroundImage: "url('/darkship.jpeg')",
          backgroundSize: 'cover', backgroundPosition: 'center',
          zIndex: -1,
        }}
      />
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, padding: 20 }}>
        <div style={{ maxWidth: 600, margin: 'auto', backgroundColor: 'rgba(255,255,255,0.9)', padding: 20, borderRadius: 8 }}>
          <h1 style={{ textAlign: 'center', marginBottom: 20 }}>View Bill of Lading</h1>
          {/* Load Shipment Form */}
          <form onSubmit={loadDetails} style={{ textAlign: 'center', marginBottom: 20 }}>
            <input
              type="number"
              placeholder="Shipment ID"
              value={shipmentId}
              onChange={e => setShipmentId(e.target.value)}
              style={{ padding: 8, width: 200, marginRight: 10, borderRadius: 4 }}
              required
            />
            <button disabled={!shipmentId || isLoading} style={{ padding: '8px 16px', borderRadius: 4, backgroundColor: '#007bff', color: '#fff', border: 'none' }}>
              {isLoading ? 'Loading…' : 'Load'}
            </button>
          </form>
          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
          {/* Show View BoL button if BoL is added */}
          {bolAdded && (
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <button
                onClick={handleViewBoL}
                disabled={isLoading}
                style={{ padding: '10px 20px', borderRadius: 4, backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                {isLoading ? 'Fetching…' : 'View BoL'}
              </button>
            </div>
          )}
          {/* Display result or access denied */}
          {bolLocation && (
            <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 20 }}>
              <p><strong>BoL Location URI:</strong></p>
              <p style={{ wordBreak: 'break-all' }}>{bolLocation}</p>
            </div>
          )}
          {accessDenied && <p style={{ color: 'red', textAlign: 'center' }}>Access Denied</p>}
        </div>
      </div>
    </>
  );
}
