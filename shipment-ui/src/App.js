import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RegisterActor from "./pages/RegisterActor";
import ShipmentDetailsPage from "./pages/ShipmentDetailsPage";
import BookShipment from "./pages/BookShipment";
// import other pages...

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<RegisterActor/>} />
        <Route path="/shipment/:id" element={<ShipmentDetailsPage />} />
        <Route path="/shipper" element={<BookShipment />} />
        <Route path="/carrier" element={<div>Carrier Dashboard</div>} />
        <Route path="/terminal" element={<div>Terminal Operator</div>} />
        <Route path="/consignee" element={<div>Consignee Dashboard</div>} />
        <Route path="/view-bol" element={<div>View BoL Page</div>} />
      </Routes>
    </Router>
  );
}

export default App;
