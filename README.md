# SecureShip: Blockchain Supply Chain Hub

SecureShip is a Proof of Concept (PoC) project demonstrating a decentralized application for managing and tracking shipments on the blockchain. It aims to bring transparency, trust, and verifiability to the logistics process by leveraging smart contracts on the Ethereum network (deployed on the Sepolia testnet).

This project was developed using Solidity for smart contracts, Hardhat as the development environment, and includes a conceptual React frontend for user interaction via MetaMask.

## Features

* **Actor Registration:** Role-based registration for participants (Shipper, Carrier, Consignee, Terminal Operator) managed by an admin/platform owner (the Carrier in our primary use case).
* **Shipment Lifecycle Management:**
    * Creation of shipments (booking).
    * Addition of specific shipment details (container type, weight).
* **Bill of Lading (BoL) Management:** Securely record the hash and off-chain location (URI) of the BoL, with access control for viewing the location.
* **Status Tracking:** Real-time, timestamped updates for shipment statuses (Created, PickedUp, InTransit, Delivered).
* **Simplified Demurrage:** Recording and tracking of demurrage charges by authorized terminal operators.
* **Role-Based Permissions:** Smart contracts enforce that only authorized roles can perform specific actions.
* **Event-Driven Updates:** Smart contracts emit events for key actions, enabling off-chain tracking and UI updates.

## Architecture Overview

* **Smart Contracts (Backend):**
    * `ActorRegistry.sol`: Manages the registration and roles of all participants.
    * `ShipmentManager.sol`: Handles the core logic for shipment creation, status updates, document management, and demurrage. It interacts with `ActorRegistry` for permission checks.
* **Frontend (UI):** A React-based  application (located in the `shipment-ui/` subfolder) that allows users to interact with the deployed smart contracts through their MetaMask wallet.
* **Blockchain Network:** Deployed and tested on the Sepolia Ethereum testnet.

## Getting Started

### Prerequisites

* **Node.js:** LTS version (e.g., v20.x recommended). Using [nvm](https://github.com/nvm-sh/nvm) is advised for managing Node versions.
* **npm** (Node Package Manager) or **yarn**.
* **MetaMask:** Browser extension installed and configured for the Sepolia testnet.
* **Git:** For cloning the repository.


## Project Structure:
```
.
├── contracts/          # Solidity smart contracts (ActorRegistry.sol, ShipmentManager.sol)
├── scripts/            # Deployment and interaction scripts (e.g., deploy.js)
├── test/               # Smart contract tests (ActorRegistry.test.js, ShipmentManager.test.js)
├── shipment-ui/        # React frontend application
│   ├── public/
│   ├── src/
│   │   ├── components/ # React components (e.g., BookShipment.jsx)
│   │   ├── pages/      # Page components (e.g., RegisterActor.jsx)
│   │   ├── contracts/  # Copied ABIs and address constants
│   │   ├── utils/      # Utility functions (e.g., connectWallet.js)
│   │   └── App.js
│   └── package.json    # Frontend dependencies and scripts
├── .env                # Environment variables (PRIVATE_KEY, RPC_URL) - **DO NOT COMMIT**
├── .gitignore
├── hardhat.config.js   # Hardhat configuration
└── package.json        # Backend dependencies and Hardhat scripts
```
