// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // Use a recent compiler version

import "hardhat/console.sol"; // Optional: For debugging during development

contract ActorRegistry {

    // Define the possible roles for actors in the system
    enum Role {
        None,       // Default value, indicates not registered or role removed
        Shipper,
        Carrier,
        Consignee,
        TerminalOperator
        // We can add Arbitrator later if needed
    }

    // State variable to store the address of the contract owner/admin
    address public owner;

    // Mapping to store the role associated with each actor's address
    mapping(address => Role) public actorRoles;

    // Event emitted when a new actor is successfully registered
    event ActorRegistered(address indexed actor, Role role);
    // Event emitted when an actor's role is removed/changed (optional for now)
    // event ActorRoleChanged(address indexed actor, Role oldRole, Role newRole);

    // Modifier to restrict certain functions only to the contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "ActorRegistry: Caller is not the owner");
        _; // Continue execution of the function
    }

    // Constructor: Sets the contract deployer as the initial owner
    constructor() {
        owner = msg.sender;
        console.log("ActorRegistry deployed, owner:", owner);
    }

    /**
     * @notice Registers a new actor with a specific role. Only callable by the owner.
     * @param _actorAddress The address of the actor to register.
     * @param _role The role to assign to the actor.
     */
    function registerActor(address _actorAddress, Role _role) public onlyOwner {
        require(_actorAddress != address(0), "ActorRegistry: Cannot register the zero address");
        require(actorRoles[_actorAddress] == Role.None, "ActorRegistry: Actor already registered");
        require(_role != Role.None, "ActorRegistry: Cannot assign Role None"); // Ensure a valid role is assigned

        actorRoles[_actorAddress] = _role;
        console.log("Registered Actor:", _actorAddress, "with Role:", uint256(_role)); // Log role as uint for console
        emit ActorRegistered(_actorAddress, _role);
    }

    /**
     * @notice Retrieves the role of a given actor address.
     * @param _actorAddress The address to query.
     * @return The Role enum value associated with the address. Returns Role.None if not registered.
     */
    function getActorRole(address _actorAddress) public view returns (Role) {
        return actorRoles[_actorAddress];
    }

    /**
     * @notice Checks if an actor address is registered with any valid role.
     * @param _actorAddress The address to check.
     * @return bool True if the actor has a role other than None, false otherwise.
     */
    function isActorRegistered(address _actorAddress) public view returns (bool) {
        return actorRoles[_actorAddress] != Role.None;
    }

}