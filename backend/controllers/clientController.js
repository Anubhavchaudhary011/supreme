import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ClientAdmin, ClientUser, Campaign, Payment, EmployeeReport } from "../models/user.js";
import mongoose from "mongoose";

/* ===========================
   CLIENT ADMIN LOGIN
=========================== */
export const loginClientAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await ClientAdmin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Client Admin not found" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin._id, role: "client_admin" },
      process.env.JWT_SECRET || "supremeSecretKey",
      { expiresIn: "7d" }
    );

    res.status(200).json({ message: "Login successful", token, admin });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===========================
   CLIENT USER LOGIN
=========================== */
export const loginClientUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await ClientUser.findOne({ email });
    if (!user) return res.status(404).json({ message: "Client User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: "client_user" },
      process.env.JWT_SECRET || "supremeSecretKey",
      { expiresIn: "7d" }
    );

    res.status(200).json({ message: "Login successful", token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===========================
   SET PAYMENT PLAN
=========================== */
export const clientSetPaymentPlan = async (req, res) => {
  try {
    const { campaignId, retailerId, totalAmount, notes } = req.body;

    // Verify campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    // Check if user is client - ✅ FIXED: use req.user.role
    if (!["client_admin", "client_user"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only client admins or users can set payments" });
    }

    // Check retailer is assigned to campaign
    const retailerAssigned = campaign.assignedRetailers.some(r => r.retailerId.toString() === retailerId);
    if (!retailerAssigned) {
      return res.status(400).json({ message: "Retailer not assigned to this campaign" });
    }

    // Create payment - ✅ FIXED: use req.user.id
    const payment = await Payment.create({
      retailer: retailerId,
      campaign: campaignId,
      totalAmount,
      amountPaid: 0,
      remainingAmount: totalAmount,
      paymentStatus: "Pending",
      lastUpdatedBy: req.user.id,
      notes,
    });

    res.status(201).json({ message: "Payment plan set successfully", payment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===========================
   GET ALL EMPLOYEE REPORTS FOR CLIENT
=========================== */
export const getAllEmployeeReportsForClient = async (req, res) => {
  try {
    // ✅ FIXED: Access req.user.role and req.user.id
    const { role, id: userId } = req.user;

    console.log("📊 Reports - User ID:", userId, "Role:", role);

    if (!["client_admin", "client_user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    /* ======================================================
       1️⃣ GET ORGANIZATION NAME
    ====================================================== */

    let orgName;

    if (role === "client_admin") {
      const admin = await ClientAdmin.findById(userId);
      if (!admin) return res.status(404).json({ message: "Client Admin not found" });
      orgName = admin.organizationName;
      console.log("✅ Admin org:", orgName);
    }

    if (role === "client_user") {
      const user = await ClientUser.findById(userId).populate("parentClientAdmin");
      if (!user) return res.status(404).json({ message: "Client User not found" });
      orgName = user.parentClientAdmin?.organizationName;
      if (!orgName) return res.status(404).json({ message: "Organization not found" });
      console.log("✅ User org:", orgName);
    }

    /* ======================================================
       2️⃣ GET ALL CAMPAIGN IDs FOR THIS ORGANIZATION
    ====================================================== */

    const campaigns = await Campaign.find({ client: orgName }).select("_id");
    const campaignIds = campaigns.map((c) => c._id);

    if (!campaignIds.length) {
      return res.status(200).json({
        message: "No campaigns found for this organization",
        totalReports: 0,
        reports: []
      });
    }

    /* ======================================================
       3️⃣ APPLY OPTIONAL FILTERS
    ====================================================== */

    const { employeeId, retailerId, campaignId, fromDate, toDate } = req.query;

    let filter = {
      campaignId: { $in: campaignIds }
    };

    if (employeeId) filter.employeeId = employeeId;
    if (retailerId) filter.retailerId = retailerId;

    // Allow specific campaign filter only if it belongs to organization
    if (campaignId && campaignIds.includes(campaignId)) {
      filter.campaignId = campaignId;
    }

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    /* ======================================================
       4️⃣ FETCH REPORTS
    ====================================================== */

    const reports = await EmployeeReport.find(filter)
      .populate("employeeId", "name email phone employeeId")
      .populate("campaignId", "name type client")
      .populate("retailerId", "name contactNo shopDetails")
      .populate("visitScheduleId", "visitDate status visitType")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      message: "Client reports fetched successfully",
      totalReports: reports.length,
      reports
    });

  } catch (err) {
    console.error("Client report fetch error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

/* ===========================
   GET ALL CAMPAIGNS FOR CLIENT
=========================== */
export const getClientCampaigns = async (req, res) => {
  try {
    // ✅ FIXED: Access req.user.role and req.user.id
    const { role, id: userId } = req.user;
    console.log("📊 Campaigns - User ID:", userId, "Role:", role);
    
    if (!["client_admin", "client_user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    let organizationName;
    
    // Admin login → get organizationName
    if (role === "client_admin") {
      const admin = await ClientAdmin.findById(userId);
      if (!admin) return res.status(404).json({ message: "Client Admin not found" });
      organizationName = admin.organizationName;
      console.log("✅ Admin org:", organizationName);
    }
    
    // Client user login → inherit organizationName
    if (role === "client_user") {
      const user = await ClientUser.findById(userId).populate("parentClientAdmin");
      if (!user || !user.parentClientAdmin)
        return res.status(404).json({ message: "Parent Client Admin not found" });
      
      organizationName = user.parentClientAdmin.organizationName;
      console.log("✅ User org:", organizationName);
    }
    
    if (!organizationName) {
      return res.status(404).json({ message: "Organization name not found" });
    }
    
    // Fetch campaigns with populated retailers and employees
    const campaigns = await Campaign.find({ client: organizationName })
      .select(
        "name type regions states isActive assignedRetailers assignedEmployees assignedEmployeeRetailers campaignStartDate campaignEndDate createdAt"
      )
      .populate({
        path: "assignedRetailers.retailerId",
        select: "name contactNo email shopDetails.shopName shopDetails.shopAddress shopDetails.businessType retailerCode uniqueId"
      })
      .populate({
        path: "assignedEmployees.employeeId",
        select: "name email phone position employeeId isActive"
      })
      .populate({
        path: "assignedEmployeeRetailers.employeeId",
        select: "name email phone employeeId"
      })
      .populate({
        path: "assignedEmployeeRetailers.retailerId",
        select: "name contactNo shopDetails.shopName retailerCode"
      })
      .sort({ createdAt: -1 })
      .lean();
    
    console.log("📊 Found campaigns:", campaigns.length);
    
    // Enrich campaigns with detailed information
    const enrichedCampaigns = campaigns.map((campaign) => {
      // ===== RETAILER STATISTICS =====
      const totalOutletsAssigned = campaign.assignedRetailers?.length || 0;
      
      const totalOutletsAccepted = campaign.assignedRetailers?.filter(
        (r) => r.status === "accepted"
      ).length || 0;
      
      const totalOutletsPending = campaign.assignedRetailers?.filter(
        (r) => r.status === "pending"
      ).length || 0;
      
      const totalOutletsRejected = campaign.assignedRetailers?.filter(
        (r) => r.status === "rejected"
      ).length || 0;
      
      // ===== EMPLOYEE STATISTICS =====
      const totalEmployeesAssigned = campaign.assignedEmployees?.length || 0;
      
      const totalEmployeesAccepted = campaign.assignedEmployees?.filter(
        (e) => e.status === "accepted"
      ).length || 0;
      
      const totalEmployeesPending = campaign.assignedEmployees?.filter(
        (e) => e.status === "pending"
      ).length || 0;
      
      // ===== DETAILED RETAILER LIST =====
      const retailers = campaign.assignedRetailers?.map(r => ({
        retailerId: r.retailerId?._id,
        retailerName: r.retailerId?.name,
        retailerCode: r.retailerId?.retailerCode,
        uniqueId: r.retailerId?.uniqueId,
        contactNo: r.retailerId?.contactNo,
        email: r.retailerId?.email,
        shopName: r.retailerId?.shopDetails?.shopName,
        businessType: r.retailerId?.shopDetails?.businessType,
        city: r.retailerId?.shopDetails?.shopAddress?.city,
        state: r.retailerId?.shopDetails?.shopAddress?.state,
        pincode: r.retailerId?.shopDetails?.shopAddress?.pincode,
        status: r.status,
        assignedAt: r.assignedAt,
        startDate: r.startDate,
        endDate: r.endDate
      })) || [];
      
      // ===== DETAILED EMPLOYEE LIST =====
      const employees = campaign.assignedEmployees?.map(e => ({
        employeeId: e.employeeId?._id,
        employeeName: e.employeeId?.name,
        employeeCode: e.employeeId?.employeeId,
        email: e.employeeId?.email,
        phone: e.employeeId?.phone,
        position: e.employeeId?.position,
        isActive: e.employeeId?.isActive,
        status: e.status,
        assignedAt: e.assignedAt,
        startDate: e.startDate,
        endDate: e.endDate
      })) || [];
      
      // ===== EMPLOYEE-RETAILER MAPPING =====
      const employeeRetailerMapping = campaign.assignedEmployeeRetailers?.map(mapping => ({
        employeeId: mapping.employeeId?._id,
        employeeName: mapping.employeeId?.name,
        employeeCode: mapping.employeeId?.employeeId,
        employeePhone: mapping.employeeId?.phone,
        
        retailerId: mapping.retailerId?._id,
        retailerName: mapping.retailerId?.name,
        retailerCode: mapping.retailerId?.retailerCode,
        shopName: mapping.retailerId?.shopDetails?.shopName,
        retailerContact: mapping.retailerId?.contactNo,
        
        assignedAt: mapping.assignedAt
      })) || [];
      
      // ===== GROUP RETAILERS BY EMPLOYEE =====
      const employeeWiseRetailers = {};
      employeeRetailerMapping.forEach(mapping => {
        const empId = mapping.employeeId;
        if (!employeeWiseRetailers[empId]) {
          employeeWiseRetailers[empId] = {
            employeeId: mapping.employeeId,
            employeeName: mapping.employeeName,
            employeeCode: mapping.employeeCode,
            retailers: []
          };
        }
        employeeWiseRetailers[empId].retailers.push({
          retailerId: mapping.retailerId,
          retailerName: mapping.retailerName,
          retailerCode: mapping.retailerCode,
          shopName: mapping.shopName,
          assignedAt: mapping.assignedAt
        });
      });
      
      // ===== GROUP EMPLOYEES BY RETAILER =====
      const retailerWiseEmployees = {};
      employeeRetailerMapping.forEach(mapping => {
        const retId = mapping.retailerId;
        if (!retailerWiseEmployees[retId]) {
          retailerWiseEmployees[retId] = {
            retailerId: mapping.retailerId,
            retailerName: mapping.retailerName,
            retailerCode: mapping.retailerCode,
            shopName: mapping.shopName,
            employees: []
          };
        }
        retailerWiseEmployees[retId].employees.push({
          employeeId: mapping.employeeId,
          employeeName: mapping.employeeName,
          employeeCode: mapping.employeeCode,
          assignedAt: mapping.assignedAt
        });
      });
      
      return {
        ...campaign,
        
        // Statistics
        totalOutletsAssigned,
        totalOutletsAccepted,
        totalOutletsPending,
        totalOutletsRejected,
        
        totalEmployeesAssigned,
        totalEmployeesAccepted,
        totalEmployeesPending,
        
        // Detailed Lists
        retailers,
        employees,
        
        // Mappings
        employeeRetailerMapping,
        employeeWiseRetailers: Object.values(employeeWiseRetailers),
        retailerWiseEmployees: Object.values(retailerWiseEmployees),
        
        // Total Mappings
        totalEmployeeRetailerMappings: employeeRetailerMapping.length
      };
    });
    
    console.log("✅ Sample enriched campaign:", enrichedCampaigns[0]);
    
    return res.status(200).json({
      message: "Client campaigns fetched successfully",
      totalCampaigns: enrichedCampaigns.length,
      campaigns: enrichedCampaigns,
    });
  } catch (err) {
    console.error("❌ Client campaign fetch error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
/* ============================================================
   GET CLIENT CAMPAIGN PAYMENTS
============================================================ */
export const getClientCampaignPayments = async (req, res) => {
  try {
    // ✅ FIXED: Access req.user.role and req.user.id
    const { role, id: userId } = req.user;

    console.log("💰 Payments - User ID:", userId, "Role:", role);

    if (!["client_admin", "client_user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    /* ----------------------------------------------------------
       1️⃣ Get Client Organization Name
    ---------------------------------------------------------- */
    let organizationName;

    if (role === "client_admin") {
      const admin = await ClientAdmin.findById(userId);
      if (!admin) return res.status(404).json({ message: "Client Admin not found" });

      organizationName = admin.organizationName;
      console.log("✅ Admin org:", organizationName);
    }

    if (role === "client_user") {
      const user = await ClientUser.findById(userId).populate("parentClientAdmin");

      if (!user || !user.parentClientAdmin) {
        return res.status(404).json({ message: "Parent Client Admin not found" });
      }

      organizationName = user.parentClientAdmin.organizationName;
      console.log("✅ User org:", organizationName);
    }

    /* ----------------------------------------------------------
       2️⃣ Fetch ALL Campaigns Under This Organization
    ---------------------------------------------------------- */
    const campaigns = await Campaign.find({ client: organizationName }).lean();

    if (!campaigns.length) {
      return res.status(200).json({
        message: "No campaigns found",
        totalPayments: 0,
        payments: []
      });
    }

    const campaignIds = campaigns.map((c) => c._id);

    /* ----------------------------------------------------------
       3️⃣ Fetch ALL Payments
    ---------------------------------------------------------- */
    const payments = await Payment.find({
      campaign: { $in: campaignIds }
    })
      .populate("retailer", "name contactNo shopDetails")
      .populate("campaign", "name type states")
      .sort({ createdAt: -1 })
      .lean();

    console.log("💰 Found payments:", payments.length);

    /* ----------------------------------------------------------
       4️⃣ Prepare Counts
    ---------------------------------------------------------- */
    const outletCountByCampaign = {};
    const acceptedOutletsByCampaign = {};
    const employeeCountByCampaign = {};

    campaigns.forEach((c) => {
      outletCountByCampaign[c._id] = c.assignedRetailers?.length || 0;

      acceptedOutletsByCampaign[c._id] =
        c.assignedRetailers?.filter((r) => r.status === "accepted").length || 0;

      employeeCountByCampaign[c._id] = c.assignedEmployees?.length || 0;
    });

    /* ----------------------------------------------------------
       5️⃣ Format Final Output
    ---------------------------------------------------------- */
    const formatted = payments.map((p) => ({
      paymentId: p._id,

      /* Campaign Info */
      campaignId: p.campaign?._id,
      campaignName: p.campaign?.name,
      campaignType: p.campaign?.type,

      /* Retailer Info */
      retailerId: p.retailer?._id,
      retailerName: p.retailer?.name,
      retailerShopName: p.retailer?.shopDetails?.shopName || "",
      retailerContact: p.retailer?.contactNo,
      retailerCity: p.retailer?.shopDetails?.shopAddress?.city,
      retailerState: p.retailer?.shopDetails?.shopAddress?.state,

      /* Campaign Counts */
      totalOutletsAssigned: outletCountByCampaign[p.campaign?._id] || 0,
      totalOutletsAccepted: acceptedOutletsByCampaign[p.campaign?._id] || 0,
      totalEmployeesAssigned: employeeCountByCampaign[p.campaign?._id] || 0,

      /* Payment Info */
      totalAmount: p.totalAmount,
      amountPaid: p.amountPaid,
      remainingAmount: p.remainingAmount,
      paymentStatus: p.paymentStatus,
      utrNumbers: p.utrNumbers,

      lastUpdated: p.updatedAt,
    }));

    /* ----------------------------------------------------------
       6️⃣ Send Response
    ---------------------------------------------------------- */
    return res.status(200).json({
      message: "Client payments fetched successfully",
      totalPayments: formatted.length,
      payments: formatted
    });

  } catch (err) {
    console.error("Client payment fetch error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

/* ============================================================
   GET UNIQUE OUTLETS WHO SUBMITTED REPORTS
============================================================ */
export const getClientReportedOutlets = async (req, res) => {
  try {
    // ✅ FIXED: Access req.user.role and req.user.id
    const { role, id: userId } = req.user;
    const { campaignId } = req.query;

    console.log("🏪 Reported Outlets - User ID:", userId, "Role:", role);

    if (!["client_admin", "client_user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    /* ---------------------------------------------------------
       1️⃣ GET CLIENT ORGANIZATION
    --------------------------------------------------------- */
    let organizationName;

    if (role === "client_admin") {
      const admin = await ClientAdmin.findById(userId);
      if (!admin) return res.status(404).json({ message: "Client Admin not found" });
      organizationName = admin.organizationName;
      console.log("✅ Admin org:", organizationName);
    }

    if (role === "client_user") {
      const user = await ClientUser.findById(userId).populate("parentClientAdmin");
      if (!user || !user.parentClientAdmin)
        return res.status(404).json({ message: "Parent Client Admin not found" });

      organizationName = user.parentClientAdmin.organizationName;
      console.log("✅ User org:", organizationName);
    }

    /* ---------------------------------------------------------
       2️⃣ FIND ALL CAMPAIGNS OF THIS ORG
    --------------------------------------------------------- */
    let campaigns = await Campaign.find({ client: organizationName }).select("_id");

    let campaignIds = campaigns.map(c => c._id.toString());

    // If campaignId is passed → restrict to that one
    if (campaignId && campaignIds.includes(campaignId)) {
      campaignIds = [campaignId];
    }

    if (!campaignIds.length) {
      return res.status(200).json({
        message: "No campaigns found",
        totalOutlets: 0,
        outlets: []
      });
    }

    console.log("🏪 Checking outlets for campaigns:", campaignIds.length);

    /* ---------------------------------------------------------
       3️⃣ FETCH UNIQUE RETAILERS WHO HAVE REPORTS
    --------------------------------------------------------- */
    const outlets = await EmployeeReport.aggregate([
      {
        $match: {
          campaignId: { $in: campaignIds.map(id => new mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $group: {
          _id: "$retailerId",
          totalReports: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "retailers",
          localField: "_id",
          foreignField: "_id",
          as: "retailer"
        }
      },
      { $unwind: "$retailer" },
      {
        $project: {
          _id: 0,
          retailerId: "$retailer._id",
          name: "$retailer.name",
          contactNo: "$retailer.contactNo",
          city: "$retailer.shopDetails.shopAddress.city",
          state: "$retailer.shopDetails.shopAddress.state",
          totalReports: 1
        }
      }
    ]);

    console.log("✅ Found outlets:", outlets.length);

    return res.status(200).json({
      message: "Unique reported outlets fetched successfully",
      totalOutlets: outlets.length,
      outlets
    });

  } catch (err) {
    console.error("Reported outlets fetch error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};
