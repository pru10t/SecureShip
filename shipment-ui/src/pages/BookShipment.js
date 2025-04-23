// src/components/BookShipment.jsx
"use client";

import React, { useState, useEffect } from 'react';
import { ethers, isAddress } from 'ethers';
import ShipmentManagerABI from '../contracts/ShipmentManager.json';
import { SHIPMENT_MANAGER_ADDRESS } from '../contracts/addresses';
import { connectWallet, getProvider } from '../utils/connectWallet';

function BookShipment() {
  const [carrierAddress, setCarrierAddress] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [shipmentId, setShipmentId] = useState(null);
  const [shipmentDetails, setShipmentDetails] = useState(null);
  const [containerType, setContainerType] = useState('');
  const [weightKg, setWeightKg] = useState('');

  useEffect(() => {
    if (shipmentId) fetchShipmentDetails();
  }, [shipmentId]);

  const fetchShipmentDetails = async () => {
    try {
      const provider = getProvider();
      const contract = new ethers.Contract(SHIPMENT_MANAGER_ADDRESS, ShipmentManagerABI.abi, provider);
      const details = await contract.getShipmentCoreDetails(shipmentId);
      console.log("Fetched shipment details:", {
        status: details.status.toString(),
        detailsAdded: details.detailsAdded
      });
      setShipmentDetails({
        status: details.status.toString(),
        detailsAdded: details.detailsAdded,
      });
    } catch (err) {
      console.error("Error fetching shipment details:", err);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage(null);
    setShowErrorPopup(false);
    setShowSuccessPopup(false);

    if (!carrierAddress || !consigneeAddress) {
      setErrorMessage("Please enter both Carrier and Consignee addresses.");
      setShowErrorPopup(true);
      return;
    }

    if (!isAddress(carrierAddress) || !isAddress(consigneeAddress)) {
      setErrorMessage("Please enter valid Ethereum addresses.");
      setShowErrorPopup(true);
      return;
    }

    setIsLoading(true);
    try {
      await connectWallet();
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(SHIPMENT_MANAGER_ADDRESS, ShipmentManagerABI.abi, signer);

      const tx = await contract.createShipment(carrierAddress, consigneeAddress);
      const receipt = await tx.wait(1);

      let createdShipmentId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed.name === "ShipmentCreated") {
            createdShipmentId = parsed.args.shipmentId.toString();
            break;
          }
        } catch {}
      }

      setShipmentId(createdShipmentId);
      setSuccessMessage(`Shipment booked! Tx: ${tx.hash}`);
      setShowSuccessPopup(true);
      setCarrierAddress('');
      setConsigneeAddress('');
    } catch (err) {
      const reason = err?.reason || err?.error?.message || err?.message || "Unknown error";
      setErrorMessage(reason.includes("Unauthorized")
        ? "Connected wallet is not registered as a Shipper."
        : reason.includes("InvalidInput")
        ? "Invalid Carrier or Consignee address."
        : reason);
      setShowErrorPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDetailsSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await connectWallet();
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(SHIPMENT_MANAGER_ADDRESS, ShipmentManagerABI.abi, signer);
      const containerEnum = containerType === 'Dry' ? 0 : 1;
      const tx = await contract.addShipmentDetails(shipmentId, containerEnum, weightKg);
      await tx.wait(1);
      fetchShipmentDetails();
    } catch (err) {
      console.error("Error submitting shipment details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "black", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px"
    }}>
      {showSuccessPopup && (
        <div style={{ position: "fixed", top: 20, right: 20, backgroundColor: "#28a745", color: "white", padding: "12px 20px", borderRadius: "8px" }}>
          ✅ {successMessage}
        </div>
      )}
      {showErrorPopup && (
        <div style={{ position: "fixed", top: 20, right: 20, backgroundColor: "#dc3545", color: "white", padding: "12px 20px", borderRadius: "8px", maxWidth: "300px" }}>
          ❌ Error: {errorMessage}
        </div>
      )}
      <div style={{ backgroundColor: "#f5f5dc", padding: "40px", borderRadius: "16px", width: "100%", maxWidth: "480px", boxShadow: "0 8px 16px rgba(0,0,0,0.25)", textAlign: "center" }}>
        <h2 style={{ fontSize: 26, color: "#333" }}>Book New Shipment</h2>
        <form onSubmit={handleBookingSubmit}>
          <input type="text" value={carrierAddress} onChange={(e) => setCarrierAddress(e.target.value)} placeholder="Carrier Address" style={{ width: "100%", marginBottom: "12px", padding: "10px", borderRadius: "8px" }} />
          <input type="text" value={consigneeAddress} onChange={(e) => setConsigneeAddress(e.target.value)} placeholder="Consignee Address" style={{ width: "100%", marginBottom: "12px", padding: "10px", borderRadius: "8px" }} />
          <button type="submit" disabled={isLoading} style={{ width: "100%", padding: "12px", backgroundColor: "#007bff", color: "#fff", border: "none", borderRadius: "8px" }}>
            {isLoading ? "Booking..." : "Confirm Booking"}
          </button>
        </form>

        {shipmentDetails && (
          <div style={{ marginTop: 30, backgroundColor: "#fff", padding: "20px", borderRadius: "8px" }}>
            <p><strong>ID:</strong> {shipmentId}</p>
            <p><strong>Status:</strong> {shipmentDetails.status === "0" ? "Created" : shipmentDetails.status}</p>
            <p><strong>Details Added:</strong> {shipmentDetails.detailsAdded ? "Yes" : "No"}</p>
          </div>
        )}

        {shipmentDetails && shipmentDetails.status === "0" && !shipmentDetails.detailsAdded && (
          <form onSubmit={handleAddDetailsSubmit} style={{ marginTop: 20 }}>
            <label>Container Type:</label>
            <select value={containerType} onChange={(e) => setContainerType(e.target.value)} required style={{ width: "100%", marginBottom: "12px", padding: "10px", borderRadius: "8px" }}>
              <option value="">Select</option>
              <option value="Dry">Dry</option>
              <option value="Reefer">Reefer</option>
            </select>
            <input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="Weight (kg)" required style={{ width: "100%", marginBottom: "12px", padding: "10px", borderRadius: "8px" }} />
            <button type="submit" disabled={isLoading} style={{ width: "100%", padding: "12px", backgroundColor: "#28a745", color: "#fff", border: "none", borderRadius: "8px" }}>
              {isLoading ? "Submitting..." : "Submit Details"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default BookShipment;
