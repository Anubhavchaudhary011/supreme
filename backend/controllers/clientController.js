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

