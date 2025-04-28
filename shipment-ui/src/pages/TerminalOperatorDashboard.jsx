"use client";

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ShipmentManagerABI from '../contracts/ShipmentManager.json';
import { SHIPMENT_MANAGER_ADDRESS } from '../contracts/addresses';
import { connectWallet } from '../utils/connectWallet';

export default function TerminalOperatorDashboard() {
  const [account, setAccount] = useState(null);
  const [shipmentId, setShipmentId] = useState('');
  const [details, setDetails] = useState(null);
  const [demurrage, setDemurrage] = useState(null);
  const [amount, setAmount] = useState('');
  const [payee, setPayee] = useState('');
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

  // Load shipment and demurrage details
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

      // Core shipment details
      const d = await contract.getShipmentCoreDetails(shipmentId);
      setDetails({
        carrier: d.carrier.toLowerCase(),
        status: Number(d.status),
      });

      // Demurrage details
      const dem = await contract.getDemurrageDetails(shipmentId);
      setDemurrage({
        amount: dem.amount.toString(),
        payee: dem.payee.toLowerCase(),
        recordedBy: dem.recordedBy.toLowerCase(),
        isPaid: dem.isPaid,
      });
    } catch (e) {
      setError(e?.reason || e?.message || 'Failed to load details');
      setDetails(null);
      setDemurrage(null);
    } finally {
      setIsLoading(false);
    }
  }

  // Record demurrage
  async function handleRecordDemurrage(e) {
    e.preventDefault();
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
      const tx = await contract.recordDemurrage(shipmentId, amount, payee);
      await tx.wait(1);
      setSuccess('Demurrage recorded!');
      setAmount('');
      setPayee('');
      await loadDetails();
    } catch (e) {
      setError(e?.reason || e?.message || 'Failed to record demurrage');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>  
      {/* Full-screen background image */}
      <div style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        backgroundImage: "url('/darkship.jpeg')",
        backgroundSize: 'cover', backgroundPosition: 'center',
        zIndex: -1,
      }} />

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 1, padding: 20 }}>
        <div style={{ maxWidth: 600, margin: 'auto', backgroundColor: 'rgba(255,255,255,0.9)', padding: 20, borderRadius: 8 }}>
          <h1 style={{ textAlign: 'center', marginBottom: 20 }}>Terminal Operator Dashboard</h1>

          {/* Lookup Shipment */}
          <form onSubmit={e => { e.preventDefault(); loadDetails(); }} style={{ textAlign: 'center', marginBottom: 20 }}>
            <input
              type="number" placeholder="Shipment ID"
              value={shipmentId} onChange={e => setShipmentId(e.target.value)}
              style={{ padding: 8, width: 200, marginRight: 10, borderRadius: 4 }} required
            />
            <button disabled={!shipmentId || isLoading} style={{ padding: '8px 16px', borderRadius: 4, backgroundColor: '#007bff', color: '#fff', border: 'none' }}>
              {isLoading ? 'Loading…' : 'Load'}
            </button>
          </form>

          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
          {success && <p style={{ color: 'green', textAlign: 'center' }}>{success}</p>}

          {/* Shipment status */}
          {details && (
            <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 20, marginBottom: 20 }}>
              <p><strong>ID:</strong> {shipmentId}</p>
              <p><strong>Status:</strong> {STATUS_LABELS[details.status]}</p>
            </div>
          )}

          {/* Record Demurrage Form */}
          {details && account && details.status >= 2 && demurrage && demurrage.recordedBy === ethers.ZeroAddress && (
            <form onSubmit={handleRecordDemurrage} style={{ textAlign: 'center' }}>
              <h3>Record Demurrage</h3>
              <input
                type="number" placeholder="Amount"
                value={amount} onChange={e => setAmount(e.target.value)}
                style={{ width: '100%', padding: 8, marginBottom: 10, borderRadius: 4 }} required
              />
              <input
                type="text" placeholder="Payee Address"
                value={payee} onChange={e => setPayee(e.target.value)}
                style={{ width: '100%', padding: 8, marginBottom: 10, borderRadius: 4 }} required
              />
              <button type="submit" disabled={isLoading} style={{ padding: '10px 20px', borderRadius: 4, backgroundColor: '#28a745', color: '#fff', border: 'none' }}>
                {isLoading ? '…' : 'Submit'}
              </button>
            </form>
          )}

          {/* Display Demurrage Info */}
          {demurrage && demurrage.recordedBy !== ethers.ZeroAddress && (
            <div style={{ border: '1px solid #999', borderRadius: 8, padding: 20, marginTop: 20 }}>
              <h3>Demurrage Details</h3>
              <p><strong>Amount:</strong> {demurrage.amount}</p>
              <p><strong>Payee:</strong> {demurrage.payee}</p>
              <p><strong>Recorded By:</strong> {demurrage.recordedBy}</p>
              <p><strong>Paid?</strong> {demurrage.isPaid ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
