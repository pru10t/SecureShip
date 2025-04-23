// src/components/BookShipment.jsx (Example path)
import React, { useState } from 'react';
import { ethers, isAddress } from 'ethers'; // Import ethers and isAddress

// --- Assuming you have these similar to your RegisterActor component ---
import ShipmentManagerABI from '../contracts/ShipmentManager.json'; // Adjust path if needed
import { SHIPMENT_MANAGER_ADDRESS } from '../contracts/addresses'; // Adjust path/name if needed
import { connectWallet, getProvider } from '../utils/connectWallet'; // Adjust path if needed
// --- ---

function BookShipment() {
  const [carrierAddress, setCarrierAddress] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');

  // State for loading and popups, mirroring RegisterActor
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState(""); // For success details like Tx hash

  const handleBookingSubmit = async (event) => {
    // Optional: prevent default if using a <form> element
    if (event) event.preventDefault();

    setError(null); // Clear previous errors/success
    setSuccessMessage(null);
    setShowErrorPopup(false);
    setShowSuccessPopup(false);

    // Basic Frontend Validation
    if (!carrierAddress || !consigneeAddress) {
      setErrorMessage("Please enter both Carrier and Consignee addresses.");
      setShowErrorPopup(true);
      setTimeout(() => setShowErrorPopup(false), 4000);
      return;
    }
    if (!isAddress(carrierAddress) || !isAddress(consigneeAddress)) {
        setErrorMessage("Please enter valid Ethereum addresses for Carrier and Consignee.");
        setShowErrorPopup(true);
        setTimeout(() => setShowErrorPopup(false), 4000);
        return;
    }

    setIsLoading(true);

    try {
      // Connect wallet and get signer (using your utility functions)
      const account = await connectWallet(); // Ensure wallet is connected
      const provider = getProvider();
      const signer = await provider.getSigner();

      // Instantiate the ShipmentManager contract
      const shipmentManagerContract = new ethers.Contract(
          SHIPMENT_MANAGER_ADDRESS,
          ShipmentManagerABI.abi,
          signer
       );

      console.log(`Attempting to book shipment with Carrier: ${carrierAddress}, Consignee: ${consigneeAddress}`);

      // --- Call the Smart Contract ---
      const tx = await shipmentManagerContract.createShipment(
        carrierAddress,
        consigneeAddress
      );

      setSuccessMessage(`Booking transaction sent: ${tx.hash}. Waiting...`);
      // Optionally show an intermediate success state/popup here if desired

      console.log(`Transaction sent: ${tx.hash}. Waiting...`);
      await tx.wait(1); // Wait for 1 confirmation
      console.log("Transaction confirmed:", tx.hash);

      setSuccessMessage(`Shipment booked successfully! Tx: ${tx.hash}`);
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000); // Hide after 3 seconds

      // Clear form on success
      setCarrierAddress('');
      setConsigneeAddress('');

    } catch (err) {
      console.error("Booking transaction failed:", err);
      // Extract error reason, similar to RegisterActor
      const reasonMatch = err?.reason || err?.error?.message || err?.message || "Unknown error occurred";

      // Map known contract errors to better messages
      let displayError = reasonMatch;
      if (reasonMatch.includes("Unauthorized")) displayError = "Error: Connected wallet is not registered as a Shipper.";
      if (reasonMatch.includes("InvalidInput")) displayError = "Error: Invalid Carrier or Consignee address provided (check if registered/valid).";
      // Add more mappings if needed based on other contract reverts

      setErrorMessage(displayError);
      setShowErrorPopup(true);
      setTimeout(() => setShowErrorPopup(false), 5000); // Show error longer
      setSuccessMessage(null); // Clear any pending success message
    } finally {
      setIsLoading(false);
    }
  };

  // --- JSX Structure (Basic - Adapt styling as needed) ---
  // You can adapt the card layout, popups, and top bar from your RegisterActor component
  return (
    <div /* Add background/layout styling like RegisterActor */ >
        {/* Success Popup */}
        {showSuccessPopup && (
            <div style={{ /* Style like RegisterActor success popup */ position: "fixed", top: "20px", right: "20px", backgroundColor: "#28a745", color: "white", padding: "12px 20px", borderRadius: "8px", zIndex: 9999 }}>
               ✅ {successMessage}
            </div>
        )}
        {/* Error Popup */}
        {showErrorPopup && (
             <div style={{ /* Style like RegisterActor error popup */ position: "fixed", top: "20px", right: "20px", backgroundColor: "#dc3545", color: "white", padding: "12px 20px", borderRadius: "8px", zIndex: 9999, maxWidth: "300px" }}>
               ❌ Error: {errorMessage}
            </div>
        )}

        {/* Add Top Bar if needed */}

        {/* Centered Card or Content Area */}
        <div style={{ /* Style like RegisterActor card */ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)' }}>
            <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '450px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>Book New Shipment</h2>
                {/* Using a form element is optional but good practice */}
                <form onSubmit={handleBookingSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label htmlFor="carrier" style={{ display: 'block', marginBottom: '5px', textAlign: 'left' }}>Carrier Address:</label>
                        <input
                            type="text"
                            id="carrier"
                            value={carrierAddress}
                            onChange={(e) => setCarrierAddress(e.target.value)}
                            placeholder="0x..."
                            disabled={isLoading}
                            style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc' }}
                        />
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                        <label htmlFor="consignee" style={{ display: 'block', marginBottom: '5px', textAlign: 'left' }}>Consignee Address:</label>
                        <input
                            type="text"
                            id="consignee"
                            value={consigneeAddress}
                            onChange={(e) => setConsigneeAddress(e.target.value)}
                            placeholder="0x..."
                            disabled={isLoading}
                            style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc' }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', backgroundColor: '#007bff', color: '#fff', border: 'none', cursor: 'pointer' }}
                        >
                        {isLoading ? 'Booking...' : 'Confirm Booking'}
                    </button>
                    {/* Display inline loading message if needed */}
                    {isLoading && !successMessage && <p style={{marginTop: '10px'}}>Processing transaction...</p>}
                </form>
            </div>
        </div>
    </div>
  );
}

export default BookShipment;