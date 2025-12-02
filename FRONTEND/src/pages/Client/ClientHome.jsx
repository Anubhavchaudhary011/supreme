import React, { useState, useMemo, useEffect, useRef } from "react";
import Select from "react-select";
import { FaStore, FaCheckCircle, FaClipboardList, FaMoneyBillWave, FaSearch } from "react-icons/fa";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
);

const regionStates = {
  North: [
    "Jammu and Kashmir",
    "Ladakh",
    "Himachal Pradesh",
    "Punjab",
    "Haryana",
    "Uttarakhand",
    "Uttar Pradesh",
    "Delhi",
    "Chandigarh",
  ],
  South: [
    "Andhra Pradesh",
    "Karnataka",
    "Kerala",
    "Tamil Nadu",
    "Telangana",
    "Puducherry",
    "Lakshadweep",
  ],
  East: [
    "Bihar",
    "Jharkhand",
    "Odisha",
    "West Bengal",
    "Sikkim",
    "Andaman and Nicobar Islands",
    "Arunachal Pradesh",
    "Assam",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Tripura",
  ],
  West: [
    "Rajasthan",
    "Gujarat",
    "Maharashtra",
    "Madhya Pradesh",
    "Goa",
    "Chhattisgarh",
    "Dadra and Nagar Haveli and Daman and Diu",
  ],
};

const paymentOptions = [
  { value: "Pending", label: "Pending" },
  { value: "Partially Paid", label: "Partially Paid" },
  { value: "Completed", label: "Completed" },
];

const dateOptions = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "last30days", label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "custom", label: "Custom Range" },
];

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    borderColor: state.isFocused ? "#E4002B" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 1px #E4002B" : "none",
    "&:hover": { borderColor: "#E4002B" },
    minHeight: "42px",
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? "#FEE2E2" : "white",
    color: "#333",
    "&:active": { backgroundColor: "#FECACA" },
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: "#FEE2E2",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: "#E4002B",
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: "#E4002B",
    ":hover": {
      backgroundColor: "#E4002B",
      color: "white",
    },
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 20,
  }),
};

const ClientHome = ({ campaigns = [], payments = [], reportedOutlets = [], loading }) => {
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [regions, setRegions] = useState([]);
  const [states, setStates] = useState([]);
  const [payment, setPayment] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchText, setSearchText] = useState("");

  // Generate campaign options from actual data
  const campaignOptions = useMemo(() => {
    return campaigns.map(c => ({
      value: c._id,
      label: c.name
    }));
  }, [campaigns]);

  // Generate region options from actual campaigns (only regions allocated to client)
  const regionOptions = useMemo(() => {
    const uniqueRegions = new Set();
    campaigns.forEach(c => {
      c.regions?.forEach(r => uniqueRegions.add(r));
    });
    return Array.from(uniqueRegions).map(r => ({
      value: r.toLowerCase(),
      label: r
    }));
  }, [campaigns]);

  // Generate state options from actual campaigns (only states allocated to client)
  const allocatedStates = useMemo(() => {
    const uniqueStates = new Set();
    campaigns.forEach(c => {
      c.states?.forEach(s => uniqueStates.add(s));
    });
    return Array.from(uniqueStates);
  }, [campaigns]);

  const getStateOptions = () => {
    // If no region selected, show all allocated states
    if (regions.length === 0) {
      return allocatedStates.map(state => ({
        value: state.toLowerCase().replace(/\s+/g, '-'),
        label: state
      }));
    }

    // If regions selected, show only allocated states that belong to selected regions
    const filteredStates = regions.flatMap(region => {
      const regionKey = region.label;
      return regionStates[regionKey] || [];
    });

    // Filter to show only states that are allocated to the client
    const validStates = filteredStates.filter(state => 
      allocatedStates.includes(state)
    );

    return validStates.map(state => ({
      value: state.toLowerCase().replace(/\s+/g, '-'),
      label: state
    }));
  };

  const stateOptions = getStateOptions();

  const handleRegionChange = (selectedRegions) => {
    setRegions(selectedRegions);
    if (selectedRegions.length > 0) {
      // Get valid state labels for selected regions from the regionStates mapping
      const validStateLabels = selectedRegions.flatMap(region => regionStates[region.label] || []);
      
      // Filter current states to keep only those that:
      // 1. Are allocated to the client
      // 2. Belong to the selected regions
      const filteredStates = states.filter(state =>
        validStateLabels.some(validState =>
          validState.toLowerCase().replace(/\s+/g, '-') === state.value
        ) && allocatedStates.includes(state.label)
      );
      setStates(filteredStates);
    }
  };

  const handleDateChange = (selected) => {
    setDateRange(selected);
    if (selected?.value === "custom") {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
      setFromDate("");
      setToDate("");
    }
  };

  // Build complete outlets list first (before any filtering)
  const allOutlets = useMemo(() => {
    const outletsMap = new Map();

    // Process ALL campaigns to build complete outlet list
    campaigns.forEach(campaign => {
      campaign.retailers?.forEach(retailer => {
        const retailerId = retailer.retailerId;
        
        if (!outletsMap.has(retailerId)) {
          // Find payment info for this retailer
          const paymentInfo = payments.find(p => p.retailerId === retailerId);
          
          // Find employees assigned to this retailer from retailerWiseEmployees
          const retailerEmployees = campaign.retailerWiseEmployees?.find(
            rwe => rwe.retailerId === retailerId
          );

          outletsMap.set(retailerId, {
            retailerId: retailerId,
            retailerName: retailer.retailerName,
            retailerCode: retailer.retailerCode,
            shopName: retailer.shopName,
            city: retailer.city,
            state: retailer.state,
            contactNo: retailer.contactNo,
            paymentStatus: paymentInfo?.paymentStatus || "Pending",
            employees: retailerEmployees?.employees || [],
            campaignId: campaign._id,
            campaignName: campaign.name,
            regions: campaign.regions,
            states: campaign.states
          });
        }
      });
    });

    return Array.from(outletsMap.values());
  }, [campaigns, payments]);

  // Calculate filtered statistics and filter outlets
  const { statistics, filteredOutlets } = useMemo(() => {
    let filteredCampaigns = campaigns;

    // Filter by selected campaigns
    if (selectedCampaigns.length > 0) {
      const selectedIds = selectedCampaigns.map(c => c.value);
      filteredCampaigns = filteredCampaigns.filter(c => selectedIds.includes(c._id));
    }

    // Filter by regions
    if (regions.length > 0) {
      const selectedRegionLabels = regions.map(r => r.label);
      filteredCampaigns = filteredCampaigns.filter(c =>
        c.regions?.some(r => selectedRegionLabels.includes(r))
      );
    }

    // Filter by states
    if (states.length > 0) {
      const selectedStateLabels = states.map(s => s.label);
      filteredCampaigns = filteredCampaigns.filter(c =>
        c.states?.some(s => selectedStateLabels.includes(s))
      );
    }

    // Get filtered campaign IDs
    const filteredCampaignIds = filteredCampaigns.map(c => c._id);

    // Calculate Outlets Enrolled (totalOutletsAssigned)
    const outletsEnrolled = filteredCampaigns.reduce(
      (sum, c) => sum + (c.totalOutletsAssigned || 0), 0
    );

    // Calculate Outlets Activated (totalOutletsAccepted)
    const outletsActivated = filteredCampaigns.reduce(
      (sum, c) => sum + (c.totalOutletsAccepted || 0), 0
    );

    // Calculate Outlets Reported
    const filteredRetailerIds = new Set();
    filteredCampaigns.forEach(campaign => {
      campaign.retailers?.forEach(retailer => {
        if (retailer.retailerId) {
          filteredRetailerIds.add(retailer.retailerId);
        }
      });
    });

    const outletsReported = reportedOutlets?.filter(outlet => 
      filteredRetailerIds.has(outlet.retailerId)
    ).length || 0;

    // Calculate Outlets Paid
    let filteredPayments = payments.filter(p => 
      filteredCampaignIds.includes(p.campaignId)
    );

    if (payment) {
      filteredPayments = filteredPayments.filter(p => p.paymentStatus === payment.value);
    }

    const outletsPaid = filteredPayments.filter(
      p => p.paymentStatus === "Completed"
    ).length;

    // ===== FILTER OUTLETS TABLE =====
    let outletsArray = allOutlets;

    // Filter by campaign
    if (selectedCampaigns.length > 0) {
      const selectedIds = selectedCampaigns.map(c => c.value);
      outletsArray = outletsArray.filter(outlet => selectedIds.includes(outlet.campaignId));
    }

    // Filter by regions
    if (regions.length > 0) {
      const selectedRegionLabels = regions.map(r => r.label);
      outletsArray = outletsArray.filter(outlet =>
        outlet.regions?.some(r => selectedRegionLabels.includes(r))
      );
    }

    // Filter by states
    if (states.length > 0) {
      const selectedStateLabels = states.map(s => s.label);
      outletsArray = outletsArray.filter(outlet =>
        outlet.states?.some(s => selectedStateLabels.includes(s))
      );
    }

    // Filter by payment status
    if (payment) {
      outletsArray = outletsArray.filter(outlet => outlet.paymentStatus === payment.value);
    }

    // Apply search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      outletsArray = outletsArray.filter(outlet => 
        outlet.retailerName?.toLowerCase().includes(searchLower) ||
        outlet.retailerCode?.toLowerCase().includes(searchLower) ||
        outlet.shopName?.toLowerCase().includes(searchLower) ||
        outlet.city?.toLowerCase().includes(searchLower)
      );
    }

    return {
      statistics: {
        outletsEnrolled,
        outletsActivated,
        outletsReported,
        outletsPaid
      },
      filteredOutlets: outletsArray
    };
  }, [allOutlets, campaigns, payments, reportedOutlets, selectedCampaigns, regions, states, payment, searchText]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E4002B]"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-[#E4002B]">Dashboard Overview</h2>

      {/* FILTERS */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        {/* Campaign and Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Campaign */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">Campaign</label>
            <Select
              styles={customSelectStyles}
              options={campaignOptions}
              value={selectedCampaigns}
              onChange={setSelectedCampaigns}
              isSearchable
              isMulti
              placeholder="Select campaigns"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">Date Range</label>
            <Select
              styles={customSelectStyles}
              options={dateOptions}
              value={dateRange}
              onChange={handleDateChange}
              isSearchable
              placeholder="Select date range"
            />
          </div>
        </div>

        {/* Custom Date Range */}
        {showCustomDate && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border border-gray-300 p-2.5 rounded w-full focus:outline-none focus:ring-1 focus:ring-[#E4002B] focus:border-[#E4002B]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border border-gray-300 p-2.5 rounded w-full focus:outline-none focus:ring-1 focus:ring-[#E4002B] focus:border-[#E4002B]"
              />
            </div>
          </div>
        )}

        {/* Region + State + Payment in one row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Region */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">Region</label>
            <Select
              styles={customSelectStyles}
              options={regionOptions}
              value={regions}
              onChange={handleRegionChange}
              isSearchable
              isMulti
              placeholder="Select regions"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">State</label>
            <Select
              styles={customSelectStyles}
              options={stateOptions}
              value={states}
              onChange={setStates}
              isSearchable
              isMulti
              placeholder="Select states"
            />
          </div>

          {/* Payment */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">Payment</label>
            <Select
              styles={customSelectStyles}
              options={paymentOptions}
              value={payment}
              onChange={setPayment}
              isSearchable
              placeholder="Select payment"
            />
          </div>
        </div>

        {/* Search Bar with Button */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-gray-700">Search</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by name or outlet code..."
                className="border border-gray-300 pl-10 pr-4 py-2.5 rounded w-full focus:outline-none focus:ring-1 focus:ring-[#E4002B] focus:border-[#E4002B] transition-colors"
              />
            </div>
            <button
              onClick={() => console.log("Search clicked with:", searchText)}
              className="bg-[#E4002B] text-white px-6 py-2.5 rounded font-medium hover:bg-[#C3002B] transition-colors flex items-center gap-2"
            >
              <FaSearch />
              Search
            </button>
          </div>
        </div>
      </div>

      {/* CARDS - NOW WITH ACTUAL DATA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-md text-center hover:shadow-lg transition-shadow">
          <FaStore className="text-[#E4002B] text-3xl mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Outlets Enrolled</h3>
          <p className="text-3xl font-bold">{statistics.outletsEnrolled}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md text-center hover:shadow-lg transition-shadow">
          <FaCheckCircle className="text-[#E4002B] text-3xl mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Outlets Activated</h3>
          <p className="text-3xl font-bold">{statistics.outletsActivated}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md text-center hover:shadow-lg transition-shadow">
          <FaClipboardList className="text-[#E4002B] text-3xl mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Outlets Reported</h3>
          <p className="text-3xl font-bold">{statistics.outletsReported}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md text-center hover:shadow-lg transition-shadow">
          <FaMoneyBillWave className="text-[#E4002B] text-3xl mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Outlets Paid</h3>
          <p className="text-3xl font-bold">{statistics.outletsPaid}</p>
        </div>
      </div>

      {/* GRAPHS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Campaign-wise Outlets Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Campaign-wise Outlets</h3>
          <Bar
            data={{
              labels: campaigns.slice(0, 5).map(c => c.name),
              datasets: [
                {
                  label: 'Enrolled',
                  data: campaigns.slice(0, 5).map(c => c.totalOutletsAssigned || 0),
                  backgroundColor: 'rgba(228, 0, 43, 0.6)',
                  borderColor: 'rgba(228, 0, 43, 1)',
                  borderWidth: 1,
                },
                {
                  label: 'Activated',
                  data: campaigns.slice(0, 5).map(c => c.totalOutletsAccepted || 0),
                  backgroundColor: 'rgba(34, 197, 94, 0.6)',
                  borderColor: 'rgba(34, 197, 94, 1)',
                  borderWidth: 1,
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: false,
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1
                  }
                }
              }
            }}
          />
        </div>

        {/* Payment Status Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Status</h3>
          <Pie
            data={{
              labels: ['Completed', 'Partially Paid', 'Pending'],
              datasets: [
                {
                  label: 'Outlets',
                  data: [
                    payments.filter(p => p.paymentStatus === 'Completed').length,
                    payments.filter(p => p.paymentStatus === 'Partially Paid').length,
                    payments.filter(p => p.paymentStatus === 'Pending').length,
                  ],
                  backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                  ],
                  borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(251, 191, 36, 1)',
                    'rgba(239, 68, 68, 1)',
                  ],
                  borderWidth: 2,
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  position: 'bottom',
                },
                title: {
                  display: false,
                }
              }
            }}
          />
        </div>

        {/* State-wise Outlets Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">State-wise Distribution</h3>
          <Bar
            data={{
              labels: (() => {
                const stateCounts = {};
                allOutlets.forEach(outlet => {
                  if (outlet.state) {
                    stateCounts[outlet.state] = (stateCounts[outlet.state] || 0) + 1;
                  }
                });
                return Object.keys(stateCounts).slice(0, 8);
              })(),
              datasets: [
                {
                  label: 'Outlets',
                  data: (() => {
                    const stateCounts = {};
                    allOutlets.forEach(outlet => {
                      if (outlet.state) {
                        stateCounts[outlet.state] = (stateCounts[outlet.state] || 0) + 1;
                      }
                    });
                    return Object.values(stateCounts).slice(0, 8);
                  })(),
                  backgroundColor: 'rgba(59, 130, 246, 0.6)',
                  borderColor: 'rgba(59, 130, 246, 1)',
                  borderWidth: 1,
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              indexAxis: 'y',
              plugins: {
                legend: {
                  display: false,
                },
                title: {
                  display: false,
                }
              },
              scales: {
                x: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1
                  }
                }
              }
            }}
          />
        </div>

        {/* Region-wise Outlets */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Region-wise Distribution</h3>
          <Pie
            data={{
              labels: (() => {
                const regionCounts = {};
                campaigns.forEach(campaign => {
                  campaign.regions?.forEach(region => {
                    const outletCount = campaign.totalOutletsAssigned || 0;
                    regionCounts[region] = (regionCounts[region] || 0) + outletCount;
                  });
                });
                return Object.keys(regionCounts);
              })(),
              datasets: [
                {
                  label: 'Outlets',
                  data: (() => {
                    const regionCounts = {};
                    campaigns.forEach(campaign => {
                      campaign.regions?.forEach(region => {
                        const outletCount = campaign.totalOutletsAssigned || 0;
                        regionCounts[region] = (regionCounts[region] || 0) + outletCount;
                      });
                    });
                    return Object.values(regionCounts);
                  })(),
                  backgroundColor: [
                    'rgba(228, 0, 43, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                  ],
                  borderColor: [
                    'rgba(228, 0, 43, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(34, 197, 94, 1)',
                    'rgba(251, 191, 36, 1)',
                  ],
                  borderWidth: 2,
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  position: 'bottom',
                },
                title: {
                  display: false,
                }
              }
            }}
          />
        </div>
      </div>

      {/* OUTLETS TABLE */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Outlets Overview</h3>
        
        {filteredOutlets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No outlets found for the selected filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">S.No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Outlet Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Outlet Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Shop Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">City</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">State</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee Assigned</th>
                </tr>
              </thead>
              <tbody>
                {filteredOutlets.map((outlet, index) => (
                  <tr key={outlet.retailerId} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{outlet.retailerName || "N/A"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                        {outlet.retailerCode || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{outlet.shopName || "N/A"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{outlet.city || "N/A"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{outlet.state || "N/A"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{outlet.contactNo || "N/A"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        outlet.paymentStatus === "Completed" 
                          ? "bg-green-100 text-green-800"
                          : outlet.paymentStatus === "Partially Paid"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {outlet.paymentStatus || "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {outlet.employees && outlet.employees.length > 0 ? (
                        <div className="space-y-1">
                          {outlet.employees.map((emp, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-medium">{emp.employeeName}</span>
                              <span className="text-gray-500"> ({emp.employeeCode})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Not Assigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination or Load More can be added here */}
        {filteredOutlets.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Showing {filteredOutlets.length} outlet{filteredOutlets.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientHome;