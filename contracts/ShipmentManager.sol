// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import the ActorRegistry contract to use its definitions (like Role enum) and interface
import "./ActorRegistry.sol";
// Optional: For debugging during development (can be removed if not used)
// import "hardhat/console.sol";

contract ShipmentManager {

    // --- Enums ---
    enum Status {
        Created,
        PickedUp,
        InTransit,
        Delivered
    }

    enum ContainerType {
        Dry,
        Reefer
    }

    // --- Structs ---
    struct Shipment {
        uint shipmentId; // Store the ID within the struct for easier access
        address shipper;
        address carrier;
        address consignee;
        Status status;
        ContainerType containerType;
        uint weightKg;
        // Timestamps
        uint creationTimestamp;
        uint pickupTimestamp;
        uint deliveryTimestamp;
        // BoL Document Info
        string bolDocumentHash;
        string bolDocumentLocation;
        bool bolAdded; // Flag to check if BoL has been added
        // Financials (Simplified Demurrage)
        uint demurrageAmount;
        address demurragePayee;
        bool demurrageIsPaid;
        address demurrageRecordedBy;
        // Dispute Flag (Optional - Placeholder for now)
        // bool isInDispute;
        // address disputedBy;
        // string disputeReason;
    }

    // --- State Variables ---

    // Reference to the deployed ActorRegistry contract
    ActorRegistry public actorRegistry;

    // Mapping from shipment ID to the Shipment data
    mapping(uint => Shipment) public shipments;

    // Mapping for Bill of Lading access control: shipmentId => viewerAddress => hasAccess
    mapping(uint => mapping(address => bool)) public shipmentBolAccess;

    // Counter to generate unique shipment IDs
    uint public nextShipmentId = 1;

    // --- Events ---
    // ** NOTE: Simplified event parameters to reduce stack load **
    event ShipmentCreated(
        uint indexed shipmentId,
        address indexed shipper,
        address indexed carrier,
        address consignee
    );

    event ShipmentStatusUpdated(
        uint indexed shipmentId,
        Status newStatus,
        address updatedBy
    );

    event DocumentAdded(
        uint indexed shipmentId,
        string documentHash, // Can't index string easily
        string documentLocation,
        address addedBy
    );

    event DocumentAccessGranted(
        uint indexed shipmentId,
        string documentHash, // Use hash to identify doc
        address indexed viewer,
        address grantedBy
    );

    event DemurrageRecorded(
        uint indexed shipmentId,
        uint amount,
        address indexed payee,
        address recordedBy
    );

    event DemurragePaid(
        uint indexed shipmentId,
        address markedBy
    );

    // --- Errors ---
    // Custom errors can be more gas-efficient than require strings
    error Unauthorized(); // Not authorized (based on role or specific address)
    error InvalidStatus(); // Action not allowed in current shipment status
    error NotFound(); // Shipment ID doesn't exist
    error AlreadyExists(); // Item (e.g., BoL) already added
    error InvalidInput(); // Input data is invalid (e.g., zero address)


    // --- Constructor ---
    /**
     * @notice Sets the address of the ActorRegistry contract.
     * @param _registryAddress The deployed address of the ActorRegistry.
     */
    constructor(address _registryAddress) {
        require(_registryAddress != address(0), "ShipmentManager: Invalid registry address");
        actorRegistry = ActorRegistry(_registryAddress); // Store the registry interface
    }

    // --- Core Functions ---

    /**
     * @notice Creates (confirms booking for) a new shipment. Only callable by a registered Shipper.
     * [Refactored attempt 2 to reduce stack depth]
     */
    function createShipment(
        address _carrier,
        address _consignee,
        ContainerType _containerType,
        uint _weightKg
    ) public returns (uint shipmentId) {
        // --- Check Permissions ---
        address _shipper = msg.sender;
        if (actorRegistry.getActorRole(_shipper) != ActorRegistry.Role.Shipper) { revert Unauthorized(); }
        if (_carrier == address(0) || actorRegistry.getActorRole(_carrier) != ActorRegistry.Role.Carrier) { revert InvalidInput(); }
        if (_consignee == address(0) || actorRegistry.getActorRole(_consignee) != ActorRegistry.Role.Consignee) { revert InvalidInput(); }

        // --- Assign ID and Increment ---
        // Incrementing early ensures the ID is reserved before potential storage writes
        shipmentId = nextShipmentId;
        nextShipmentId++;

        // --- Store Data using Internal Function ---
        // Pass all necessary data to the helper function
        _storeNewShipment(
            shipmentId,
            _shipper,
            _carrier,
            _consignee,
            _containerType,
            _weightKg
        );

        // --- Emit Simplified Event ---
        // Emit fewer parameters to potentially save stack space here
        emit ShipmentCreated(
            shipmentId,
            _shipper,
            _carrier,
            _consignee
        );

        // Return the ID
        return shipmentId;
    }

    // --- Internal Helper Function for Storage ---
    /**
     * @notice Internal function to handle writing shipment data to storage.
     * @dev Separated from createShipment to potentially help with stack depth.
     */
    function _storeNewShipment(
        uint _id,
        address _shipper,
        address _carrier,
        address _consignee,
        ContainerType _containerType,
        uint _weightKg
    ) private {
        // Get storage pointer
        Shipment storage newShipment = shipments[_id];
        // Assign values
        newShipment.shipmentId = _id;
        newShipment.shipper = _shipper;
        newShipment.carrier = _carrier;
        newShipment.consignee = _consignee;
        newShipment.status = Status.Created;
        newShipment.containerType = _containerType;
        newShipment.weightKg = _weightKg;
        newShipment.creationTimestamp = block.timestamp;
        // bolAdded defaults to false
        // financial fields default to 0/false/address(0)
    }


    // --- Other Function Placeholders (To be implemented next) ---

    // function addBillOfLading(uint _shipmentId, string memory _documentHash, string memory _documentLocation) public { /* ... TBI ... */ }
    // function grantDocumentAccess(uint _shipmentId, string memory _documentHash, address _viewer) public { /* ... TBI ... */ }
    // function updateShipmentStatus(uint _shipmentId, Status _newStatus) public { /* ... TBI ... */ }
    // function recordDemurrage(uint _shipmentId, uint _amount, address _payee) public { /* ... TBI ... */ }
    // function markDemurragePaid(uint _shipmentId) public { /* ... TBI ... */ }

    // --- View Function Placeholders (To be implemented next) ---
    // function getShipmentDetails(uint _shipmentId) public view returns (...) { /* ... TBI ... */ } // Careful returning structs with mappings
    // function getDocumentLocation(uint _shipmentId, string memory _documentHash) public view returns (string memory) { /* ... TBI ... */ }
    // function viewDemurrage(uint _shipmentId) public view returns (uint amount, address payee, bool isPaid) { /* ... TBI ... */ }

} // End of Contract