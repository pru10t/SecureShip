// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ActorRegistry.sol";

contract ShipmentManager {

    // --- Enums ---
    enum Status { Created, PickedUp, InTransit, Delivered }
    enum ContainerType { Dry, Reefer }

    // --- Structs ---
    struct ShipmentCore {
        uint shipmentId;
        address shipper;
        address carrier;
        address consignee;
        Status status;
        ContainerType containerType;
        uint weightKg;
        bool detailsAdded;
        uint creationTimestamp;
        uint pickupTimestamp;      
        uint deliveryTimestamp;    
        bool bolAdded;
    }

    struct DemurrageInfo {
        uint amount;
        address payee;
        bool isPaid;
        address recordedBy;
    }

    // --- State Variables ---
    ActorRegistry public actorRegistry;
    mapping(uint => ShipmentCore) public shipments;
    mapping(uint => string) public bolDocumentHashes;
    mapping(uint => string) public bolDocumentLocations;
    mapping(uint => mapping(address => bool)) public shipmentBolAccess;
    mapping(uint => DemurrageInfo) demurrageDetails; 
    uint public nextShipmentId = 1;

    // --- Events ---
    event ShipmentCreated(uint indexed shipmentId, address indexed shipper, address indexed carrier, address consignee, ContainerType containerType, uint weightKg);
    event ShipmentDetailsAdded(uint indexed shipmentId, ContainerType containerType, uint weightKg);
    event ShipmentStatusUpdated(uint indexed shipmentId, Status newStatus, address updatedBy);
    event DocumentAdded(uint indexed shipmentId, string documentHash, string documentLocation, address addedBy);
    event DocumentAccessGranted(uint indexed shipmentId, string documentHash, address indexed viewer, address grantedBy);
    event DemurrageRecorded(uint indexed shipmentId, uint amount, address indexed payee, address recordedBy);
    event DemurragePaid(uint indexed shipmentId, address markedBy);

    // --- Errors ---
    error Unauthorized(); 
    error InvalidInput(); 
    error InvalidStatus();
    error NotFound(); 
    error AlreadyExists();
    error BoLNotAdded();
    error DemurrageNotRecorded(); 
    error DemurrageAlreadyPaid(); 

    // --- Constructor ---
    constructor(address _registryAddress) {
        require(_registryAddress != address(0), "ShipmentManager: Invalid registry address");
        actorRegistry = ActorRegistry(_registryAddress);
    }

    // --- Core Functions ---

    /**
     * @notice Creates a basic shipment record. Only callable by a registered Shipper.
     * Details like container type/weight must be added via addShipmentDetails().
     */
    function createShipment(
        address _carrier,
        address _consignee
    ) public {
        address _shipper = msg.sender;
        if (actorRegistry.getActorRole(_shipper) != ActorRegistry.Role.Shipper) { revert Unauthorized(); }
        if (_carrier == address(0) || _consignee == address(0)) { revert InvalidInput(); }

        uint newShipmentId = nextShipmentId;
        nextShipmentId++;

        _storeNewShipmentCore(
            newShipmentId,
            _shipper,
            _carrier,
            _consignee
        );

        // Emit event providing default values for details added later
        emit ShipmentCreated(
            newShipmentId,
            _shipper,
            _carrier,
            _consignee,
            ContainerType.Dry, 
            0                  // Default weight
        );
    }

    /**
     * @notice Internal function to handle writing minimal initial shipment data.
     */
    function _storeNewShipmentCore(
        uint _id,
        address _shipper,
        address _carrier,
        address _consignee
    ) private {
        ShipmentCore storage newShipment = shipments[_id];
        newShipment.shipmentId = _id;
        newShipment.shipper = _shipper;
        newShipment.carrier = _carrier;
        newShipment.consignee = _consignee;
        newShipment.status = Status.Created;
        newShipment.creationTimestamp = block.timestamp;
        newShipment.detailsAdded = false;
        newShipment.bolAdded = false;
    }

    /**
     * @notice Adds container type and weight details to an existing shipment.
     */
    function addShipmentDetails(
        uint _shipmentId,
        ContainerType _containerType,
        uint _weightKg
    ) public {
        ShipmentCore storage shipment = shipments[_shipmentId];
        if (shipment.shipper == address(0)) { revert NotFound(); }
        if (msg.sender != shipment.shipper) { revert Unauthorized(); }
        if (shipment.status != Status.Created) { revert InvalidStatus(); }
        if (shipment.detailsAdded) { revert AlreadyExists(); }

        shipment.containerType = _containerType;
        shipment.weightKg = _weightKg;
        shipment.detailsAdded = true;

        emit ShipmentDetailsAdded(_shipmentId, _containerType, _weightKg);
    }

    /**
     * @notice Adds the Bill of Lading document hash and location URI for a shipment.
     */
    function addBillOfLading(
        uint _shipmentId,
        string memory _documentHash,
        string memory _documentLocation
    ) public {
        ShipmentCore storage shipment = shipments[_shipmentId];
        if (shipment.shipper == address(0)) { revert NotFound(); }
        if (msg.sender != shipment.carrier) { revert Unauthorized(); }
        if (shipment.status != Status.Created) { revert InvalidStatus(); } // Only allow in Created status?
        if (shipment.bolAdded) { revert AlreadyExists(); }

        bolDocumentHashes[_shipmentId] = _documentHash;
        bolDocumentLocations[_shipmentId] = _documentLocation;
        shipment.bolAdded = true;

        address _shipper = shipment.shipper;
        address _carrier = shipment.carrier;
        address _consignee = shipment.consignee;
        shipmentBolAccess[_shipmentId][_shipper] = true;
        shipmentBolAccess[_shipmentId][_carrier] = true;
        shipmentBolAccess[_shipmentId][_consignee] = true;

        emit DocumentAdded(
            _shipmentId,
            _documentHash,
            _documentLocation,
            msg.sender
        );
    }

    /**
     * @notice Updates the status of a shipment (PickedUp, InTransit, Delivered).
     */
    function updateShipmentStatus(uint _shipmentId, Status _newStatus) public {
        ShipmentCore storage shipment = shipments[_shipmentId];
        if (shipment.shipper == address(0)) { revert NotFound(); }

        Status currentStatus = shipment.status;
        address expectedActor;

        if (_newStatus == Status.PickedUp) {
            if (currentStatus != Status.Created) { revert InvalidStatus(); }
            expectedActor = shipment.carrier;
            if (msg.sender != expectedActor) { revert Unauthorized(); }
            shipment.pickupTimestamp = block.timestamp;

        } else if (_newStatus == Status.InTransit) {
            if (currentStatus != Status.PickedUp) { revert InvalidStatus(); }
            expectedActor = shipment.carrier;
            if (msg.sender != expectedActor) { revert Unauthorized(); }

        } else if (_newStatus == Status.Delivered) {
            if (currentStatus != Status.InTransit) { revert InvalidStatus(); }
            expectedActor = shipment.consignee;
            if (msg.sender != expectedActor) { revert Unauthorized(); }
            shipment.deliveryTimestamp = block.timestamp;

        } else {
            revert InvalidStatus(); // Disallow other transitions
        }

        shipment.status = _newStatus;
        emit ShipmentStatusUpdated(_shipmentId, _newStatus, msg.sender);
    }
    /**
     * @notice Grants access for a specific address to view the BoL document location.
     * @dev Only callable by the original Shipper after the BoL has been added.
     * @param _shipmentId The ID of the shipment.
     * @param _viewer The address to grant viewing permission to.
     */
    function grantDocumentAccess(uint _shipmentId, address _viewer) public {
        // 1. Get shipment core data and check existence
        ShipmentCore storage shipment = shipments[_shipmentId];
        if (shipment.shipper == address(0)) {
            revert NotFound();
        }

        // 2. Check Permissions: Only original shipper can grant access
        if (msg.sender != shipment.shipper) {
            revert Unauthorized();
        }

        // 3. Check if BoL has actually been added
        if (!shipment.bolAdded) {
            revert BoLNotAdded(); // Use the new specific error
        }

        // 4. Check for valid viewer address
        if (_viewer == address(0)) {
            revert InvalidInput();
        }

        // 5. Optional: Check if access already granted to prevent redundant events
        if (shipmentBolAccess[_shipmentId][_viewer]) {
            // Optionally revert, or just do nothing
            return; // Silently succeed if access already exists
        }

        // --- Actions ---

        // 6. Grant access in the mapping
        shipmentBolAccess[_shipmentId][_viewer] = true;

        // 7. Emit event (requires reading the hash)
        string memory docHash = bolDocumentHashes[_shipmentId]; // Read hash for event
        emit DocumentAccessGranted(
            _shipmentId,
            docHash, // Include hash in event for context
            _viewer,
            msg.sender // grantedBy = shipper
        );
    }
    /**
     * @notice Retrieves the BoL document location URI for a given shipment.
     * @dev Only callable by addresses that have been granted access via shipmentBolAccess mapping.
     * @param _shipmentId The ID of the shipment.
     * @return The document location string (e.g., IPFS URI). Reverts if caller lacks access or BoL not added.
     */
    function getDocumentLocation(uint _shipmentId) public view returns (string memory) {
        // 1. Check if shipment exists (read core data - view functions access storage)
        // We need bolAdded status, so reading from shipments is necessary
        if (shipments[_shipmentId].shipper == address(0)) {
             revert NotFound();
        }

        // 2. Check if BoL has been added
        if (!shipments[_shipmentId].bolAdded) {
             revert BoLNotAdded();
        }

        // 3. Check Access Permission for the caller
        if (!shipmentBolAccess[_shipmentId][msg.sender]) {
            revert Unauthorized(); // Caller doesn't have access
        }

        // 4. Return the location URI from the separate mapping
        return bolDocumentLocations[_shipmentId];
    }
    /**
     * @notice Records demurrage charges for a shipment.
     * @dev Only callable by a registered TerminalOperator, typically after pickup.
     * @param _shipmentId The ID of the shipment.
     * @param _amount The demurrage amount charged.
     * @param _payee The address designated to receive the payment (off-chain).
     */
    function recordDemurrage(uint _shipmentId, uint _amount, address _payee) public {
        // 1. Check shipment existence
        ShipmentCore storage shipment = shipments[_shipmentId];
        if (shipment.shipper == address(0)) {
            revert NotFound();
        }

        // 2. Check Permissions: Only TerminalOperator can record demurrage
        if (actorRegistry.getActorRole(msg.sender) != ActorRegistry.Role.TerminalOperator) {
            revert Unauthorized();
        }

        // 3. Check Status: Allow recording once picked up (adjust logic if needed)
        if (shipment.status < Status.PickedUp) { // Can't record before pickup
            revert InvalidStatus();
        }

        // 4. Check Payee Input
        if (_payee == address(0)) {
            revert InvalidInput();
        }

        // 5. Check if already recorded by checking the DemurrageInfo struct for this ID
        // Access via mapping directly, default recordedBy is address(0)
        if (demurrageDetails[_shipmentId].recordedBy != address(0)) {
            revert AlreadyExists(); // Demurrage already recorded
        }

        // --- Actions ---

        // 6. Store demurrage details in the mapping
        // Get storage pointer to the struct within the mapping
        DemurrageInfo storage demInfo = demurrageDetails[_shipmentId];
        demInfo.amount = _amount;
        demInfo.payee = _payee;
        demInfo.isPaid = false; // Explicitly set as not paid
        demInfo.recordedBy = msg.sender; // Track who recorded it

        // 7. Emit event
        emit DemurrageRecorded(_shipmentId, _amount, _payee, msg.sender);
    }
    /**
     * @notice Marks demurrage charges as paid (off-chain payment confirmed).
     * @dev Callable by the designated payee or the operator who recorded it.
     * @param _shipmentId The ID of the shipment.
     */
    function markDemurragePaid(uint _shipmentId) public {
        // 1. Check shipment existence (needed to ensure demurrage mapping key is valid)
        if (shipments[_shipmentId].shipper == address(0)) {
            revert NotFound();
        }

        // 2. Get demurrage info storage pointer
        DemurrageInfo storage demInfo = demurrageDetails[_shipmentId];

        // 3. Check if demurrage was recorded
        if (demInfo.recordedBy == address(0)) {
            revert DemurrageNotRecorded();
        }

        // 4. Check if already marked as paid
        if (demInfo.isPaid) {
            revert DemurrageAlreadyPaid();
        }

        // 5. Check Permissions: Only payee or recorder can mark as paid
        if (msg.sender != demInfo.payee && msg.sender != demInfo.recordedBy) {
             revert Unauthorized();
        }

        // --- Action ---

        // 6. Mark as paid
        demInfo.isPaid = true;

        // 7. Emit event
        emit DemurragePaid(_shipmentId, msg.sender); // Marked by whoever called
    }

// --- View Functions ---

    /**
     * @notice Retrieves the core data for a specific shipment.
     * @param _shipmentId The ID of the shipment to query.
     * @return ShipmentCore memory The core shipment data struct.
     */
    function getShipmentCoreDetails(uint _shipmentId) public view returns (ShipmentCore memory) {
        // Check existence first
        if (shipments[_shipmentId].shipper == address(0)) {
            revert NotFound();
        }
        // Return the struct stored in the mapping
        // Solidity handles copying the struct to memory for the return value
        return shipments[_shipmentId];
    }

    /**
     * @notice Retrieves the recorded demurrage details for a specific shipment.
     * @param _shipmentId The ID of the shipment to query.
     * @return DemurrageInfo memory The demurrage details struct.
     * Note: Caller should check the 'recordedBy' field to see if demurrage was actually recorded.
     */
    function getDemurrageDetails(uint _shipmentId) public view returns (DemurrageInfo memory) {
        // Optional: Could check shipment existence first via `shipments` mapping if needed,
        // but reading directly from demurrageDetails mapping is also fine.
        // If demurrage was never recorded, this will return a struct with default zero/false values.
        return demurrageDetails[_shipmentId];
    }
    
} 