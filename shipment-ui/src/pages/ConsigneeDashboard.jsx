"use client";

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ShipmentManagerABI from '../contracts/ShipmentManager.json';
import { SHIPMENT_MANAGER_ADDRESS } from '../contracts/addresses';
import { connectWallet } from '../utils/connectWallet';

export default function ConsigneeDashboard() {
  const [account, setAccount] = useState(null);
  const [shipmentId, setShipmentId] = useState('');
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const STATUS_LABELS = ["Created", "PickedUp", "InTransit", "Delivered"];

  // Connect wallet on mount
  useEffect(() => {
    (async () => {
      try {
        await connectWallet();
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send('eth_requestAccounts', []);
        const signer = provider.getSigner();
        const acct = await signer.getAddress();
        setAccount(acct.toLowerCase());
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Load core shipment details
  async function loadDetails() {
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        SHIPMENT_MANAGER_ADDRESS,
        ShipmentManagerABI.abi,
        provider
      );
      const d = await contract.getShipmentCoreDetails(shipmentId);
      setDetails({
        shipper: d.shipper.toLowerCase(),
        carrier: d.carrier.toLowerCase(),
        consignee: d.consignee.toLowerCase(),
        status: Number(d.status),
        pickupTimestamp: Number(d.pickupTimestamp),
        deliveryTimestamp: Number(d.deliveryTimestamp),
      });
    } catch (e) {
      setError(e?.reason || e?.message || 'Failed to load shipment');
      setDetails(null);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle marking as delivered
  async function handleMarkDelivered() {
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        SHIPMENT_MANAGER_ADDRESS,
        ShipmentManagerABI.abi,
        signer
      );
      const tx = await contract.updateShipmentStatus(shipmentId, 3); // 3 = Delivered
      await tx.wait(1);
      setSuccess('Shipment marked as Delivered!');
      await loadDetails();
    } catch (e) {
      setError(e?.reason || e?.message || 'Failed to update status');
    } finally {
      setIsLoading(false);
    }
  }

  // Helper to format timestamp
  const formatTime = (ts) => ts > 0 ? new Date(ts * 1000).toLocaleString() : '—';

  return (
    <>
      {/* Full-screen background image */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh',
          backgroundImage: `url('/darkship.jpeg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: -1,
        }}
      />

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 1, padding: 20 }}>
        <div style={{ maxWidth: 600, margin: 'auto', backgroundColor: 'rgba(255,255,255,0.9)', padding: 20, borderRadius: 8 }}>

          <h1 style={{ textAlign: 'center', marginBottom: 20 }}>Consignee Dashboard</h1>

          {/* Lookup Shipment */}
          <form onSubmit={e => { e.preventDefault(); loadDetails(); }} style={{ textAlign: 'center', marginBottom: 20 }}>
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
          {success && <p style={{ color: 'green', textAlign: 'center' }}>{success}</p>}

          {/* Display Shipment Details */}
          {details && (
            <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 20, marginBottom: 20 }}>
              <p><strong>ID:</strong> {shipmentId}</p>
              <p><strong>Status:</strong> {STATUS_LABELS[details.status]}</p>
              <p><strong>Picked Up At:</strong> {formatTime(details.pickupTimestamp)}</p>
              <p><strong>Delivered At:</strong> {formatTime(details.deliveryTimestamp)}</p>
            </div>
          )}

          {/* Mark as Delivered button for consignee */}
          {details && account === details.consignee && details.status === 2 && (
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <button
                onClick={handleMarkDelivered}
                disabled={isLoading}
                style={{ padding: '10px 20px', borderRadius: 4, backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                {isLoading ? 'Processing…' : 'Mark as Delivered'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
