import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RegisterActor from "./pages/RegisterActor";
//import ShipmentDetailsPage from "./pages/ShipmentDetailsPage";
import BookShipment from "./pages/BookShipment";
import CarrierDashboard from "./pages/CarrierDashboard";
import TerminalOperatorDashboard from "./pages/TerminalOperatorDashboard";
import ConsigneeDashboard from "./pages/ConsigneeDashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<RegisterActor/>} />
        <Route path="/shipper" element={<BookShipment />} />
        <Route path="/carrier" element={<CarrierDashboard />} />
        <Route path="/terminal" element={<TerminalOperatorDashboard/>} />
        <Route path="/consignee" element={<ConsigneeDashboard/>} />
        <Route path="/view-bol" element={<div>View BoL Page</div>} />
      </Routes>
    </Router>
  );
}

export default App;
