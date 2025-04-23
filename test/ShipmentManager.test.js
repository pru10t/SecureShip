const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ShipmentManager", function () {
    // Contracts
    let ActorRegistry, actorRegistry;
    let ShipmentManager, shipmentManager;

    // Accounts (Signers)
    let owner; // Deployer & Admin for ActorRegistry
    let shipper;
    let carrier;
    let consignee;
    let terminalOperator;
    let otherUser; // An unregistered user

    // Role Enum Mirror
    const Role = {
        None: 0,
        Shipper: 1,
        Carrier: 2,
        Consignee: 3,
        TerminalOperator: 4
    };
    const Status = {
        Created: 0,
        PickedUp: 1,
        InTransit: 2,
        Delivered: 3
    };

    // ContainerType Enum Mirror
    const ContainerType = {
        Dry: 0,
        Reefer: 1
    };

    // Runs before each test case `it(...)`
    beforeEach(async function () {
        // Get signers
        [owner, shipper, carrier, consignee, terminalOperator, otherUser] = await ethers.getSigners();

        // Deploy ActorRegistry
        ActorRegistry = await ethers.getContractFactory("ActorRegistry");
        actorRegistry = await ActorRegistry.deploy();
        // console.log("ActorRegistry deployed to:", actorRegistry.target); // .target in ethers v6+

        // Deploy ShipmentManager, passing the ActorRegistry's address
        ShipmentManager = await ethers.getContractFactory("ShipmentManager");
        shipmentManager = await ShipmentManager.deploy(actorRegistry.target); // Pass address to constructor
        // console.log("ShipmentManager deployed to:", shipmentManager.target);

        // --- Register Actors for testing ---
        // Owner registers the other accounts with specific roles
        await actorRegistry.connect(owner).registerActor(shipper.address, Role.Shipper);
        await actorRegistry.connect(owner).registerActor(carrier.address, Role.Carrier);
        await actorRegistry.connect(owner).registerActor(consignee.address, Role.Consignee);
        await actorRegistry.connect(owner).registerActor(terminalOperator.address, Role.TerminalOperator);

        // Verify registration (optional sanity check in setup)
        // console.log("Shipper registered:", await actorRegistry.isActorRegistered(shipper.address));
        // console.log("Carrier registered:", await actorRegistry.isActorRegistered(carrier.address));
        // console.log("Consignee registered:", await actorRegistry.isActorRegistered(consignee.address));
        // console.log("Operator registered:", await actorRegistry.isActorRegistered(terminalOperator.address));
        // console.log("OtherUser registered:", await actorRegistry.isActorRegistered(otherUser.address)); // Should be false
    });

    // --- Test Suites ---

    describe("Deployment", function () {
        it("Should link the correct ActorRegistry", async function () {
            expect(await shipmentManager.actorRegistry()).to.equal(actorRegistry.target);
        });
        it("Should initialize nextShipmentId to 1", async function () {
            expect(await shipmentManager.nextShipmentId()).to.equal(1);
        });
    });

    describe("createShipment", function () {
        // TODO: Add tests for createShipment
        it("Should allow a registered Shipper to create a shipment", async function () {
            // Define expected shipment ID (starts at 1)
            const expectedShipmentId = 1;

            // Action: Shipper calls createShipment
            // We don't need to capture the return value since we removed it
            await shipmentManager.connect(shipper).createShipment(
                carrier.address,
                consignee.address
            );

            // Assertion: Verify the stored data for shipment ID 1
            // Access the public mapping 'shipments' like a function call
            const shipmentData = await shipmentManager.shipments(expectedShipmentId);

            // Check if the core data was stored correctly
            expect(shipmentData.shipmentId).to.equal(expectedShipmentId);
            expect(shipmentData.shipper).to.equal(shipper.address);
            expect(shipmentData.carrier).to.equal(carrier.address);
            expect(shipmentData.consignee).to.equal(consignee.address);
            expect(shipmentData.status).to.equal(0); // 0 corresponds to Status.Created enum value
            expect(shipmentData.detailsAdded).to.be.false;
            expect(shipmentData.bolAdded).to.be.false;
            // Check timestamp was recorded (greater than 0, or more specific checks possible)
            expect(shipmentData.creationTimestamp).to.be.gt(0);
            // Check other fields are default/zero initially
            expect(shipmentData.containerType).to.equal(ContainerType.Dry); // Defaults to 0 (Dry)
            expect(shipmentData.weightKg).to.equal(0);
            expect(shipmentData.pickupTimestamp).to.equal(0);
            expect(shipmentData.deliveryTimestamp).to.equal(0);
        });
        // Test for event emission
        it("Should emit ShipmentCreated event with default details", async function () {
            const expectedShipmentId = 1;
            // Expect the transaction to emit the event with correct arguments
            // Note: We check against the 6-arg definition, using defaults for type/weight
            await expect(shipmentManager.connect(shipper).createShipment(carrier.address, consignee.address))
                .to.emit(shipmentManager, "ShipmentCreated")
                .withArgs(
                    expectedShipmentId,
                    shipper.address,
                    carrier.address,
                    consignee.address,
                    ContainerType.Dry, // Default ContainerType enum value (index 0)
                    0                  // Default weight
                );
        });

        // Test for ID increment logic
        it("Should increment nextShipmentId", async function () {
            expect(await shipmentManager.nextShipmentId()).to.equal(1);

            await shipmentManager.connect(shipper).createShipment(carrier.address, consignee.address);
            expect(await shipmentManager.nextShipmentId()).to.equal(2);

            // Replace addr1.address, addr2.address with defined signers
            // Using otherUser and terminalOperator here just as examples of valid addresses
            await shipmentManager.connect(shipper).createShipment(otherUser.address, terminalOperator.address); // <-- CORRECTED LINE
             expect(await shipmentManager.nextShipmentId()).to.equal(3);
        });

        // Test for non-shipper permission failure
        it("Should prevent non-Shippers from creating shipments", async function () {
            // Try calling from the carrier account
            await expect(
                // Replace addr1.address with a defined address, e.g., shipper.address
                shipmentManager.connect(carrier).createShipment(shipper.address, consignee.address) // <-- CORRECTED LINE
            ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");

            // Try calling from the unregistered otherUser account (this part was correct)
            await expect(
                shipmentManager.connect(otherUser).createShipment(carrier.address, consignee.address)
            ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
        });

        // Test for zero address input failure
         it("Should prevent creation with zero address carrier/consignee", async function () {
            const zeroAddress = ethers.ZeroAddress;

            // Test with zero address carrier
            await expect(
                shipmentManager.connect(shipper).createShipment(zeroAddress, consignee.address)
            ).to.be.revertedWithCustomError(shipmentManager, "InvalidInput");

            // Test with zero address consignee
            await expect(
                shipmentManager.connect(shipper).createShipment(carrier.address, zeroAddress)
            ).to.be.revertedWithCustomError(shipmentManager, "InvalidInput");
        });
    });

    describe("addShipmentDetails", function () {
        let testShipmentId; // Variable to store the ID created in beforeEach

        // Create a shipment before each test in this block
        beforeEach(async function() {
            // Shipper creates shipment 1
            await shipmentManager.connect(shipper).createShipment(carrier.address, consignee.address);
            testShipmentId = 1; // We know the first ID is 1
        });

        // --- Success Case ---
        it("Should allow the Shipper to add details to their shipment", async function () {
            const type = ContainerType.Reefer; // Use Reefer for testing
            const weight = 12500;

            // Action & Event Assertion
            await expect(shipmentManager.connect(shipper).addShipmentDetails(testShipmentId, type, weight))
                .to.emit(shipmentManager, "ShipmentDetailsAdded")
                .withArgs(testShipmentId, type, weight);

            // State Assertion: Check if details were stored
            const shipmentData = await shipmentManager.shipments(testShipmentId);
            expect(shipmentData.containerType).to.equal(type);
            expect(shipmentData.weightKg).to.equal(weight);
            expect(shipmentData.detailsAdded).to.be.true;
        });

        // --- Failure Cases ---
        it("Should prevent non-Shippers from adding details", async function () {
            const type = ContainerType.Dry;
            const weight = 5000;
            // Action from carrier should fail
            await expect(
                shipmentManager.connect(carrier).addShipmentDetails(testShipmentId, type, weight)
            ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
             // Action from otherUser should fail
             await expect(
                shipmentManager.connect(otherUser).addShipmentDetails(testShipmentId, type, weight)
            ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
        });

        it("Should prevent adding details if shipment status is not 'Created'", async function () {
            const type = ContainerType.Dry;
            const weight = 5000;
             // Setup: Move status forward (Carrier marks as PickedUp)
            const Status = { Created: 0, PickedUp: 1, InTransit: 2, Delivered: 3 }; // Mirror Status enum locally
            await shipmentManager.connect(carrier).updateShipmentStatus(testShipmentId, Status.PickedUp);

            // Action: Shipper tries to add details now - should fail
            await expect(
                shipmentManager.connect(shipper).addShipmentDetails(testShipmentId, type, weight)
            ).to.be.revertedWithCustomError(shipmentManager, "InvalidStatus");
        });

        it("Should prevent adding details more than once", async function () {
            const type1 = ContainerType.Dry;
            const weight1 = 5000;
            const type2 = ContainerType.Reefer;
            const weight2 = 6000;

            // Setup: Add details successfully the first time
            await shipmentManager.connect(shipper).addShipmentDetails(testShipmentId, type1, weight1);

             // Action: Shipper tries to add details again - should fail
             await expect(
                shipmentManager.connect(shipper).addShipmentDetails(testShipmentId, type2, weight2)
            ).to.be.revertedWithCustomError(shipmentManager, "AlreadyExists");
        });

        it("Should revert if trying to add details to a non-existent shipment", async function () {
            const nonExistentId = 999;
            const type = ContainerType.Dry;
            const weight = 5000;

            // Action: Try adding details to an ID that wasn't created
             await expect(
                shipmentManager.connect(shipper).addShipmentDetails(nonExistentId, type, weight)
            ).to.be.revertedWithCustomError(shipmentManager, "NotFound");
        });
    });

    describe("addBillOfLading", function () {
        let testShipmentId;
        const testHash = "0x123abc"; // Example hash
        const testLocation = "ipfs://Qm..."; // Example location URI

        // Create a shipment before each test in this block
        beforeEach(async function() {
            // Shipper creates shipment 1
            await shipmentManager.connect(shipper).createShipment(carrier.address, consignee.address);
            testShipmentId = 1;
            // Optional: Add details first if required by BoL logic (currently not)
            // await shipmentManager.connect(shipper).addShipmentDetails(testShipmentId, ContainerType.Dry, 5000);
        });

        // --- Success Case ---
        it("Should allow the assigned Carrier to add BoL details", async function () {
            // Action & Event Assertion
            await expect(shipmentManager.connect(carrier).addBillOfLading(testShipmentId, testHash, testLocation))
                .to.emit(shipmentManager, "DocumentAdded")
                .withArgs(testShipmentId, testHash, testLocation, carrier.address); // AddedBy is the carrier

            // State Assertions
            const shipmentData = await shipmentManager.shipments(testShipmentId);
            expect(shipmentData.bolAdded).to.be.true;

            expect(await shipmentManager.bolDocumentHashes(testShipmentId)).to.equal(testHash);
            expect(await shipmentManager.bolDocumentLocations(testShipmentId)).to.equal(testLocation);

            // Check initial access granted
            expect(await shipmentManager.shipmentBolAccess(testShipmentId, shipper.address)).to.be.true;
            expect(await shipmentManager.shipmentBolAccess(testShipmentId, carrier.address)).to.be.true;
            expect(await shipmentManager.shipmentBolAccess(testShipmentId, consignee.address)).to.be.true;
            expect(await shipmentManager.shipmentBolAccess(testShipmentId, otherUser.address)).to.be.false; // Check someone else doesn't have access
        });

        // --- Failure Cases ---
        it("Should prevent non-Carriers from adding BoL details", async function () {
            // Action from shipper should fail
            await expect(
                shipmentManager.connect(shipper).addBillOfLading(testShipmentId, testHash, testLocation)
            ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
             // Action from otherUser should fail
             await expect(
                shipmentManager.connect(otherUser).addBillOfLading(testShipmentId, testHash, testLocation)
            ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
        });

        it("Should prevent adding BoL if shipment status is not 'Created'", async function () {
             // Setup: Move status forward (Carrier marks as PickedUp)
             const Status = { Created: 0, PickedUp: 1, InTransit: 2, Delivered: 3 };
             await shipmentManager.connect(carrier).updateShipmentStatus(testShipmentId, Status.PickedUp);

            // Action: Carrier tries to add BoL now - should fail based on current contract logic
            await expect(
                shipmentManager.connect(carrier).addBillOfLading(testShipmentId, testHash, testLocation)
            ).to.be.revertedWithCustomError(shipmentManager, "InvalidStatus");
            // Note: You might change the contract logic later to allow adding BoL in PickedUp status too.
        });

        it("Should prevent adding BoL details more than once", async function () {
            // Setup: Add BoL successfully the first time
            await shipmentManager.connect(carrier).addBillOfLading(testShipmentId, testHash, testLocation);

             // Action: Carrier tries to add BoL again - should fail
             await expect(
                shipmentManager.connect(carrier).addBillOfLading(testShipmentId, "0x456def", "ipfs://def...")
            ).to.be.revertedWithCustomError(shipmentManager, "AlreadyExists");
        });

        it("Should revert if trying to add BoL to a non-existent shipment", async function () {
            const nonExistentId = 999;
             // Action: Try adding BoL to an ID that wasn't created
             await expect(
                shipmentManager.connect(carrier).addBillOfLading(nonExistentId, testHash, testLocation)
            ).to.be.revertedWithCustomError(shipmentManager, "NotFound");
        });
    });

    describe("updateShipmentStatus", function () {
        let testShipmentId;

        // Create shipment 1 before each test in this block
        beforeEach(async function() {
            await shipmentManager.connect(shipper).createShipment(carrier.address, consignee.address);
            testShipmentId = 1;
        });

        describe("Transition to PickedUp", function () {
            it("Should allow Carrier to update status from Created to PickedUp", async function () {
                // Action & Event check
                await expect(shipmentManager.connect(carrier).updateShipmentStatus(testShipmentId, Status.PickedUp))
                    .to.emit(shipmentManager, "ShipmentStatusUpdated")
                    .withArgs(testShipmentId, Status.PickedUp, carrier.address);

                // State check
                const shipmentData = await shipmentManager.shipments(testShipmentId);
                expect(shipmentData.status).to.equal(Status.PickedUp);
                expect(shipmentData.pickupTimestamp).to.be.gt(0); // Check timestamp was recorded
            });

            it("Should prevent non-Carrier from updating status to PickedUp", async function () {
                await expect(
                    shipmentManager.connect(shipper).updateShipmentStatus(testShipmentId, Status.PickedUp)
                ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
                await expect(
                    shipmentManager.connect(consignee).updateShipmentStatus(testShipmentId, Status.PickedUp)
                ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
            });

            it("Should prevent updating to PickedUp if status is not Created", async function () {
                // Set status to PickedUp first
                await shipmentManager.connect(carrier).updateShipmentStatus(testShipmentId, Status.PickedUp);
                // Try setting to PickedUp again
                await expect(
                    shipmentManager.connect(carrier).updateShipmentStatus(testShipmentId, Status.PickedUp)
                ).to.be.revertedWithCustomError(shipmentManager, "InvalidStatus");
            });
        });

        describe("Transition to InTransit", function () {
            // Set status to PickedUp before tests in this inner block
            beforeEach(async function() {
                 await shipmentManager.connect(carrier).updateShipmentStatus(testShipmentId, Status.PickedUp);
            });

            it("Should allow Carrier to update status from PickedUp to InTransit", async function () {
                 await expect(shipmentManager.connect(carrier).updateShipmentStatus(testShipmentId, Status.InTransit))
                    .to.emit(shipmentManager, "ShipmentStatusUpdated")
                    .withArgs(testShipmentId, Status.InTransit, carrier.address);

                const shipmentData = await shipmentManager.shipments(testShipmentId);
                expect(shipmentData.status).to.equal(Status.InTransit);
            });

             it("Should prevent non-Carrier from updating status to InTransit", async function () {
                await expect(
                    shipmentManager.connect(shipper).updateShipmentStatus(testShipmentId, Status.InTransit)
                ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
                await expect(
                    shipmentManager.connect(consignee).updateShipmentStatus(testShipmentId, Status.InTransit)
                ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
            });

             it("Should prevent updating to InTransit if status is not PickedUp", async function () {
                 // Test from Created status (need a new shipment or reset)
                 // Easiest way: just test trying to set InTransit again
                 await shipmentManager.connect(carrier).updateShipmentStatus(testShipmentId, Status.InTransit); // Now it's InTransit
                 await expect(
                     shipmentManager.connect(carrier).updateShipmentStatus(testShipmentId, Status.InTransit)
                 ).to.be.revertedWithCustomError(shipmentManager, "InvalidStatus");
            });
        });

        describe("Transition to Delivered", function () {
             // Set status to InTransit before tests in this inner block
             beforeEach(async function() {
                 await shipmentManager.connect(carrier).updateShipmentStatus(testShipmentId, Status.PickedUp);
                 await shipmentManager.connect(carrier).updateShipmentStatus(testShipmentId, Status.InTransit);
            });

            it("Should allow Consignee to update status from InTransit to Delivered", async function () {
                await expect(shipmentManager.connect(consignee).updateShipmentStatus(testShipmentId, Status.Delivered))
                    .to.emit(shipmentManager, "ShipmentStatusUpdated")
                    .withArgs(testShipmentId, Status.Delivered, consignee.address);

                const shipmentData = await shipmentManager.shipments(testShipmentId);
                expect(shipmentData.status).to.equal(Status.Delivered);
                expect(shipmentData.deliveryTimestamp).to.be.gt(0); // Check timestamp
            });

            it("Should prevent non-Consignee from updating status to Delivered", async function () {
                 await expect(
                    shipmentManager.connect(shipper).updateShipmentStatus(testShipmentId, Status.Delivered)
                ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
                 await expect(
                    shipmentManager.connect(carrier).updateShipmentStatus(testShipmentId, Status.Delivered)
                ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
            });

            it("Should prevent updating to Delivered if status is not InTransit", async function () {
                // Test trying to set Delivered again
                await shipmentManager.connect(consignee).updateShipmentStatus(testShipmentId, Status.Delivered); // Now it's Delivered
                 await expect(
                     shipmentManager.connect(consignee).updateShipmentStatus(testShipmentId, Status.Delivered)
                 ).to.be.revertedWithCustomError(shipmentManager, "InvalidStatus");
            });
        });

        describe("General Failures", function() {
            it("Should revert for invalid target status transitions", async function() {
                // Cannot go back to Created
                 await expect(
                     shipmentManager.connect(shipper).updateShipmentStatus(testShipmentId, Status.Created)
                 ).to.be.revertedWithCustomError(shipmentManager, "InvalidStatus");

                // Cannot jump from Created to InTransit
                 await expect(
                     shipmentManager.connect(carrier).updateShipmentStatus(testShipmentId, Status.InTransit)
                 ).to.be.revertedWithCustomError(shipmentManager, "InvalidStatus");
            });

            it("Should revert if shipment not found", async function() {
                 const nonExistentId = 999;
                 await expect(
                     shipmentManager.connect(carrier).updateShipmentStatus(nonExistentId, Status.PickedUp)
                 ).to.be.revertedWithCustomError(shipmentManager, "NotFound");
            });
        });
    });

    describe("grantDocumentAccess", function () {
        let testShipmentId;
        const testHash = "0x123abc";
        const testLocation = "ipfs://Qm...";

        // Setup: Create shipment 1 & Add BoL before each test in this block
        beforeEach(async function() {
            // Shipper creates shipment
            await shipmentManager.connect(shipper).createShipment(carrier.address, consignee.address);
            testShipmentId = 1;
            // Carrier adds the BoL
            await shipmentManager.connect(carrier).addBillOfLading(testShipmentId, testHash, testLocation);
        });

        // --- Success Case ---
        it("Should allow the Shipper to grant BoL access to another user", async function () {
            // Action & Event Assertion
            // Expect shipper granting access to otherUser to emit the event
            await expect(shipmentManager.connect(shipper).grantDocumentAccess(testShipmentId, otherUser.address))
                .to.emit(shipmentManager, "DocumentAccessGranted")
                .withArgs(testShipmentId, testHash, otherUser.address, shipper.address);

            // State Assertion: Check if otherUser now has access
            expect(await shipmentManager.shipmentBolAccess(testShipmentId, otherUser.address)).to.be.true;
        });

        // --- Failure Cases ---
        it("Should prevent non-Shippers from granting BoL access", async function () {
            // Carrier tries to grant access
            await expect(
                shipmentManager.connect(carrier).grantDocumentAccess(testShipmentId, otherUser.address)
            ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
            // Consignee tries to grant access
            await expect(
                shipmentManager.connect(consignee).grantDocumentAccess(testShipmentId, otherUser.address)
            ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
             // Other user tries to grant access
             await expect(
                shipmentManager.connect(otherUser).grantDocumentAccess(testShipmentId, terminalOperator.address)
            ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
        });

        it("Should prevent granting access if BoL has not been added", async function () {
            // Setup: Create a NEW shipment (ID will be 2) where BoL is *not* added
            const newShipmentId = 2;
            await shipmentManager.connect(shipper).createShipment(carrier.address, consignee.address);

            // Action: Shipper tries to grant access for the new shipment
            await expect(
                 shipmentManager.connect(shipper).grantDocumentAccess(newShipmentId, otherUser.address)
            ).to.be.revertedWithCustomError(shipmentManager, "BoLNotAdded");
        });

        it("Should prevent granting access to the zero address", async function () {
            const zeroAddress = ethers.ZeroAddress;
            await expect(
                shipmentManager.connect(shipper).grantDocumentAccess(testShipmentId, zeroAddress)
            ).to.be.revertedWithCustomError(shipmentManager, "InvalidInput");
        });

        it("Should succeed silently if access is granted to someone who already has it", async function () {
            // Check initial access for carrier (granted during addBillOfLading)
            expect(await shipmentManager.shipmentBolAccess(testShipmentId, carrier.address)).to.be.true;

            // Action: Shipper grants access AGAIN to carrier
            // We expect this NOT to revert and NOT to emit a *new* event (though hardhat doesn't easily test for *no* event)
            // So we just check the state remains true and no error occurs
             await expect(
                 shipmentManager.connect(shipper).grantDocumentAccess(testShipmentId, carrier.address)
             ).to.not.be.reverted; // Check it doesn't fail

             // Re-check state
             expect(await shipmentManager.shipmentBolAccess(testShipmentId, carrier.address)).to.be.true;
        });

         it("Should revert if trying to grant access for a non-existent shipment", async function () {
            const nonExistentId = 999;
             // Action: Try granting access for an ID that wasn't created
             await expect(
                 shipmentManager.connect(shipper).grantDocumentAccess(nonExistentId, otherUser.address)
             ).to.be.revertedWithCustomError(shipmentManager, "NotFound");
        });
    });

    describe("recordDemurrage", function () {
        let testShipmentId;
        const demurrageAmount = ethers.parseUnits("150", 6); // Example: 150 USDC (6 decimals) or just 150 if plain uint
        let payee; // Use 'otherUser' as the payee for tests

        // Setup: Create shipment 1 and set status to PickedUp
        beforeEach(async function() {
            payee = otherUser; // Assign payee clearly
            // Shipper creates shipment
            await shipmentManager.connect(shipper).createShipment(carrier.address, consignee.address);
            testShipmentId = 1;
            // Carrier picks up
            const Status = { Created: 0, PickedUp: 1 }; // Local Status enum mirror
            await shipmentManager.connect(carrier).updateShipmentStatus(testShipmentId, Status.PickedUp);
        });

        // --- Success Case ---
        it("Should allow TerminalOperator to record demurrage", async function () {
            // Action & Event Check
            await expect(shipmentManager.connect(terminalOperator).recordDemurrage(testShipmentId, demurrageAmount, payee.address))
                .to.emit(shipmentManager, "DemurrageRecorded")
                .withArgs(testShipmentId, demurrageAmount, payee.address, terminalOperator.address);

            // State Check
            const demInfo = await shipmentManager.getDemurrageDetails(testShipmentId);
            expect(demInfo.amount).to.equal(demurrageAmount);
            expect(demInfo.payee).to.equal(payee.address);
            expect(demInfo.isPaid).to.be.false;
            expect(demInfo.recordedBy).to.equal(terminalOperator.address);
        });

        // --- Failure Cases ---
        it("Should prevent non-TerminalOperator from recording demurrage", async function () {
            await expect(
                shipmentManager.connect(shipper).recordDemurrage(testShipmentId, demurrageAmount, payee.address)
            ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
            await expect(
                shipmentManager.connect(carrier).recordDemurrage(testShipmentId, demurrageAmount, payee.address)
            ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
             await expect(
                shipmentManager.connect(otherUser).recordDemurrage(testShipmentId, demurrageAmount, payee.address)
            ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
        });

        it("Should prevent recording demurrage if status is 'Created'", async function () {
             // Setup: Create a NEW shipment (ID will be 2) which stays 'Created'
             const newShipmentId = 2;
             await shipmentManager.connect(shipper).createShipment(carrier.address, consignee.address);

            // Action: Operator tries to record demurrage too early
            await expect(
                 shipmentManager.connect(terminalOperator).recordDemurrage(newShipmentId, demurrageAmount, payee.address)
            ).to.be.revertedWithCustomError(shipmentManager, "InvalidStatus");
        });

         it("Should prevent recording demurrage with zero address payee", async function () {
             await expect(
                 shipmentManager.connect(terminalOperator).recordDemurrage(testShipmentId, demurrageAmount, ethers.ZeroAddress)
             ).to.be.revertedWithCustomError(shipmentManager, "InvalidInput");
         });

        it("Should prevent recording demurrage more than once", async function () {
            // Record successfully first time
            await shipmentManager.connect(terminalOperator).recordDemurrage(testShipmentId, demurrageAmount, payee.address);

            // Try recording again
            await expect(
                shipmentManager.connect(terminalOperator).recordDemurrage(testShipmentId, demurrageAmount, payee.address)
            ).to.be.revertedWithCustomError(shipmentManager, "AlreadyExists");
        });

        it("Should revert if shipment not found", async function () {
             const nonExistentId = 999;
             await expect(
                 shipmentManager.connect(terminalOperator).recordDemurrage(nonExistentId, demurrageAmount, payee.address)
             ).to.be.revertedWithCustomError(shipmentManager, "NotFound");
        });
    });

    describe("markDemurragePaid", function () {
        // TODO: Add tests
    });

    describe("View Functions", function () {

        describe("getDocumentLocation", function () {
            let testShipmentId;
            const testHash = "0xb0lHa5h";
            const testLocation = "ipfs://BoLLocAti0n";

            // Setup: Create shipment, add BoL, grant extra access
            beforeEach(async function() {
                // Create shipment 1
                await shipmentManager.connect(shipper).createShipment(carrier.address, consignee.address);
                testShipmentId = 1;
                // Carrier adds BoL
                await shipmentManager.connect(carrier).addBillOfLading(testShipmentId, testHash, testLocation);
                // Shipper grants access to otherUser
                await shipmentManager.connect(shipper).grantDocumentAccess(testShipmentId, otherUser.address);
            });

            it("Should return the location for users with access (Shipper, Carrier, Consignee, Granted User)", async function () {
                expect(await shipmentManager.connect(shipper).getDocumentLocation(testShipmentId)).to.equal(testLocation);
                expect(await shipmentManager.connect(carrier).getDocumentLocation(testShipmentId)).to.equal(testLocation);
                expect(await shipmentManager.connect(consignee).getDocumentLocation(testShipmentId)).to.equal(testLocation);
                expect(await shipmentManager.connect(otherUser).getDocumentLocation(testShipmentId)).to.equal(testLocation);
            });

            it("Should revert for users without access", async function () {
                 await expect(
                     shipmentManager.connect(terminalOperator).getDocumentLocation(testShipmentId) // Operator wasn't granted access
                 ).to.be.revertedWithCustomError(shipmentManager, "Unauthorized");
            });

             it("Should revert if BoL has not been added", async function () {
                 // Setup: Create shipment 2 without adding BoL
                 const newShipmentId = 2;
                 await shipmentManager.connect(shipper).createShipment(carrier.address, consignee.address);

                 // Action: Try to get location
                 await expect(
                     shipmentManager.connect(shipper).getDocumentLocation(newShipmentId)
                 ).to.be.revertedWithCustomError(shipmentManager, "BoLNotAdded");
            });

             it("Should revert if shipment not found", async function () {
                  const nonExistentId = 999;
                  await expect(
                      shipmentManager.connect(shipper).getDocumentLocation(nonExistentId)
                  ).to.be.revertedWithCustomError(shipmentManager, "NotFound");
             });
        });

        describe("getShipmentCoreDetails", function () {
             let testShipmentId;
             const type = ContainerType.Reefer;
             const weight = 9876;

             // Setup: Create shipment 1 and add details
             beforeEach(async function() {
                 await shipmentManager.connect(shipper).createShipment(carrier.address, consignee.address);
                 testShipmentId = 1;
                 await shipmentManager.connect(shipper).addShipmentDetails(testShipmentId, type, weight);
             });

            it("Should return the correct core details for an existing shipment", async function () {
                const shipmentData = await shipmentManager.getShipmentCoreDetails(testShipmentId);

                expect(shipmentData.shipmentId).to.equal(testShipmentId);
                expect(shipmentData.shipper).to.equal(shipper.address);
                expect(shipmentData.carrier).to.equal(carrier.address);
                expect(shipmentData.consignee).to.equal(consignee.address);
                expect(shipmentData.status).to.equal(Status.Created); // Status enum mirror defined above
                expect(shipmentData.containerType).to.equal(type);
                expect(shipmentData.weightKg).to.equal(weight);
                expect(shipmentData.detailsAdded).to.be.true;
                expect(shipmentData.bolAdded).to.be.false; // BoL not added in this test setup
                expect(shipmentData.creationTimestamp).to.be.gt(0);
                expect(shipmentData.pickupTimestamp).to.equal(0);
                expect(shipmentData.deliveryTimestamp).to.equal(0);
            });

             it("Should revert if shipment not found", async function () {
                  const nonExistentId = 999;
                  await expect(
                      shipmentManager.getShipmentCoreDetails(nonExistentId)
                  ).to.be.revertedWithCustomError(shipmentManager, "NotFound");
             });
        });

        describe("getDemurrageDetails", function () {
            let testShipmentId;
            const demurrageAmount = ethers.parseUnits("250", 6);
            let payee;

            // Setup: Create shipment 1, update status, record demurrage
            beforeEach(async function() {
                payee = otherUser; // Use otherUser as payee
                // Create shipment
                await shipmentManager.connect(shipper).createShipment(carrier.address, consignee.address);
                testShipmentId = 1;
                // Update status to allow recording demurrage
                await shipmentManager.connect(carrier).updateShipmentStatus(testShipmentId, Status.PickedUp);
                // Record demurrage
                await shipmentManager.connect(terminalOperator).recordDemurrage(testShipmentId, demurrageAmount, payee.address);
            });

            it("Should return the correct demurrage details when recorded", async function () {
                const demInfo = await shipmentManager.getDemurrageDetails(testShipmentId);

                expect(demInfo.amount).to.equal(demurrageAmount);
                expect(demInfo.payee).to.equal(payee.address);
                expect(demInfo.isPaid).to.be.false;
                expect(demInfo.recordedBy).to.equal(terminalOperator.address);
            });

             it("Should return default values if demurrage was not recorded", async function () {
                 // Setup: Create shipment 2 where demurrage is NOT recorded
                 const newShipmentId = 2;
                 await shipmentManager.connect(shipper).createShipment(carrier.address, consignee.address);

                 // Action & Assert: Get details for shipment 2
                 const demInfo = await shipmentManager.getDemurrageDetails(newShipmentId);
                 expect(demInfo.amount).to.equal(0);
                 expect(demInfo.payee).to.equal(ethers.ZeroAddress);
                 expect(demInfo.isPaid).to.be.false;
                 expect(demInfo.recordedBy).to.equal(ethers.ZeroAddress);
            });

             it("Should return default values for non-existent shipment ID", async function () {
                 // Note: This function currently doesn't check shipment existence first
                 const nonExistentId = 999;
                 const demInfo = await shipmentManager.getDemurrageDetails(nonExistentId);
                 expect(demInfo.amount).to.equal(0);
                 expect(demInfo.payee).to.equal(ethers.ZeroAddress);
                 expect(demInfo.isPaid).to.be.false;
                 expect(demInfo.recordedBy).to.equal(ethers.ZeroAddress);
             });
        });
    });

});