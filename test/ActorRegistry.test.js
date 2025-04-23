const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ActorRegistry", function () {
    let ActorRegistry;
    let actorRegistry; // Instance of the deployed contract
    let owner;         // Deployer account
    let addr1;         // Another test account
    let addr2;         // Yet another test account

    // Define Enum values mirroring Solidity's Role enum for easier comparison
    // Solidity enums start at 0
    const Role = {
        None: 0,
        Shipper: 1,
        Carrier: 2,
        Consignee: 3,
        TerminalOperator: 4
        // Add Arbitrator if/when implemented
    };

    // This runs once before each test case (it block) in this describe block
    beforeEach(async function () {
        // Get the ContractFactory and Signers here.
        ActorRegistry = await ethers.getContractFactory("ActorRegistry");
        [owner, addr1, addr2] = await ethers.getSigners(); // Get multiple accounts provided by Hardhat Network

        // Deploy a new instance of the contract before each test
        actorRegistry = await ActorRegistry.deploy();
        // No need for actorRegistry.deployed() with ethers v5+ / Hardhat
    });

    // Test case 1: Check deployment
    describe("Deployment", function () {
        it("Should set the deployer as the owner", async function () {
            // Check if the owner() function returns the address of the 'owner' signer
            expect(await actorRegistry.owner()).to.equal(owner.address);
        });

        it("Should initially have no registered actors", async function () {
             // Check if some random address (addr1) is initially not registered
             expect(await actorRegistry.isActorRegistered(addr1.address)).to.be.false;
             // Check if the role for addr1 is None
             expect(await actorRegistry.getActorRole(addr1.address)).to.equal(Role.None);
         });
    });

    // Test case 2: Actor Registration (We'll add more 'it' blocks here)
    describe("Actor Registration", function () {
        // Test Case 3: Non-owner failure
        it("Should prevent non-owners from registering actors", async function() {
            // Expect the call from addr1 (not the owner) to be reverted
            await expect(
                actorRegistry.connect(addr1).registerActor(addr2.address, Role.Shipper)
            ).to.be.revertedWith("ActorRegistry: Caller is not the owner"); // Check the exact error message from the onlyOwner modifier
        });

        // Test Case 4: Zero address failure
        it("Should prevent registering the zero address", async function() {
            // The zero address (0x00...00) is often invalid in Ethereum
            const zeroAddress = ethers.ZeroAddress; // Use ethers constant for clarity
            await expect(
                actorRegistry.connect(owner).registerActor(zeroAddress, Role.Carrier)
            ).to.be.revertedWith("ActorRegistry: Cannot register the zero address");
        });

        // Test Case 5: Re-registration failure
        it("Should prevent registering an actor that is already registered", async function() {
            // First, successfully register addr1 as a Shipper
            await actorRegistry.connect(owner).registerActor(addr1.address, Role.Shipper);

            // Now, try to register addr1 AGAIN, perhaps as a Carrier. This should fail.
            await expect(
                actorRegistry.connect(owner).registerActor(addr1.address, Role.Carrier)
            ).to.be.revertedWith("ActorRegistry: Actor already registered");
        });

        // Test Case 6: Assigning Role.None failure
        it("Should prevent assigning Role.None", async function() {
            // Try to register addr1 with the invalid Role.None
            await expect(
                actorRegistry.connect(owner).registerActor(addr1.address, Role.None)
            ).to.be.revertedWith("ActorRegistry: Cannot assign Role None");
        });

        it("Should allow the owner to register a Shipper", async function() {
            // Action: Owner registers addr1 as a Shipper
            // We use .connect(owner) although owner is the default signer from deploy,
            // it makes intent clear. For calls from addr1/addr2, .connect() is essential.
            await actorRegistry.connect(owner).registerActor(addr1.address, Role.Shipper);

            // Assertion 1: Check if the role was correctly assigned
            expect(await actorRegistry.getActorRole(addr1.address))
                .to.equal(Role.Shipper);

            // Assertion 2: Check if the actor is now marked as registered
            expect(await actorRegistry.isActorRegistered(addr1.address))
                .to.be.true;
         });

         it("Should emit an ActorRegistered event on successful registration", async function() {
            // We expect the transaction where the owner registers addr2 as a Carrier
            // to emit an 'ActorRegistered' event from the actorRegistry contract.
            await expect(actorRegistry.connect(owner).registerActor(addr2.address, Role.Carrier))
                .to.emit(actorRegistry, "ActorRegistered") // Check for the event name
                .withArgs(addr2.address, Role.Carrier); // Check for the correct arguments in the event
         });

         it("Should prevent non-owners from registering actors", async function() {
            // Expect the call from addr1 (not the owner) to be reverted
            // Check for the specific revert message from the onlyOwner modifier
            await expect(
                actorRegistry.connect(addr1).registerActor(addr2.address, Role.Shipper)
            ).to.be.revertedWith("ActorRegistry: Caller is not the owner");
        });

        // Add more test cases...
    });

     // Test case 3: Role Checking
     describe("Role Checking", function () {

        it("getActorRole should return the correct role for a registered actor", async function() {
            // Arrange: Register addr1 as a Carrier first
            await actorRegistry.connect(owner).registerActor(addr1.address, Role.Carrier);

            // Act & Assert: Check if getActorRole returns the correct role
            expect(await actorRegistry.getActorRole(addr1.address))
                .to.equal(Role.Carrier);
        });

        it("getActorRole should return Role.None for an unregistered actor", async function() {
            // Act & Assert: Check addr2 (which hasn't been registered)
            expect(await actorRegistry.getActorRole(addr2.address))
                .to.equal(Role.None);
        });

        it("isActorRegistered should return true for a registered actor", async function() {
            // Arrange: Register addr1 as a Shipper
            await actorRegistry.connect(owner).registerActor(addr1.address, Role.Shipper);

            // Act & Assert: Check if isActorRegistered returns true
            expect(await actorRegistry.isActorRegistered(addr1.address))
                .to.be.true;
        });

        it("isActorRegistered should return false for an unregistered actor", async function() {
             // Act & Assert: Check addr2 (which hasn't been registered)
             expect(await actorRegistry.isActorRegistered(addr2.address))
                 .to.be.false;
        });

        it("isActorRegistered should return false for the zero address", async function() {
            // Act & Assert: Check the zero address explicitly
            const zeroAddress = ethers.ZeroAddress;
            expect(await actorRegistry.isActorRegistered(zeroAddress))
                .to.be.false;
       });
    });

});