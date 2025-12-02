import React, { useState, useEffect } from "react";
import {
    FaHome,
    FaWallet,
    FaBell,
    FaFileAlt,
    FaPhoneAlt,
    FaUserCircle,
} from "react-icons/fa";

import ClientHome from "./ClientHome";
import Passbook from "./Passbook";
import Notifications from "./Notifications";
import DetailedReport from "./DetailedReport";
import ContactUs from "./ContactUs";

const ClientDashboard = () => {
    const [selectedComponent, setSelectedComponent] = useState("dashboard");

    // API DATA STATES
    const [campaigns, setCampaigns] = useState([]);
    const [payments, setPayments] = useState([]);
    const [reportedOutlets, setReportedOutlets] = useState([]);
    const [loading, setLoading] = useState(true);

    // FETCH ALL CLIENT DATA
    const fetchClientData = async () => {
        try {
            const token = localStorage.getItem("client_token");

            if (!token) {
                console.warn("❗ No token found");
                setLoading(false);
                return;
            }

            console.log("🔑 Token found, fetching data...");

            const headers = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            // 1️⃣ Fetch Campaigns
            const campRes = await fetch(
                "https://supreme-419p.onrender.com/api/client/client/campaigns",
                { headers }
            );

            if (!campRes.ok) {
                console.error("❌ Campaigns fetch failed:", campRes.status);
                throw new Error("Failed to fetch campaigns");
            }

            const campData = await campRes.json();
            console.log("✅ Campaigns loaded:", campData);

            // 2️⃣ Fetch Payments
            const payRes = await fetch(
                "https://supreme-419p.onrender.com/api/client/client/payments",
                { headers }
            );

            if (!payRes.ok) {
                console.error("❌ Payments fetch failed:", payRes.status);
            }

            const payData = payRes.ok ? await payRes.json() : { payments: [] };
            console.log("✅ Payments loaded:", payData);

            // 3️⃣ Fetch Reported Outlets
            const reportRes = await fetch(
                "https://supreme-419p.onrender.com/api/client/client/reported-outlets",
                { headers }
            );

            if (!reportRes.ok) {
                console.error("❌ Reported outlets fetch failed:", reportRes.status);
            }

            const reportData = reportRes.ok ? await reportRes.json() : { outlets: [] };
            console.log("✅ Reported outlets loaded:", reportData);

            setCampaigns(campData.campaigns || []);
            setPayments(payData.payments || []);
            setReportedOutlets(reportData.outlets || []);

            console.log("✅ All data loaded successfully");
            console.log("📊 Total Campaigns:", campData.campaigns?.length || 0);
            console.log("💰 Total Payments:", payData.payments?.length || 0);
            console.log("🏪 Total Outlets:", reportData.outlets?.length || 0);

        } catch (error) {
            console.error("❌ Client Dashboard API Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClientData();
    }, []);

    const renderContent = () => {
        const sharedProps = {
            campaigns,
            payments,
            reportedOutlets,
            loading,
        };

        switch (selectedComponent) {
            case "dashboard":
                return <ClientHome {...sharedProps} />;
            case "passbook":
                return <Passbook {...sharedProps} />;
            case "notifications":
                return <Notifications {...sharedProps} />;
            case "detailer":
                return <DetailedReport {...sharedProps} />;
            case "contact":
                return <ContactUs />;
            default:
                return <ClientHome {...sharedProps} />;
        }
    };

    const activeClass = "text-[#E4002B] font-semibold";

    return (
        <>
            {/* TOP NAVBAR */}
            <nav className="fixed top-0 w-full z-50 bg-white shadow-md px-6 md:px-10">
                <div className="flex justify-between items-center py-4 max-w-screen-xl mx-auto relative">
                    <img src="cpLogo.jpg" alt="Logo" className="h-12 cursor-pointer" />

                    <h2 className="absolute left-1/2 transform -translate-x-1/2 text-xl md:text-2xl font-bold text-[#E4002B]">
                        Client Home Page
                    </h2>
                </div>
            </nav>

            {/* LAYOUT */}
            <div className="flex min-h-screen bg-gray-50 pt-20">

                {/* SIDEBAR */}
                <div className="w-64 bg-white shadow-md h-[calc(100vh-5rem)] fixed top-20 left-0 p-4">
                    <div className="text-center mb-6">
                        <FaUserCircle className="h-20 w-20 mx-auto text-[#E4002B]" />
                        <h3 className="mt-3 text-lg font-semibold text-gray-800">
                            Welcome, Client
                        </h3>
                    </div>

                    <ul className="space-y-3 text-gray-700 font-medium">
                        <li
                            onClick={() => setSelectedComponent("dashboard")}
                            className={`cursor-pointer flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 
                            ${selectedComponent === "dashboard" ? activeClass : ""}`}
                        >
                            <FaHome /> Dashboard
                        </li>

                        <li
                            onClick={() => setSelectedComponent("passbook")}
                            className={`cursor-pointer flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 
                            ${selectedComponent === "passbook" ? activeClass : ""}`}
                        >
                            <FaWallet /> Passbook
                        </li>

                        <li
                            onClick={() => setSelectedComponent("notifications")}
                            className={`cursor-pointer flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 
                            ${selectedComponent === "notifications" ? activeClass : ""}`}
                        >
                            <FaBell /> Notifications
                        </li>

                        <li
                            onClick={() => setSelectedComponent("detailer")}
                            className={`cursor-pointer flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 
                            ${selectedComponent === "detailer" ? activeClass : ""}`}
                        >
                            <FaFileAlt /> Detailer Report
                        </li>

                        <li
                            onClick={() => setSelectedComponent("contact")}
                            className={`cursor-pointer flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 
                            ${selectedComponent === "contact" ? activeClass : ""}`}
                        >
                            <FaPhoneAlt /> Contact Us
                        </li>
                    </ul>
                </div>

                {/* MAIN CONTENT */}
                <div className="ml-64 p-6 w-full h-[calc(100vh-5rem)] overflow-y-auto">
                    {renderContent()}
                </div>
            </div>
        </>
    );
};

export default ClientDashboard;