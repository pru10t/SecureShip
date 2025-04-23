import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ethers } from "ethers";
import ActorRegistryABI from "../contracts/ActorRegistry.json";
import ShipmentManagerABI from "../contracts/ShipmentManager.json";
import { ACTOR_REGISTRY_ADDRESS, SHIPMENT_MANAGER_ADDRESS } from "../contracts/addresses";
import { connectWallet, getProvider } from "../utils/connectWallet";

export default function ShipmentDetailsPage() {
  const { id } = useParams(); // From route /shipment/:id
  const [shipment, setShipment] = useState(null);
  const [userAddress, setUserAddress] = useState("");
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Enums (keep these in sync with contract)
  const statusLabels = ["Created", "PickedUp", "InTransit", "Delivered"];
  const roleLabels = ["None", "Shipper", "Carrier", "Consignee", "TerminalOperator"];
  const containerTypes = ["Dry", "Reefer"];

  useEffect(() => {
    async function fetchData() {
      try {
        const provider = getProvider();
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        setUserAddress(address);

        const actorRegistry = new ethers.Contract(ACTOR_REGISTRY_ADDRESS, ActorRegistryABI.abi, signer);
        const shipmentManager = new ethers.Contract(SHIPMENT_MANAGER_ADDRESS, ShipmentManagerABI.abi, signer);

        const userRole = await actorRegistry.getActorRole(address);
        setRole(userRole);

        const shipmentData = await shipmentManager.getShipmentCoreDetails(id);
        setShipment(shipmentData);
      } catch (err) {
        console.error(err);
        setError("Unable to load shipment or user info.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) return <p style={{ padding: "40px" }}>🔄 Loading shipment #{id}...</p>;
  if (error) return <p style={{ color: "red", padding: "40px" }}>{error}</p>;
  if (!shipment) return <p>❌ Shipment not found.</p>;

  return (
    <div style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <h2>📦 Shipment #{id}</h2>
      <p><strong>Status:</strong> {statusLabels[shipment.status]}</p>
      <p><strong>Shipper:</strong> {shipment.shipper}</p>
      <p><strong>Carrier:</strong> {shipment.carrier}</p>
      <p><strong>Consignee:</strong> {shipment.consignee}</p>
      <p><strong>Container:</strong> {shipment.detailsAdded ? containerTypes[shipment.containerType] : "—"}</p>
      <p><strong>Weight:</strong> {shipment.detailsAdded ? `${shipment.weightKg} kg` : "—"}</p>
      <p><strong>Created:</strong> {new Date(shipment.creationTimestamp * 1000).toLocaleString()}</p>

      <hr style={{ margin: "30px 0" }} />

      <h3>👤 You are: {roleLabels[role]}</h3>

      {/* 🔜 Insert Role-Specific Actions Below Here */}
    </div>
  );
}
