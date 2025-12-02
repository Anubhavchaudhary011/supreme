import React, { useState, useEffect } from "react";
import Select from "react-select";
import { toast } from "react-toastify";

const Passbook = () => {
  const token = localStorage.getItem("client_token");

  const [campaigns, setCampaigns] = useState([]);
  const [payments, setPayments] = useState([]);

  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(null);

  const [loading, setLoading] = useState(false);

  // ===========================
  // 1️⃣ FETCH CAMPAIGNS FOR CLIENT
  // ===========================
  const fetchCampaigns = async () => {
    try {
      const res = await fetch(
        "https://supreme-419p.onrender.com/api/client/client/campaigns",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to load campaigns");
        return;
      }

      const formatted = data.campaigns.map((c) => ({
        value: c._id,
        label: c.name,
      }));

      setCampaigns(formatted);
    } catch (err) {
      toast.error("Server error loading campaigns");
    }
  };

  // ===========================
  // 2️⃣ FETCH PAYMENTS FOR CLIENT
  // ===========================
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "https://supreme-419p.onrender.com/api/client/client/payments",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        toast.error(data.message);
        return;
      }

      setPayments(data.payments || []);
    } catch (err) {
      setLoading(false);
      toast.error("Failed to fetch payments");
    }
  };

  // ===========================
  // LOAD DATA ON PAGE OPEN
  // ===========================
  useEffect(() => {
    fetchCampaigns();
    fetchPayments();
  }, []);

  // ===========================
  // EXTRACT OUTLETS (SHOP NAMES)
  // ===========================
  const outletOptions = [
    ...new Set(
      payments.map((p) => p.retailerShopName || p.retailerName)
    ),
  ].map((name) => ({ label: name, value: name }));

  // ===========================
  // FILTER BASED ON OUTLET + CAMPAIGN
  // ===========================
  const filteredPayments = payments.filter((p) => {
    const shopName = p.retailerShopName || p.retailerName;

    if (selectedOutlet && shopName !== selectedOutlet.value) return false;

    if (
      selectedCampaigns.length > 0 &&
      !selectedCampaigns.some((x) => x.value === p.campaignId)
    ) {
      return false;
    }

    return true;
  });

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6 text-[#E4002B]">Passbook</h2>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Campaign Dropdown */}
        <Select
          options={campaigns}
          value={selectedCampaigns}
          onChange={setSelectedCampaigns}
          placeholder="Select Campaign"
          isSearchable
          isMulti
        />

        {/* Outlet Dropdown */}
        <Select
          options={outletOptions}
          value={selectedOutlet}
          onChange={setSelectedOutlet}
          placeholder="Select Outlet"
          isSearchable
        />
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-black rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-[#E4002B] text-white">
              <th className="border border-black px-3 py-2">Outlet (Shop Name)</th>
              <th className="border border-black px-3 py-2">Campaign</th>
              <th className="border border-black px-3 py-2">Payment Status</th>
              <th className="border border-black px-3 py-2">Total Amount</th>
              <th className="border border-black px-3 py-2">Paid</th>
              <th className="border border-black px-3 py-2">Remaining</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  Loading...
                </td>
              </tr>
            ) : filteredPayments.length > 0 ? (
              filteredPayments.map((p, i) => (
                <tr key={i} className="odd:bg-gray-100">
                  <td className="border border-black px-3 py-2">
                    {p.retailerShopName || p.retailerName}
                  </td>
                  <td className="border border-black px-3 py-2">
                    {p.campaignName}
                  </td>
                  <td className="border border-black px-3 py-2">
                    {p.paymentStatus}
                  </td>
                  <td className="border border-black px-3 py-2">
                    ₹{p.totalAmount}
                  </td>
                  <td className="border border-black px-3 py-2 text-green-600">
                    ₹{p.amountPaid}
                  </td>
                  <td className="border border-black px-3 py-2 text-red-600">
                    ₹{p.remainingAmount}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-4">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Passbook;
