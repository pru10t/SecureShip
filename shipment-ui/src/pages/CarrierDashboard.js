"use client";

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ShipmentManagerABI from '../contracts/ShipmentManager.json';
import { SHIPMENT_MANAGER_ADDRESS } from '../contracts/addresses';
import { connectWallet, getProvider } from '../utils/connectWallet';

export default function CarrierDashboard() {
  const [account, setAccount] = useState(null);
  const [shipmentId, setShipmentId] = useState('');
  const [details, setDetails] = useState(null);
  const [docHash, setDocHash] = useState('');
  const [docLocation, setDocLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const STATUS_LABELS = ["Created", "PickedUp", "InTransit", "Delivered"];

  // Connect wallet and store account
  useEffect(() => {
    (async () => {
      try {
        await connectWallet();
        const provider = getProvider();
        const [acct] = await provider.send('eth_requestAccounts', []);
        setAccount(acct.toLowerCase());
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Fetch shipment details
  async function loadDetails() {
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const provider = getProvider();
      const contract = new ethers.Contract(
        SHIPMENT_MANAGER_ADDRESS,
        ShipmentManagerABI.abi,
        provider
      );
      const d = await contract.getShipmentCoreDetails(shipmentId);
      setDetails({
        carrier: d.carrier.toLowerCase(),
        status: Number(d.status),
        detailsAdded: d.detailsAdded,
        bolAdded: d.bolAdded,
      });
    } catch (e) {
      setError(e?.reason || e?.message || 'Failed to load shipment');
      setDetails(null);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle adding Bill of Lading
  async function handleAddBoL(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {

      //await connectWallet();
      //const provider = getProvider();
      //const signer = provider.getSigner();
        
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    // 2) Ask the user to connect (if they haven’t already)
    await browserProvider.send("eth_requestAccounts", []);
    // 3) Grab the Signer — this one can send transactions
    const signer = await browserProvider.getSigner();

      const contract = new ethers.Contract(
        SHIPMENT_MANAGER_ADDRESS,
        ShipmentManagerABI.abi,
        signer
      );
      const tx = await contract.addBillOfLading(
        shipmentId,
        docHash,
        docLocation
      );
      await tx.wait(1);
      setSuccess('BoL added successfully!');
      await loadDetails();
      setDocHash('');
      setDocLocation('');
    } catch (e) {
      setError(e?.reason || e?.message || 'Failed to add BoL');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateStatus(newStatus) {
    setError("");
    setSuccess("");
    setIsLoading(true);
    try {
      // connect & get a signer
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);
      const signer = await browserProvider.getSigner();
  
      // build contract with signer
      const contract = new ethers.Contract(
        SHIPMENT_MANAGER_ADDRESS,
        ShipmentManagerABI.abi,
        signer
      );
  
      // send the tx
      const tx = await contract.updateShipmentStatus(shipmentId, newStatus);
      await tx.wait(1);
  
      setSuccess(`Status updated to "${STATUS_LABELS[newStatus]}"`);
      await loadDetails();     // refresh details (including timestamps)
    } catch (e) {
      setError(e?.reason || e?.message || "Update failed");
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <>
      {/* Full-screen background image */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundImage: "url('/darkship.jpeg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: -1,
        }}
      />

      {/* Main content container */}
      <div style={{ position: 'relative', zIndex: 1, padding: 20 }}>
        <div
          style={{
            maxWidth: 600,
            margin: 'auto',
            backgroundColor: 'rgba(255,255,255,0.9)',
            padding: 20,
            borderRadius: 8,
          }}
        >
          <h1 style={{ color: '#333', textAlign: 'center', marginBottom: 20 }}>
            Carrier Dashboard
          </h1>

          {/* Load Shipment Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadDetails();
            }}
            style={{ marginBottom: 20, textAlign: 'center' }}
          >
            <input
              type="number"
              placeholder="Shipment ID"
              value={shipmentId}
              onChange={(e) => setShipmentId(e.target.value)}
              style={{ padding: '8px', width: 200, marginRight: 10, borderRadius: 4 }}
              required
            />
            <button
              type="submit"
              disabled={!shipmentId || isLoading}
              style={{
                padding: '8px 16px',
                borderRadius: 4,
                backgroundColor: '#007bff',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isLoading ? 'Loading…' : 'Load Shipment'}
            </button>
          </form>

          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
          {success && <p style={{ color: 'green', textAlign: 'center' }}>{success}</p>}

          {/* Display Shipment Details */}
          {details && (
            <div
              style={{
                border: '1px solid #ccc',
                padding: 20,
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <p><strong>ID:</strong> {shipmentId}</p>
              <p><strong>Status:</strong> {STATUS_LABELS[details.status]}</p>
              <p><strong>Details Added?</strong> {details.detailsAdded ? 'Yes' : 'No'}</p>
              <p><strong>BoL Added?</strong> {details.bolAdded ? 'Yes' : 'No'}</p>
            </div>
          )}

          {/* 1) Status-update buttons (only for the carrier) */}
          {details && details.bolAdded && account === details.carrier && (
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              {details.status === 0 && (
                <button
                  onClick={() => handleUpdateStatus(1)}
                  disabled={isLoading}
                  style={{ marginRight: 10, padding: '10px 20px', borderRadius: 4, backgroundColor: '#007bff', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  {isLoading ? 'Processing…' : 'Mark as Picked Up'}
                </button>
              )}
              {details.status === 1 && (
                <button
                  onClick={() => handleUpdateStatus(2)}
                  disabled={isLoading}
                  style={{ padding: '10px 20px', borderRadius: 4, backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  {isLoading ? 'Processing…' : 'Mark as In Transit'}
                </button>
              )}
            </div>
          )}

          {/* Add BoL Form (visible only to carrier when appropriate) */}
          {details &&
            account === details.carrier &&
            (details.status === 0 || details.status === 1) &&
            !details.bolAdded && (
              <form
                onSubmit={handleAddBoL}
                style={{ textAlign: 'center' }}
              >
                <h3>Add Bill of Lading</h3>
                <input
                  type="text"
                  placeholder="Document Hash"
                  value={docHash}
                  onChange={(e) => setDocHash(e.target.value)}
                  style={{ width: '100%', marginBottom: 10, padding: 8, borderRadius: 4 }}
                  required
                />
                <input
                  type="text"
                  placeholder="Document Location (URI)"
                  value={docLocation}
                  onChange={(e) => setDocLocation(e.target.value)}
                  style={{ width: '100%', marginBottom: 10, padding: 8, borderRadius: 4 }}
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 4,
                    backgroundColor: '#28a745',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {isLoading ? 'Submitting…' : 'Submit BoL'}
                </button>
              </form>
            )}
        </div>
      </div>
    </>
  );
}
