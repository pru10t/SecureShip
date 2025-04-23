import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RegisterActor from "./pages/RegisterActor";
// import other pages...

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<RegisterActor/>} />
        <Route path="/shipper" element={<div>Shipper Dashboard</div>} />
        <Route path="/carrier" element={<div>Carrier Dashboard</div>} />
        <Route path="/terminal" element={<div>Terminal Operator</div>} />
        <Route path="/consignee" element={<div>Consignee Dashboard</div>} />
        <Route path="/view-bol" element={<div>View BoL Page</div>} />
      </Routes>
    </Router>
  );
}

export default App;
