import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ClientAdmin, ClientUser, Campaign, Payment ,EmployeeReport } from "../models/user.js";

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

    // Check if user is client
    if (!["client_admin", "client_user"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only client admins or users can set payments" });
    }

    // Check retailer is assigned to campaign
    const retailerAssigned = campaign.assignedRetailers.some(r => r.retailerId.toString() === retailerId);
    if (!retailerAssigned) {
      return res.status(400).json({ message: "Retailer not assigned to this campaign" });
    }

    // Create payment
    const payment = await Payment.create({
      retailer: retailerId,
      campaign: campaignId,
      totalAmount,
      amountPaid: 0,
      remainingAmount: totalAmount,
      paymentStatus: "Pending",
      lastUpdatedBy: req.user._id,
      notes,
    });

    res.status(201).json({ message: "Payment plan set successfully", payment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const getAllEmployeeReportsForClient = async (req, res) => {
  try {
    const { role, id: userId } = req.user;

    if (!["client_admin", "client_user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    /* ======================================================
       1️ GET ORGANIZATION NAME
    ====================================================== */

    let orgName;

    if (role === "client_admin") {
      const admin = await ClientAdmin.findById(userId);
      if (!admin) return res.status(404).json({ message: "Client Admin not found" });
      orgName = admin.organizationName;
    }

    if (role === "client_user") {
      const user = await ClientUser.findById(userId).populate("parentClientAdmin");
      if (!user) return res.status(404).json({ message: "Client User not found" });
      orgName = user.parentClientAdmin?.organizationName;
      if (!orgName) return res.status(404).json({ message: "Organization not found" });
    }

    /* ======================================================
       2️ GET ALL CAMPAIGN IDs FOR THIS ORGANIZATION
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
       3️ APPLY OPTIONAL FILTERS
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
       4️FETCH REPORTS
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
    const { role, id: userId } = req.user;

    if (!["client_admin", "client_user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    let organizationName;

    // Admin login → get organizationName
    if (role === "client_admin") {
      const admin = await ClientAdmin.findById(userId);
      if (!admin) return res.status(404).json({ message: "Client Admin not found" });
      organizationName = admin.organizationName;
    }

    // Client user login → inherit organizationName
    if (role === "client_user") {
      const user = await ClientUser.findById(userId).populate("parentClientAdmin");
      if (!user || !user.parentClientAdmin)
        return res.status(404).json({ message: "Parent Client Admin not found" });

      organizationName = user.parentClientAdmin.organizationName;
    }

    if (!organizationName) {
      return res.status(404).json({ message: "Organization name not found" });
    }

    // Fetch campaigns belonging to client (organization)
    const campaigns = await Campaign.find({ client: organizationName })
      .select(
        "name type regions states isActive assignedRetailers campaignStartDate campaignEndDate createdAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    // Add outlet count
    const enrichedCampaigns = campaigns.map((campaign) => {
      const totalOutletsAssigned = campaign.assignedRetailers?.length || 0;

      const totalOutletsAccepted = campaign.assignedRetailers?.filter(
        (r) => r.status === "accepted"
      ).length || 0;

      return {
        ...campaign,
        totalOutletsAssigned,
        totalOutletsAccepted,
      };
    });

    return res.status(200).json({
      message: "Client campaigns fetched successfully",
      totalCampaigns: enrichedCampaigns.length,
      campaigns: enrichedCampaigns,
    });
  } catch (err) {
    console.error("Client campaign fetch error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
/* ============================================================
   NEW: GET CLIENT CAMPAIGN PAYMENTS (FULL REWRITE)
============================================================ */
export const getClientCampaignPayments = async (req, res) => {
  try {
    const { role, id: userId } = req.user;

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
    }

    if (role === "client_user") {
      const user = await ClientUser.findById(userId).populate("parentClientAdmin");
      if (!user || !user.parentClientAdmin)
        return res.status(404).json({ message: "Parent Client Admin not found" });

      organizationName = user.parentClientAdmin.organizationName;
    }

    /* ----------------------------------------------------------
       2️⃣ Fetch ALL campaigns under this organization
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
       3️⃣ Fetch ALL payments for these campaigns (NO FILTERS)
    ---------------------------------------------------------- */
    const payments = await Payment.find({
      campaign: { $in: campaignIds }
    })
      .populate("retailer", "name contactNo shopDetails")
      .populate("campaign", "name type states")
      .sort({ createdAt: -1 })
      .lean();

    /* ----------------------------------------------------------
       4️⃣ Prepare extra counts (optional but kept)
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
       5️⃣ Format final output
    ---------------------------------------------------------- */
    const formatted = payments.map((p) => ({
      paymentId: p._id,

      campaignId: p.campaign?._id,
      campaignName: p.campaign?.name,
      campaignType: p.campaign?.type,

      retailerId: p.retailer?._id,
      retailerName: p.retailer?.name,
      retailerContact: p.retailer?.contactNo,
      retailerCity: p.retailer?.shopDetails?.shopAddress?.city,
      retailerState: p.retailer?.shopDetails?.shopAddress?.state,

      totalOutletsAssigned: outletCountByCampaign[p.campaign?._id] || 0,
      totalOutletsAccepted: acceptedOutletsByCampaign[p.campaign?._id] || 0,
      totalEmployeesAssigned: employeeCountByCampaign[p.campaign?._id] || 0,

      totalAmount: p.totalAmount,
      amountPaid: p.amountPaid,
      remainingAmount: p.remainingAmount,
      paymentStatus: p.paymentStatus,
      utrNumbers: p.utrNumbers,

      lastUpdated: p.updatedAt,
    }));

    /* ----------------------------------------------------------
       6️⃣ Return response
    ---------------------------------------------------------- */
    return res.status(200).json({
      message: "Client payments fetched successfully",
      totalPayments: formatted.length,
      payments: formatted,
    });

  } catch (err) {
    console.error("Client payment fetch error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/* ============================================================
   GET UNIQUE OUTLETS WHO SUBMITTED REPORTS
   (For a specific client's campaigns OR a single campaign)
============================================================ */
export const getClientReportedOutlets = async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const { campaignId } = req.query; // optional filtering

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
    }

    if (role === "client_user") {
      const user = await ClientUser.findById(userId).populate("parentClientAdmin");
      if (!user || !user.parentClientAdmin)
        return res.status(404).json({ message: "Parent Client Admin not found" });

      organizationName = user.parentClientAdmin.organizationName;
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
