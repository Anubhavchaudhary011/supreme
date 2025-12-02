import {
  Admin,
  VisitSchedule,
  ClientAdmin,
  ClientUser,
  Retailer,
  Employee,
  Campaign,
  Payment ,
  EmployeeReport

} from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import XLSX from "xlsx";
import { CareerApplication,Job, JobApplication } from "../models/user.js";
import mongoose from "mongoose";
export const getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .populate("createdBy", "name email")
      .populate("assignedEmployees.employeeId", "name email")
      .populate("assignedRetailers.retailerId", "name contactNo");

    res.status(200).json({ campaigns });
  } catch (error) {
    console.error("Get campaigns error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   ADMIN LOGIN
====================================================== */
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: "admin" },
      process.env.JWT_SECRET || "supremeSecretKey",
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Admin login successful",
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   ADD NEW ADMIN
====================================================== */
export const addAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    if (!req.user || req.user.role !== "admin")
      return res.status(403).json({ message: "Only existing admins can add new admins" });

    const existing =
      (await Admin.findOne({ email })) ||
      (await ClientAdmin.findOne({ email })) ||
      (await ClientUser.findOne({ email })) ||
      (await Retailer.findOne({ email }));

    if (existing)
      return res.status(409).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ name, email, password: hashedPassword });

    await newAdmin.save();
    res.status(201).json({ message: "New admin created successfully", admin: newAdmin });
  } catch (error) {
    console.error("Add admin error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   ADD CLIENT ADMIN
====================================================== */
export const addClientAdmin = async (req, res) => {
  try {
    const { 
      name,
      email,
      contactNo,
      organizationName,
      role,
      regions,
      states
    } = req.body;

    // Only admin can create client admins
    if (!req.user || req.user.role !== "admin")
      return res.status(403).json({ message: "Only admins can add client admins" });

    // Required fields
    if (!name || !email || !organizationName || !contactNo || !role)
      return res.status(400).json({ message: "Missing required fields" });

    // States validation
    if (!states || !Array.isArray(states) || states.length === 0)
      return res.status(400).json({ message: "At least one state must be provided" });

    // Regions validation
    if (!regions || !Array.isArray(regions) || regions.length === 0)
      return res.status(400).json({ message: "At least one region must be provided" });

    // Check existing
    const existing = await ClientAdmin.findOne({ email });
    if (existing)
      return res.status(409).json({ message: "Client admin already exists" });

    // 🔥 DEFAULT PASSWORD = contactNo
    const hashedPassword = await bcrypt.hash(contactNo.toString(), 10);

    const newClientAdmin = new ClientAdmin({
      name,
      email,
      contactNo,
      organizationName,

      // 🔥 frontend aligned
      role,
      regions,
      states,

      password: hashedPassword,

      registrationDetails: {
        username: email,
        password: hashedPassword, // stored hashed
      },
    });

    await newClientAdmin.save();

    res.status(201).json({
      message: "Client admin created successfully",
      clientAdmin: newClientAdmin,
    });

  } catch (error) {
    console.error("Add client admin error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//
export const registerRetailer = async (req, res) => {
  try {
    const body = req.body;
    const files = req.files || {};

    const {
      name,
      email,
      contactNo,
      shopName,
      businessType,
      PANCard,
      shopAddress,
      shopCity,
      shopState,
      shopPincode,
      bankName,
      accountNumber,
      IFSC,
      branchName
    } = body;

    /* ----------------------------------------------------
       STEP 1: Validate required fields
    ---------------------------------------------------- */
    if (
      !name ||
      !email ||
      !contactNo ||
      !shopName ||
      !businessType ||
      !PANCard ||
      !shopAddress ||
      !shopCity ||
      !shopState ||
      !shopPincode ||
      !bankName ||
      !accountNumber ||
      !IFSC ||
      !branchName
    ) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    /* ----------------------------------------------------
       🔍 STEP 2: Check duplication
    ---------------------------------------------------- */
    const existingRetailer = await Retailer.findOne({
      $or: [{ contactNo }, { email }],
    });

    if (existingRetailer) {
      return res.status(400).json({
        message: "Phone or email already registered",
      });
    }

    /* ----------------------------------------------------
       🔍 STEP 3: Prepare shopDetails
    ---------------------------------------------------- */
    const shopDetails = {
      shopName,
      businessType,
      PANCard,
      ownershipType: body.ownershipType || "",
      GSTNo: body.GSTNo || "",
      outletPhoto: files.outletPhoto
        ? {
            data: files.outletPhoto[0].buffer,
            contentType: files.outletPhoto[0].mimetype,
          }
        : undefined,

      shopAddress: {
        address: shopAddress,
        address2: body.shopAddress2 || "",
        city: shopCity,
        state: shopState,
        pincode: shopPincode,
      },
    };

    /* ----------------------------------------------------
       🔍 STEP 4: Prepare bankDetails
    ---------------------------------------------------- */
    const bankDetails = {
      bankName,
      accountNumber,
      IFSC,
      branchName,
    };

    /* ----------------------------------------------------
       🔍 STEP 5: Create Retailer (uniqueId & retailerCode auto-generated by schema)
    ---------------------------------------------------- */
    const retailer = new Retailer({
      name,
      email,
      contactNo,
      password: contactNo, // required by schema

      gender: body.gender,
      govtIdType: body.govtIdType,
      govtIdNumber: body.govtIdNumber,

      govtIdPhoto: files.govtIdPhoto
        ? {
            data: files.govtIdPhoto[0].buffer,
            contentType: files.govtIdPhoto[0].mimetype,
          }
        : undefined,

      personPhoto: files.personPhoto
        ? {
            data: files.personPhoto[0].buffer,
            contentType: files.personPhoto[0].mimetype,
          }
        : undefined,

      registrationForm: files.registrationForm
        ? {
            data: files.registrationForm[0].buffer,
            contentType: files.registrationForm[0].mimetype,
          }
        : undefined,

      shopDetails,
      bankDetails,

      createdBy: body.createdBy || "AdminAdded",
      phoneVerified: true,
      partOfIndia: body.partOfIndia || "N", // used in uniqueId generation
    });

    /* ----------------------------------------------------
       🔥 STEP 6: Save Retailer (this triggers uniqueId & retailerCode creation)
    ---------------------------------------------------- */
    await retailer.save();

    res.status(201).json({
      message: "Retailer registered successfully",
      retailer,
    });

  } catch (error) {
    console.error("Retailer registration error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
// Utility to generate unique IDs (since insertMany doesn't run pre-save hooks)
function generateUniqueId() {
  const letters = Array.from({ length: 4 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");
  const numbers = Math.floor(1000 + Math.random() * 9000);
  return `${letters}${numbers}`;
}

export const bulkRegisterRetailers = async (req, res) => {
  try {
    // Only admins can bulk upload retailers
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can upload retailers" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Excel/CSV file is required" });
    }

    // Read Excel
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const retailersToInsert = [];

    for (const row of rows) {
      const {
        name,
        email,
        contactNo,
        shopName,
        businessType,
        PANCard,
        shopAddress,
        shopCity,
        shopState,
        shopPincode,
        bankName,
        accountNumber,
        IFSC,
        branchName
      } = row;

      // Skip missing required fields
      if (
        !name ||
        !email ||
        !contactNo ||
        !shopName ||
        !businessType ||
        !PANCard ||
        !shopAddress ||
        !shopCity ||
        !shopState ||
        !shopPincode ||
        !bankName ||
        !accountNumber ||
        !IFSC ||
        !branchName
      ) {
        continue;
      }

      // Skip duplicates
      const exists = await Retailer.findOne({
        $or: [{ email }, { contactNo }]
      });
      if (exists) continue;

      const hashedPassword = await bcrypt.hash(String(contactNo), 10);

      // Build retailer
      retailersToInsert.push({
        name,
        email,
        contactNo,
        password: hashedPassword,

        // IMPORTANT — Prevents E11000 error
        uniqueId: generateUniqueId(),
        retailerCode: generateUniqueId(),

        gender: row.gender || "",
        govtIdType: row.govtIdType || "",
        govtIdNumber: row.govtIdNumber || "",

        shopDetails: {
          shopName,
          businessType,
          PANCard,
          ownershipType: row.ownershipType || "",
          GSTNo: row.GSTNo || "",
          shopAddress: {
            address: shopAddress,
            address2: row.shopAddress2 || "",
            city: shopCity,
            state: shopState,
            pincode: shopPincode,
          }
        },

        bankDetails: {
          bankName,
          accountNumber,
          IFSC,
          branchName,
        },

        createdBy: "AdminAdded", // enum safe value
        phoneVerified: true,
        partOfIndia: row.partOfIndia || "N"
      });
    }

    if (retailersToInsert.length === 0) {
      return res.status(400).json({ message: "No valid retailers found to upload" });
    }

    // Insert many
    const insertedRetailers = await Retailer.insertMany(retailersToInsert);

    res.status(201).json({
      message: `${insertedRetailers.length} retailers added successfully`,
      retailers: insertedRetailers
    });

  } catch (error) {
    console.error("Bulk retailer upload error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ======================================================
   ADD CLIENT USER
====================================================== */
export const addClientUser = async (req, res) => {
  try {
    const {
      name,
      email,
      contactNo,
      roleProfile,
      parentClientAdminId,
      password,
    } = req.body;

    if (!req.user || req.user.role !== "admin")
      return res.status(403).json({ message: "Only admins can add client users" });

    if (!name || !email || !parentClientAdminId || !password)
      return res.status(400).json({ message: "Missing required fields" });

    const existing = await ClientUser.findOne({ email });
    if (existing)
      return res.status(409).json({ message: "Client user already exists" });

    const hashedPass = await bcrypt.hash(password, 10);

    const newClientUser = new ClientUser({
      name,
      email,
      contactNo,
      roleProfile,
      parentClientAdmin: parentClientAdminId,
      password: hashedPass,
    });

    await newClientUser.save();
    res.status(201).json({
      message: "Client user created successfully",
      clientUser: newClientUser,
    });
  } catch (error) {
    console.error("Add client user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   CLIENT ADMIN LOGIN
====================================================== */
export const loginClientAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const clientAdmin = await ClientAdmin.findOne({ email });
    if (!clientAdmin)
      return res.status(404).json({ message: "Client admin not found" });

    const isMatch = await bcrypt.compare(password, clientAdmin.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: clientAdmin._id, email: clientAdmin.email, role: "client-admin" },
      process.env.JWT_SECRET || "supremeSecretKey",
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Client admin login successful",
      token,
      clientAdmin: {
        id: clientAdmin._id,
        name: clientAdmin.name,
        email: clientAdmin.email,
        organizationName: clientAdmin.organizationName,
      },
    });
  } catch (error) {
    console.error("Client admin login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   PROTECT MIDDLEWARE
====================================================== */
export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "Not authorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supremeSecretKey");
    req.user = decoded;
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

/* ======================================================
   CAMPAIGN MANAGEMENT
====================================================== */
export const addCampaign = async (req, res) => {
  try {
    const {
      name,
      client,                 // organizationName string
      type,
      regions,                // ARRAY
      states,                 // ARRAY
      campaignStartDate,
      campaignEndDate
    } = req.body;

    // Admin auth check
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can create campaigns" });
    }

    // Required fields validation
    if (!name || !client || !type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate regions
    if (!regions || !Array.isArray(regions) || regions.length === 0) {
      return res.status(400).json({ message: "At least one region is required" });
    }

    // Validate states
    if (!states || !Array.isArray(states) || states.length === 0) {
      return res.status(400).json({ message: "At least one state is required" });
    }

    // Validate organization exists (ONLY VALIDATION)
    const clientOrg = await ClientAdmin.findOne({ organizationName: client });

    if (!clientOrg) {
      return res.status(404).json({
        message: `Client organization '${client}' does not exist.`
      });
    }

    // Date validation
    if (!campaignStartDate || !campaignEndDate) {
      return res.status(400).json({ message: "Campaign start and end date are required" });
    }

    const start = new Date(campaignStartDate);
    const end = new Date(campaignEndDate);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    if (start > end) {
      return res.status(400).json({ message: "Start date cannot be after end date" });
    }

    // Create campaign
    const campaign = new Campaign({
      name,
      client,          // store ONLY the org name string
      type,
      regions,         // ARRAY
      states,          // ARRAY
      createdBy: req.user.id,
      campaignStartDate: start,
      campaignEndDate: end
    });

    await campaign.save();

    res.status(201).json({
      message: "Campaign created successfully",
      campaign
    });

  } catch (error) {
    console.error("Add campaign error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


/* ======================================================
   UPDATE CAMPAIGN STATUS (Activate / Deactivate)
   PATCH /admin/campaigns/:id/status
====================================================== */
export const updateCampaignStatus = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can update campaign status" });
    }

    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ message: "isActive field is required (true/false)" });
    }

    //  Find campaign
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    //  Update status
    campaign.isActive = isActive;
    await campaign.save();

    res.status(200).json({
      message: `Campaign ${isActive ? "activated" : "deactivated"} successfully`,
      campaign,
    });

  } catch (error) {
    console.error("Update campaign status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
/* ======================================================
   GET SINGLE CAMPAIGN BY ID
   GET /api/admin/campaigns/:id
====================================================== */
export const getCampaignById = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can view campaign details" });
    }

    const { id } = req.params;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    res.status(200).json({ campaign });
  } catch (error) {
    console.error("Get campaign by ID error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getEmployeeCampaigns = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const campaigns = await Campaign.find({
      "assignedEmployees.employeeId": employee._id,
    })
      .populate("createdBy", "name email")
      .populate("assignedEmployees.employeeId", "name email")
      .populate("assignedRetailers.retailerId", "name contactNo")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Campaigns fetched successfully",
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
      },
      campaigns,
    });
  } catch (error) {
    console.error("Get employee campaigns error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || req.user.role !== "admin")
      return res.status(403).json({ message: "Only admins can delete campaigns" });

    const campaign = await Campaign.findByIdAndDelete(id);
    if (!campaign)
      return res.status(404).json({ message: "Campaign not found" });

    res.status(200).json({ message: "Campaign deleted successfully" });
  } catch (error) {
    console.error("Delete campaign error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
/* ======================================================
   EMPLOYEE MANAGEMENT
====================================================== */
export const addEmployee = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      contactNo, 
      employeeType, 
      position 
    } = req.body;

    // Check if user is admin
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can add employees" });
    }

    // Required fields
    if (!name || !email || !contactNo || !employeeType) {
      return res.status(400).json({
        message: "Name, email, phone & employee type are required",
      });
    }

    // Validate employee type
    if (!["Permanent", "Contractual"].includes(employeeType)) {
      return res.status(400).json({ message: "Invalid employee type" });
    }

    // Check existing employee
    const existing = await Employee.findOne({
      $or: [{ email }, { phone: contactNo }],
    });

    if (existing) {
      return res.status(409).json({ message: "Employee already exists" });
    }

    // Create employee
    const newEmployee = new Employee({
      name,
      email,
      phone: contactNo,
      password: contactNo,     // default password
      employeeType,
      position,
      createdByAdmin: req.user.id,
      isActive: true           // <-- automatically active
    });

    await newEmployee.save();

    res.status(201).json({
      message: "Employee added successfully",
      employee: {
        id: newEmployee._id,
        name: newEmployee.name,
        email: newEmployee.email,
        phone: newEmployee.phone,
        employeeType: newEmployee.employeeType,
        position: newEmployee.position,
        isActive: newEmployee.isActive,
      },
    });

  } catch (error) {
    console.error("Add employee error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
export const changeEmployeeStatus = async (req, res) => {
  try {
    const { employeeId, isActive } = req.body;

    // Validate admin
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can update employee status" });
    }

    // Validate input
    if (!employeeId || typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "employeeId and isActive (true/false) are required",
      });
    }

    // Find employee by custom employeeId
    const employee = await Employee.findOne({ employeeId });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Update the status
    employee.isActive = isActive;
    await employee.save();

    res.status(200).json({
      message: `Employee has been ${isActive ? "activated" : "deactivated"} successfully`,
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        isActive: employee.isActive,
      },
    });

  } catch (error) {
    console.error("Employee status update error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ======================================================
   BULK ADD EMPLOYEES FROM EXCEL
====================================================== */
export const bulkAddEmployees = async (req, res) => {
  try {
    // Only admin can bulk add
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can add employees" });
    }

    // File check
    if (!req.file) {
      return res.status(400).json({ message: "Excel/CSV file is required" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const employeesToInsert = [];

    for (let row of data) {
      const { 
        name, 
        email, 
        contactNo, 
        employeeType, 
        position,
        gender 
      } = row;

      // Required fields
      if (!name || !email || !contactNo || !employeeType) continue;

      // Validate employee type
      if (!["Permanent", "Contractual"].includes(employeeType)) continue;

      // Check duplicates
      const exists = await Employee.findOne({
        $or: [{ email }, { phone: contactNo }]
      });
      if (exists) continue;

      // ⭐ HASH PASSWORD (phone number)
      const hashedPassword = await bcrypt.hash(contactNo.toString(), 10);

      // Create employee object
      employeesToInsert.push({
        name,
        email,
        phone: contactNo,
        password: hashedPassword,   // << HASHED PASSWORD
        employeeType,
        position,
        gender,
        isActive: true,
        createdByAdmin: req.user.id
      });
    }

    if (employeesToInsert.length === 0) {
      return res.status(400).json({ message: "No valid employees to add" });
    }

    // Insert many
    const insertedEmployees = await Employee.insertMany(employeesToInsert);

    res.status(201).json({
      message: `${insertedEmployees.length} employees added successfully`,
      employees: insertedEmployees.map(emp => ({
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        employeeId: emp.employeeId,
        employeeType: emp.employeeType,
        position: emp.position,
        isActive: emp.isActive
      }))
    });

  } catch (error) {
    console.error("Bulk add employees error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/* ======================================================
   ASSIGN CAMPAIGN TO EMPLOYEES & RETAILERS
====================================================== */
export const assignCampaign = async (req, res) => {
  try {
    const { campaignId, employeeIds = [], retailerIds = [] } = req.body;

    // -------------------------------
    // Admin check
    // -------------------------------
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can assign campaigns" });
    }

    if (!campaignId) {
      return res.status(400).json({ message: "Campaign ID is required" });
    }

    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // -------------------------------
    // FIX: Use campaign.states (correct field)
    // -------------------------------
    const allowedStates = Array.isArray(campaign.states)
      ? campaign.states
      : [campaign.states];

    const startDate = campaign.campaignStartDate;
    const endDate = campaign.campaignEndDate;

    // Ensure arrays exist
    campaign.assignedEmployees ||= [];
    campaign.assignedRetailers ||= [];

    /* =========================================================================
       ASSIGN EMPLOYEES
    ========================================================================= */
    for (const empId of employeeIds) {
      if (!empId) continue;

      const employee = await Employee.findById(empId);
      if (!employee) continue;

      const employeeState = employee?.correspondenceAddress?.state;

      const isAllowed =
        allowedStates.includes("All") ||
        (employeeState && allowedStates.includes(employeeState));

      if (!isAllowed) {
        return res.status(400).json({
          message: `❌ Employee '${employee.name}' cannot be assigned because their state '${employeeState}' is not allowed in this campaign.`,
        });
      }

      // Check duplication
      const exists = campaign.assignedEmployees.some(
        (e) => e.employeeId.toString() === empId.toString()
      );

      if (!exists) {
        campaign.assignedEmployees.push({
          employeeId: empId,
          status: "pending",
          assignedAt: new Date(),
          updatedAt: new Date(),
          startDate,
          endDate,
        });
      }

      // Update employee's assigned campaigns list
      await Employee.findByIdAndUpdate(empId, {
        $addToSet: { assignedCampaigns: campaign._id },
      });
    }

    /* =========================================================================
       ASSIGN RETAILERS
    ========================================================================= */
    for (const retId of retailerIds) {
      if (!retId) continue;

      const retailer = await Retailer.findById(retId);
      if (!retailer) continue;

      const retailerState = retailer?.shopDetails?.shopAddress?.state;

      const isAllowed =
        allowedStates.includes("All") ||
        (retailerState && allowedStates.includes(retailerState));

      if (!isAllowed) {
        return res.status(400).json({
          message: `❌ Retailer '${retailer.name}' cannot be assigned because their state '${retailerState}' is not allowed in this campaign.`,
        });
      }

      // Check duplicate assignment
      const exists = campaign.assignedRetailers.some(
        (r) => r.retailerId.toString() === retId.toString()
      );

      if (!exists) {
        campaign.assignedRetailers.push({
          retailerId: retId,
          status: "pending",
          assignedAt: new Date(),
          updatedAt: new Date(),
          startDate,
          endDate,
        });
      }

      // Update retailer's assigned campaigns
      await Retailer.findByIdAndUpdate(retId, {
        $addToSet: { assignedCampaigns: campaign._id },
      });

      // Create default payment record only once
      const existingPayment = await Payment.findOne({
        campaign: campaign._id,
        retailer: retId,
      });

      if (!existingPayment) {
        await Payment.create({
          campaign: campaign._id,
          retailer: retId,
          totalAmount: 0,
          amountPaid: 0,
          paymentStatus: "Pending",
        });
      }
    }

    // Save updated campaign
    await campaign.save();

    res.status(200).json({
      message: "Campaign assigned successfully",
      campaign,
    });
  } catch (error) {
    console.error("Assign campaign error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const updateRetailerDates = async (req, res) => {
  try {
    const { campaignId, retailerId } = req.params;
    const { startDate, endDate } = req.body;

    // admin check
    if (!req.user || req.user.role !== "admin")
      return res.status(403).json({ message: "Only admin can update dates" });

    const campaign = await Campaign.findById(campaignId);
    if (!campaign)
      return res.status(404).json({ message: "Campaign not found" });

    const retailerEntry = campaign.assignedRetailers.find(
      r => r.retailerId.toString() === retailerId.toString()
    );

    if (!retailerEntry)
      return res.status(404).json({ message: "Retailer not assigned to this campaign" });

    // Update only if values are provided
    if (startDate) retailerEntry.startDate = new Date(startDate);
    if (endDate) retailerEntry.endDate = new Date(endDate);
    retailerEntry.updatedAt = new Date();

    await campaign.save();

    res.status(200).json({
      message: "Retailer dates updated successfully",
      retailer: retailerEntry
    });

  } catch (err) {
    console.error("Retailer date update error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const updateEmployeeDates = async (req, res) => {
  try {
    const { campaignId, employeeId } = req.params;
    const { startDate, endDate } = req.body;

    if (!req.user || req.user.role !== "admin")
      return res.status(403).json({ message: "Only admin can update dates" });

    const campaign = await Campaign.findById(campaignId);
    if (!campaign)
      return res.status(404).json({ message: "Campaign not found" });

    const employeeEntry = campaign.assignedEmployees.find(
      e => e.employeeId.toString() === employeeId.toString()
    );

    if (!employeeEntry)
      return res.status(404).json({ message: "Employee not assigned to this campaign" });

    // Update only provided fields
    if (startDate) employeeEntry.startDate = new Date(startDate);
    if (endDate) employeeEntry.endDate = new Date(endDate);
    employeeEntry.updatedAt = new Date();

    await campaign.save();

    res.status(200).json({
      message: "Employee dates updated successfully",
      employee: employeeEntry
    });

  } catch (err) {
    console.error("Employee date update error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


/* ======================================================
   FETCH ALL EMPLOYEES
====================================================== */
export const getAllEmployees = async (req, res) => {
  try {
    // Fetch ALL employees with ALL fields
    const employees = await Employee.find().lean();  // full fields

    res.status(200).json({ employees });
  } catch (err) {
    console.error("Get employees error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   FETCH ALL RETAILERS
====================================================== */
export const getAllRetailers = async (req, res) => {
  try {
    // Fetch ALL retailers with ALL fields
    const retailers = await Retailer.find().lean();  // full fields

    res.status(200).json({ retailers });
  } catch (err) {
    console.error("Get retailers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   ADMIN UPDATES PAYMENT PROGRESS & UTR
====================================================== */
export const updateCampaignPayment = async (req, res) => {
  try {
    const { campaignId, retailerId, amountPaid, utrNumber } = req.body;

    if (!req.user || req.user.role !== "admin")
      return res.status(403).json({ message: "Only admins can update payments" });

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    const assignedRetailer = campaign.assignedRetailers.find(
      (r) => r.retailerId.toString() === retailerId.toString()
    );

    if (!assignedRetailer || assignedRetailer.status !== "accepted")
      return res.status(400).json({
        message: "Retailer has not accepted this campaign yet",
      });

    const payment = await Payment.findOne({ campaign: campaignId, retailer: retailerId });
    if (!payment) return res.status(404).json({ message: "Payment plan not found" });

    // Update amountPaid
    if (amountPaid !== undefined) {
      payment.amountPaid += amountPaid; // add the new payment
    }

    // Track UTR numbers as an array
    if (utrNumber) {
      payment.utrNumbers = payment.utrNumbers || [];
      payment.utrNumbers.push({
        utrNumber,
        amount: amountPaid || 0,
        date: new Date(),
        updatedBy: req.user._id,
      });
    }

    // Update remaining amount
    payment.remainingAmount = payment.totalAmount - payment.amountPaid;
    payment.lastUpdatedByAdmin = req.user._id;

    // Update payment status
    if (payment.amountPaid === 0) {
      payment.paymentStatus = "Pending";
    } else if (payment.amountPaid < payment.totalAmount) {
      payment.paymentStatus = "Partially Paid";
    } else {
      payment.paymentStatus = "Completed";
    }

    await payment.save();

    res.status(200).json({
      message: "Payment updated successfully",
      payment,
    });
  } catch (error) {
    console.error("Error updating campaign payment:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ======================================================
   ADMIN FETCHES ALL PAYMENTS FOR A CAMPAIGN
====================================================== */
export const getCampaignPayments = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const payments = await Payment.find({ campaign: campaignId })
      .populate("retailer", "name email")
      .populate("createdByClient", "name")
      .populate("lastUpdatedByAdmin", "name")
      .sort({ updatedAt: -1 });

    res.status(200).json({ payments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const createAdminReport = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can submit admin reports" });
    }

    const {
      employeeId,
      campaignId,
      retailerId,
      visitScheduleId,
      reportType,
      notes,
      stockType,
      brand,
      product,
      sku,
      productType,
      quantity,
      location,
      frequency        // ⭐ ADDED HERE
    } = req.body;

    if (!employeeId || !campaignId || !retailerId) {
      return res.status(400).json({
        message: "employeeId, campaignId, and retailerId are required"
      });
    }

    const files = req.files || {};

    const images = [];
    if (files.images?.length > 0) {
      files.images.forEach((file) => {
        images.push({
          data: file.buffer,
          contentType: file.mimetype,
          fileName: file.originalname
        });
      });
    }

    const billCopies = [];
    if (files.billCopy?.length > 0) {
      files.billCopy.forEach((file) => {
        billCopies.push({
          data: file.buffer,
          contentType: file.mimetype,
          fileName: file.originalname
        });
      });
    }

    // ----------------------------------------------------
    //  CREATE REPORT
    // ----------------------------------------------------
    const report = await EmployeeReport.create({
      employeeId,
      campaignId,
      retailerId,
      visitScheduleId,

      reportType,
      otherReasonText: notes,
      frequency,        // ⭐ ADDED HERE

      stockType,
      brand,
      product,
      sku,
      productType,
      quantity,

      location: location ? JSON.parse(location) : undefined,

      images,
      billCopies,

      submittedByRole: "Admin",
      submittedByAdmin: req.user.id
    });

    res.status(201).json({
      message: "Admin report submitted successfully",
      report
    });

  } catch (err) {
    console.error("Create admin report error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const updateEmployeeReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await EmployeeReport.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Only admin or the employee who created it
    const isAdmin = req.user.role === "admin";
    const isOwner = req.user.id === report.submittedByEmployee?.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Permission denied" });
    }

    // Make sure req.body exists
    const body = req.body || {};

    const fields = [
      "visitType", "attended", "notVisitedReason", "otherReasonText",
      "reportType", "frequency", "fromDate", "toDate", "extraField",
      "stockType", "brand", "product", "sku", "productType", "quantity",
      "location"
    ];

    fields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(body, field)) {

        if (field === "location") {
          try {
            report.location =
              typeof body.location === "string"
                ? JSON.parse(body.location)
                : body.location;
          } catch {
            console.log("Invalid location JSON");
          }
        } else {
          report[field] = body[field];
        }
      }
    });

    // --- Remove old images ----
    if (body.removedImageIndices) {
      try {
        const removeList = JSON.parse(body.removedImageIndices);
        report.images = report.images.filter((_, i) => !removeList.includes(i));
      } catch {
        console.log("Invalid removedImageIndices");
      }
    }

    // --- Add NEW images ---
    if (req.files?.images?.length > 0) {
      const newImages = req.files.images.map(img => ({
        data: img.buffer,
        contentType: img.mimetype,
        fileName: img.originalname
      }));
      report.images = [...(report.images || []), ...newImages];
    }

    /* ---------------------------------------------------------
       🔥 MULTIPLE BILL COPIES SUPPORT (ONLY THIS PART ADDED)
    --------------------------------------------------------- */

    // Ensure billCopies array exists
    if (!Array.isArray(report.billCopies)) {
      report.billCopies = [];
    }

    // Add NEW bill copy files
    if (req.files?.billCopy?.length > 0) {
      const newBills = req.files.billCopy.map(file => ({
        data: file.buffer,
        contentType: file.mimetype,
        fileName: file.originalname
      }));

      report.billCopies = [...report.billCopies, ...newBills];
    }

    // Optional: remove bill copies by index
    if (body.removedBillIndices) {
      try {
        const removeList = JSON.parse(body.removedBillIndices);
        report.billCopies = report.billCopies.filter((_, i) => !removeList.includes(i));
      } catch {
        console.log("Invalid removedBillIndices");
      }
    }

    /* ------------------------------------------------------- */

    await report.save();

    res.status(200).json({ message: "Report updated", report });

  } catch (error) {
    console.error("Update report error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ======================================================
   CREATE JOB POSTING (admin)
   POST /admin/career/jobs
   body: { title, description, location, salaryRange?, experienceRequired?, employmentType?, totalRounds? }
====================================================== */
export const createJobPosting = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin")
      return res.status(403).json({ message: "Only admins can create job postings" });

    const { title, description, location, salaryRange, experienceRequired, employmentType, totalRounds } = req.body;
    if (!title || !description || !location)
      return res.status(400).json({ message: "title, description, and location are required" });

    const job = new Job({
      title,
      description,
      location,
      salaryRange,
      experienceRequired,
      employmentType,
      totalRounds: totalRounds || 1,
      createdBy: req.user.id,
      isActive: true,
    });

    await job.save();
    res.status(201).json({ message: "Job created successfully", job });
  } catch (error) {
    console.error("Create job posting error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   Get jobs created by admin
   GET /admin/career/jobs
====================================================== */


export const getAdminJobs = async (req, res) => {
  try {
    if (!req.user || !req.user.id)
      return res.status(401).json({ message: "Not authorized, please log in" });

    const admin = await Admin.findById(req.user.id);
    if (!admin)
      return res.status(403).json({ message: "Only registered admins can view jobs" });

 
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.status(200).json({ jobs });
  } catch (error) {
    console.error("Get admin jobs error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/* ======================================================
   Get applications for a specific job (admin)
   GET /admin/career/jobs/:jobId/applications
====================================================== */
export const getJobApplications = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin")
      return res.status(403).json({ message: "Only admins can view applications" });

    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.createdBy.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized to view applications for this job" });

    const applications = await JobApplication.find({ job: jobId })
      .populate("candidate", "fullName email phoneNumber")
      .sort({ appliedAt: -1 });

    res.status(200).json({ applications });
  } catch (error) {
    console.error("Get job applications error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   Update application status / round (admin)
   PUT /admin/career/applications/:applicationId
   body: { status?, currentRound? }
====================================================== */

/* ======================================================
   UPDATE APPLICATION STATUS (ADMIN)
   PATCH /api/admin/applications/:id/status
====================================================== */
/* ============================================================
   UPDATE APPLICATION STATUS (Admin)
============================================================ */
export const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, currentRound, totalRounds } = req.body;

    if (!applicationId)
      return res.status(400).json({ message: "Application ID is required" });

    // 1️ Find the application
    const application = await JobApplication.findById(applicationId)
      .populate("candidate")
      .populate("job");

    if (!application)
      return res.status(404).json({ message: "Application not found" });

    // 2️ Update fields
    if (status) application.status = status;
    if (currentRound !== undefined) application.currentRound = currentRound;
    if (totalRounds !== undefined) application.totalRounds = totalRounds;
    await application.save();

    const { fullName, email } = application.candidate;
    const { title } = application.job;

    // 3️ Prepare email content
    const htmlContent = `
      <h2>Application Status Updated</h2>
      <p>Dear ${fullName},</p>
      <p>Your application status for the position of <strong>${title}</strong> has been updated.</p>
      <p><strong>Status:</strong> ${application.status}</p>
      ${
        application.currentRound
          ? `<p><strong>Current Round:</strong> ${application.currentRound} / ${application.totalRounds}</p>`
          : ""
      }
      <br/>
      <p>Thank you for your continued interest.</p>
      <p>Best regards,<br/>HR Team</p>
    `;


    if (process.env.NODE_ENV === "production") {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Career Portal <onboarding@resend.dev>",
            to: [email],
            subject: `Application Update for ${title}`,
            html: htmlContent,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(" Resend email failed:", errorText);
        } else {
          console.log(` Resend email sent successfully to ${email}`);
        }
      } catch (emailErr) {
        console.error(" Resend error:", emailErr.message);
      }
    } else {
      // 5️⃣ Use Gmail locally (for testing)
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        await transporter.sendMail({
          from: `"Career Portal" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: `Application Update for ${title}`,
          html: htmlContent,
        });

        console.log(` Local email sent to ${email}`);
      } catch (emailErr) {
        console.error(" Local email error:", emailErr.message);
      }
    }

    // 6️⃣ Respond success
    res.status(200).json({
      message: "Application status updated and email notification sent.",
      updatedApplication: application,
    });
  } catch (err) {
    console.error(" Error updating application status:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};
/* ======================================================
   Update or Change Status of a Job Posting
   PUT /admin/career/jobs/:id
   Body: { title?, description?, location?, salaryRange?, experienceRequired?, employmentType?, isActive? }
====================================================== */
/* ======================================================
   Update or Change Status of a Job Posting
   PUT /admin/career/jobs/:id
   Body: { title?, description?, location?, salaryRange?, experienceRequired?, employmentType?, isActive? }
====================================================== */
export const updateJobPosting = async (req, res) => {
  try {
    if (!req.user || !req.user.id)
      return res.status(401).json({ message: "Not authorized, please log in" });

    const { id } = req.params;
    const {
      title,
      description,
      location,
      salaryRange,
      experienceRequired,
      employmentType,
      isActive,
    } = req.body;

    // ✅ Find by ID only (remove createdBy restriction if single admin)
    const job = await Job.findById(id);

    if (!job) return res.status(404).json({ message: "Job not found" });

    // ✅ Update fields dynamically
    Object.assign(job, {
      ...(title && { title }),
      ...(description && { description }),
      ...(location && { location }),
      ...(salaryRange && { salaryRange }),
      ...(experienceRequired && { experienceRequired }),
      ...(employmentType && { employmentType }),
      ...(isActive !== undefined && { isActive }),
    });

    await job.save();

    res.status(200).json({ message: "Job updated successfully", job });
  } catch (error) {
    console.error("Update job posting error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};
export const getSingleAdminJob = async (req, res) => {
  try {
    
    if (!req.user || !req.user.id)
      return res.status(401).json({ message: "Not authorized, please log in" });

    
    const admin = await Admin.findById(req.user.id);
    if (!admin)
      return res.status(403).json({ message: "Only registered admins can view job details" });

    const { id } = req.params;


    const job = await Job.findById(id);

    if (!job)
      return res.status(404).json({ message: "Job not found" });

    res.status(200).json({ job });
  } catch (error) {
    console.error("Get single admin job error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
/* ======================================================
   Admin download candidate resume
   GET /admin/career/applications/:applicationId/resume
====================================================== */

export const getCandidateResume = async (req, res) => {
  try {
   
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can access resumes" });
    }

    
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid application ID" });
    }

    
    const application = await JobApplication.findById(id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    
    const candidateId = application.candidate;
    if (!candidateId) {
      return res.status(404).json({ message: "Candidate not linked to this application" });
    }

    
    const candidate = await CareerApplication.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate record not found" });
    }

   
    const resume = candidate.resume;
    if (!resume?.data || !resume?.contentType) {
      return res.status(404).json({ message: "Resume not uploaded or unavailable" });
    }


    const ext = resume.contentType.split("/")[1] || "pdf";
    const filename = resume.fileName
      ? resume.fileName
      : `${candidate.fullName.replace(/\s+/g, "_")}_Resume.${ext}`;

    res.set({
      "Content-Type": resume.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    });

   
    return res.send(resume.data);
  } catch (error) {
    console.error("Error fetching candidate resume:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   ADMIN FORGOT PASSWORD
   POST /api/admin/forgot-password
====================================================== */
/* ======================================================
   ADMIN FORGOT PASSWORD (OTP SEND)
   POST /api/admin/forgot-password
====================================================== */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before saving
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    admin.resetPasswordToken = hashedOtp;
    admin.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // valid for 10 minutes
    await admin.save();

    // Email setup (Gmail)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email content
    const mailOptions = {
      from: `"Supreme Admin Support" <${process.env.EMAIL_USER}>`,
      to: admin.email,
      subject: "Your OTP for Password Reset",
      html: `
        <p>Hi ${admin.name || "Admin"},</p>
        <p>Your OTP for password reset is:</p>
        <h2>${otp}</h2>
        <p>This OTP is valid for 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "OTP sent successfully to registered email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   ADMIN RESET PASSWORD (OTP VERIFY)
   POST /api/admin/reset-password
====================================================== */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: "Email, OTP, and new password are required" });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // Hash the provided OTP to compare
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    if (
      admin.resetPasswordToken !== hashedOtp ||
      admin.resetPasswordExpires < Date.now()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;

    // Clear OTP fields
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;

    await admin.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
/* ======================================================
   EDIT / UPDATE EXISTING CAMPAIGN (FULL UPDATE)
   PUT /admin/campaigns/:id
====================================================== */
export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can edit campaigns" });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    const {
      name,
      client,
      type,
      regions,
      states,
      campaignStartDate,
      campaignEndDate,
      isActive,

      assignedRetailers,
      assignedEmployees
    } = req.body;

    /* -----------------------------------------------------
       UPDATE BASIC FIELDS (only if provided)
    ------------------------------------------------------ */
    if (name) campaign.name = name;
    if (client) campaign.client = client;
    if (type) campaign.type = type;
    if (regions) campaign.regions = regions;
    if (states) campaign.states = states;

    if (campaignStartDate) campaign.campaignStartDate = new Date(campaignStartDate);
    if (campaignEndDate) campaign.campaignEndDate = new Date(campaignEndDate);

    if (isActive !== undefined) campaign.isActive = isActive;

    /* -----------------------------------------------------
       UPDATE ASSIGNED RETAILERS (add / update / remove)
    ------------------------------------------------------ */
    if (assignedRetailers) {
      assignedRetailers.forEach((item) => {
        const existing = campaign.assignedRetailers.find(
          (r) => r.retailerId.toString() === item.retailerId
        );

        if (existing) {
          // update retailer record
          if (item.status) existing.status = item.status;
          if (item.startDate) existing.startDate = new Date(item.startDate);
          if (item.endDate) existing.endDate = new Date(item.endDate);
          existing.updatedAt = new Date();
        } else {
          // add new retailer
          campaign.assignedRetailers.push({
            retailerId: item.retailerId,
            status: item.status || "pending",
            startDate: item.startDate ? new Date(item.startDate) : null,
            endDate: item.endDate ? new Date(item.endDate) : null,
            assignedAt: new Date(),
            updatedAt: new Date(),
          });
        }
      });
    }

    /* -----------------------------------------------------
       UPDATE ASSIGNED EMPLOYEES (add / update / remove)
    ------------------------------------------------------ */
    if (assignedEmployees) {
      assignedEmployees.forEach((item) => {
        const existing = campaign.assignedEmployees.find(
          (e) => e.employeeId.toString() === item.employeeId
        );

        if (existing) {
          if (item.status) existing.status = item.status;
          if (item.startDate) existing.startDate = new Date(item.startDate);
          if (item.endDate) existing.endDate = new Date(item.endDate);
          existing.updatedAt = new Date();
        } else {
          campaign.assignedEmployees.push({
            employeeId: item.employeeId,
            status: item.status || "pending",
            startDate: item.startDate ? new Date(item.startDate) : null,
            endDate: item.endDate ? new Date(item.endDate) : null,
            assignedAt: new Date(),
            updatedAt: new Date(),
          });
        }
      });
    }

    await campaign.save();

    res.status(200).json({
      message: "Campaign updated successfully",
      campaign,
    });

  } catch (error) {
    console.error("Update campaign error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
export const assignEmployeeToRetailer = async (req, res) => {
  try {
    const { campaignId, retailerId, employeeId } = req.body;

    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can assign" });
    }

    if (!campaignId || !retailerId || !employeeId) {
      return res.status(400).json({
        message: "campaignId, retailerId and employeeId are required"
      });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // -------------------------------
    // 1️⃣ Check retailer is part of campaign
    // -------------------------------
    const retailerExists = campaign.assignedRetailers.some(
      (r) => r.retailerId.toString() === retailerId.toString()
    );

    if (!retailerExists) {
      return res.status(400).json({
        message: "Retailer is not assigned to this campaign"
      });
    }

    // -------------------------------
    // 2️⃣ Check employee is part of campaign
    // -------------------------------
    const employeeExists = campaign.assignedEmployees.some(
      (e) => e.employeeId.toString() === employeeId.toString()
    );

    if (!employeeExists) {
      return res.status(400).json({
        message: "Employee is not assigned to this campaign"
      });
    }

    // -------------------------------
    // 3️⃣ Prevent duplicate mapping
    // -------------------------------
    const alreadyMapped = campaign.assignedEmployeeRetailers.some(
      (entry) =>
        entry.employeeId.toString() === employeeId.toString() &&
        entry.retailerId.toString() === retailerId.toString()
    );

    if (alreadyMapped) {
      return res.status(400).json({
        message: "Employee is already assigned to this retailer"
      });
    }

    // -------------------------------
    // 4️⃣ Save mapping
    // -------------------------------
    campaign.assignedEmployeeRetailers.push({
      employeeId,
      retailerId,
      assignedAt: new Date()
    });

    await campaign.save();

    res.status(200).json({
      message: "Employee assigned to retailer successfully",
      mapping: campaign.assignedEmployeeRetailers
    });
  } catch (err) {
    console.error("Assign employee to retailer error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getCampaignRetailersWithEmployees = async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await Campaign.findById(campaignId)
      .select("name client type assignedEmployees assignedRetailers")
      .lean();

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // -------------------------
    // FULL RETAILER FETCH
    // -------------------------
    const retailerIds = campaign.assignedRetailers.map(r => r.retailerId);

    const retailers = await Retailer.find({ _id: { $in: retailerIds } })
      .lean();  // FULL retailer fields

    const retailerMeta = {};
    campaign.assignedRetailers.forEach(r => {
      retailerMeta[r.retailerId] = {
        status: r.status,
        assignedAt: r.assignedAt,
        startDate: r.startDate,
        endDate: r.endDate
      };
    });

    const finalRetailers = retailers.map(r => ({
      ...r,
      ...retailerMeta[r._id]
    }));

    // -------------------------
    // FULL EMPLOYEE FETCH
    // -------------------------
    const employeeIds = campaign.assignedEmployees.map(e => e.employeeId);

    const employees = await Employee.find({ _id: { $in: employeeIds } })
      .lean();  // FULL employee fields

    const employeeMeta = {};
    campaign.assignedEmployees.forEach(e => {
      employeeMeta[e.employeeId] = {
        status: e.status,
        assignedAt: e.assignedAt,
        startDate: e.startDate,
        endDate: e.endDate
      };
    });

    const finalEmployees = employees.map(e => ({
      ...e,
      ...employeeMeta[e._id]
    }));

    // -------------------------
    // RESPONSE
    // -------------------------
    res.status(200).json({
      campaignId,
      campaignName: campaign.name,
      client: campaign.client,
      type: campaign.type,

      totalRetailers: finalRetailers.length,
      totalEmployees: finalEmployees.length,

      retailers: finalRetailers,
      employees: finalEmployees
    });

  } catch (err) {
    console.error("FAST Campaign fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getEmployeeRetailerMapping = async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await Campaign.findById(campaignId)
      .select("assignedEmployees assignedRetailers assignedEmployeeRetailers")
      .lean();

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // --------------------------------------------
    // Fetch ALL employees (full documents)
    // --------------------------------------------
    const employeeIds = campaign.assignedEmployeeRetailers.map(m => m.employeeId);

    const employees = await Employee.find({ _id: { $in: employeeIds } })
      .lean(); //  <-- FULL EMPLOYEE DOC

    const employeeMap = {};
    employees.forEach(e => {
      employeeMap[e._id] = { 
        ...e,    // all fields of employee
        retailers: []
      };
    });

    // --------------------------------------------
    // Fetch ALL retailers (full documents)
    // --------------------------------------------
    const retailerIds = campaign.assignedEmployeeRetailers.map(m => m.retailerId);

    const retailers = await Retailer.find({ _id: { $in: retailerIds } })
      .lean();   // <-- FULL RETAILER DOC

    const retailerMap = {};
    retailers.forEach(r => {
      retailerMap[r._id] = r;
    });

    // --------------------------------------------
    // Build mapping: employee → list of retailers
    // --------------------------------------------
    campaign.assignedEmployeeRetailers.forEach(mapping => {
      const eId = mapping.employeeId;
      const rId = mapping.retailerId;

      if (employeeMap[eId]) {
        employeeMap[eId].retailers.push({
          ...retailerMap[rId],          // full retailer data
          assignedAt: mapping.assignedAt
        });
      }
    });

    // --------------------------------------------
    // Final response
    // --------------------------------------------
    res.status(200).json({
      campaignId,
      totalEmployees: Object.keys(employeeMap).length,
      employees: Object.values(employeeMap) // full employees with full retailers list
    });

  } catch (err) {
    console.error("Employee→Retailer mapping fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
export const assignVisitSchedule = async (req, res) => {
  try {
    const { 
      campaignId, 
      employeeId, 
      retailerId, 
      visitDate, 
      visitType, 
      notes,
      isRecurring,
      recurrenceInterval,
      lastVisitDate
    } = req.body;

    if (!campaignId || !employeeId || !retailerId || !visitDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    // Check employee assigned
    const employeeExists = campaign.assignedEmployees.some(
      e => e.employeeId.toString() === employeeId
    );
    if (!employeeExists) {
      return res.status(400).json({ message: "Employee not assigned to campaign" });
    }

    // Check retailer assigned
    const retailerExists = campaign.assignedRetailers.some(
      r => r.retailerId.toString() === retailerId
    );
    if (!retailerExists) {
      return res.status(400).json({ message: "Retailer not assigned to campaign" });
    }

    // Check employee-retailer mapping
    const mappingExists = campaign.assignedEmployeeRetailers.some(
      m =>
        m.employeeId.toString() === employeeId &&
        m.retailerId.toString() === retailerId
    );

    if (!mappingExists) {
      return res.status(400).json({
        message: "Employee → Retailer mapping does not exist in this campaign"
      });
    }

    // Create schedule
    const visit = await VisitSchedule.create({
      campaignId,
      employeeId,
      retailerId,
      visitDate,
      visitType,
      notes,

      // NEW FIELDS
      isRecurring: isRecurring || "No",
      recurrenceInterval: isRecurring === "Yes" ? recurrenceInterval : null,
      lastVisitDate: lastVisitDate || null
    });

    res.status(201).json({
      message: "Visit assigned successfully",
      visit
    });
  } catch (err) {
    console.error("Assign visit error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getCampaignVisitSchedules = async (req, res) => {
  try {
    const { campaignId } = req.params;

    const visits = await VisitSchedule.find({ campaignId })
      .populate("employeeId", "name phone position")
      .populate("retailerId", "name contactNo shopDetails")
      .sort({ visitDate: 1 })
      .lean();

    res.status(200).json({
      campaignId,
      totalVisits: visits.length,
      visits
    });
  } catch (err) {
    console.error("Fetch campaign visits error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getEmployeeVisitSchedule = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const visits = await VisitSchedule.find({ employeeId })
      .populate("campaignId", "name type")
      .populate("retailerId", "name contactNo")
      .sort({ visitDate: 1 })
      .lean();

    res.status(200).json({
      employeeId,
      totalVisits: visits.length,
      visits
    });
  } catch (err) {
    console.error("Fetch employee visits error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
export const updateVisitScheduleStatus = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { scheduleId } = req.params;
    const { status } = req.body;

    const { VisitSchedule } = await import("../models/VisitSchedule.js");

    if (!["Completed", "Missed", "Cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const schedule = await VisitSchedule.findOne({
      _id: scheduleId,
      employeeId
    });

    if (!schedule) {
      return res.status(404).json({ message: "Visit schedule not found" });
    }

    schedule.status = status;
    schedule.updatedAt = new Date();

    // NEW → update lastVisitDate when completed
    if (status === "Completed") {
      schedule.lastVisitDate = new Date();
    }

    await schedule.save();

    res.status(200).json({
      message: "Visit schedule status updated successfully",
      schedule
    });
  } catch (error) {
    console.error("updateVisitScheduleStatus Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
export const getEmployeeVisitProgress = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const { VisitSchedule } = await import("../models/VisitSchedule.js");

    const { campaignId } = req.query;

    const filter = { employeeId };
    if (campaignId) filter.campaignId = campaignId;

    const visits = await VisitSchedule.find(filter).lean();

    const total = visits.length;
    const completed = visits.filter(v => v.status === "Completed").length;
    const missed = visits.filter(v => v.status === "Missed").length;
    const cancelled = visits.filter(v => v.status === "Cancelled").length;
    const pending = visits.filter(v => v.status === "Scheduled").length;

    const progressPercent =
      total === 0 ? 0 : Math.round((completed / total) * 100);

    res.status(200).json({
      message: "Visit progress fetched successfully",
      progress: {
        total,
        completed,
        missed,
        cancelled,
        pending,
        progressPercent
      },
      visits
    });

  } catch (error) {
    console.error("getEmployeeVisitProgress Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

export const getAssignedEmployeeForRetailer = async (req, res) => {
  try {
    const { campaignId, retailerId } = req.params;

    // Get the campaign with employee-retailer mapping
    const campaign = await Campaign.findById(campaignId)
      .select("assignedEmployeeRetailers")
      .lean();

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // Find the employee mapped to this retailer
    const mapping = campaign.assignedEmployeeRetailers.find(
      (m) => m.retailerId.toString() === retailerId.toString()
    );

    // Retailer not assigned to any employee
    if (!mapping) {
      return res.status(200).json({
        campaignId,
        retailerId,
        isAssigned: false,
        employee: null,
        message: "No employee assigned to this retailer in this campaign"
      });
    }

    // Fetch employee details now
    const employee = await Employee.findById(mapping.employeeId)
      .select("name email phone position")
      .lean();

    res.status(200).json({
      campaignId,
      retailerId,
      isAssigned: true,
      employee,
      assignedAt: mapping.assignedAt,
      message: "Employee assigned to this retailer"
    });

  } catch (err) {
    console.error("Error checking assigned employee:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const downloadEmployeeRetailerMappingReport = async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await Campaign.findById(campaignId)
      .select("assignedEmployeeRetailers")
      .lean();

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // Extract all employees & retailers
    const employeeIds = campaign.assignedEmployeeRetailers.map(m => m.employeeId);
    const retailerIds = campaign.assignedEmployeeRetailers.map(m => m.retailerId);

    const employees = await Employee.find({ _id: { $in: employeeIds } })
      .select("name email phone position")
      .lean();

    const retailers = await Retailer.find({ _id: { $in: retailerIds } })
      .select("name contactNo shopDetails")
      .lean();

    const employeeMap = {};
    employees.forEach(e => (employeeMap[e._id] = e));

    const retailerMap = {};
    retailers.forEach(r => (retailerMap[r._id] = r));

    // ---------------------------------------------
    // Build final rows for Excel
    // ---------------------------------------------
    const rows = campaign.assignedEmployeeRetailers.map(m => {
      const emp = employeeMap[m.employeeId];
      const ret = retailerMap[m.retailerId];

      return {
        EmployeeName: emp?.name || "",
        EmployeeEmail: emp?.email || "",
        EmployeePhone: emp?.phone || "",
        EmployeePosition: emp?.position || "",

        RetailerName: ret?.name || "",
        RetailerContact: ret?.contactNo || "",
        ShopName: ret?.shopDetails?.shopName || "",
        ShopCity: ret?.shopDetails?.shopAddress?.city || "",
        ShopState: ret?.shopDetails?.shopAddress?.state || "",

        AssignedAt: new Date(m.assignedAt).toLocaleString()
      };
    });

    // Create Excel sheet
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employee-Retailer-Mapping");

    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Send file
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=employee_retailer_mapping_${campaignId}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.end(excelBuffer);

  } catch (err) {
    console.error("Download mapping report error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
/* ======================================================
   GET ALL REPORTS OF LOGGED-IN EMPLOYEE (WITH FILTERS)
====================================================== */
export const getAllEmployeeReports = async (req, res) => {
  try {
    const { role } = req.user;
    const { campaignId, employeeId, retailerId, fromDate, toDate } = req.query;

    // ----------------------------------------------------
    // Admin / Client Admin ONLY
    // ----------------------------------------------------
    if (!["admin", "client_admin", "client_user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ----------------------------------------------------
    // Campaign is REQUIRED
    // ----------------------------------------------------
    if (!campaignId) {
      return res.status(400).json({ message: "campaignId is required" });
    }

    // ----------------------------------------------------
    // Build filter
    // ----------------------------------------------------
    const filter = { campaignId };

    if (employeeId) filter.employeeId = employeeId;
    if (retailerId) filter.retailerId = retailerId;

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    // ----------------------------------------------------
    // Fetch reports
    // ----------------------------------------------------
    const reports = await EmployeeReport.find(filter)
      .populate("employeeId", "name email phone position")
      .populate("campaignId", "name type client")
      .populate(
        "retailerId",
        "name uniqueId retailerCode contactNo shopDetails"
      )
      .populate("visitScheduleId", "visitDate status visitType")
      .sort({ createdAt: -1 })
      .lean();

    if (!reports.length) {
      return res.status(200).json({
        message: "No reports found for this campaign",
        totalReports: 0,
        reports: []
      });
    }

    // ----------------------------------------------------
    // Flatten for frontend
    // ----------------------------------------------------
    const finalReports = reports.map(r => ({
      ...r,

      employeeName: r.employeeId?.name || "",
      employeePhone: r.employeeId?.phone || "",
      employeeEmail: r.employeeId?.email || "",
      employeePosition: r.employeeId?.position || "",

      retailerName: r.retailerId?.name || "",
      retailerUniqueId: r.retailerId?.uniqueId || "",
      retailerCode: r.retailerId?.retailerCode || "",
      retailerContact: r.retailerId?.contactNo || "",
      shopName: r.retailerId?.shopDetails?.shopName || "",
      shopCity: r.retailerId?.shopDetails?.shopAddress?.city || "",
      shopState: r.retailerId?.shopDetails?.shopAddress?.state || "",
      shopPincode: r.retailerId?.shopDetails?.shopAddress?.pincode || "",

      campaignName: r.campaignId?.name || "",
      campaignType: r.campaignId?.type || "",
      clientName: r.campaignId?.client || "",

      visitDate: r.visitScheduleId?.visitDate || null,
      visitStatus: r.visitScheduleId?.status || "",
      visitType: r.visitScheduleId?.visitType || "",
    }));

    return res.status(200).json({
      message: "Reports fetched successfully",
      totalReports: finalReports.length,
      reports: finalReports
    });

  } catch (error) {
    console.error("Get all employee reports error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

export const getReportsByEmployeeId = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({ message: "employeeId is required" });
    }

    const reports = await EmployeeReport.find({ employeeId })
      .populate("campaignId") // full campaign details
      .populate("employeeId") // full employee details
      .populate({
        path: "retailerId",
        populate: [
          { path: "shopDetails.shopAddress" },
          { path: "shopDetails.outletPhoto" },
        ],
      })
      .populate("submittedByEmployee", "name email phone position")
      .populate("submittedByAdmin", "name email phone")
      .populate("submittedByRetailer", "name contactNo email uniqueId")
      .sort({ createdAt: -1 })
      .lean();

    // ⭐ Add frequency to each report (no other changes)
    const finalReports = reports.map(r => ({
      ...r,
      frequency: r.frequency || "",
    }));

    res.status(200).json({
      message: "Reports fetched successfully",
      totalReports: finalReports.length,
      reports: finalReports,
    });

  } catch (err) {
    console.error("Error fetching employee reports:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateVisitScheduleDetails = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const {
      campaignId,
      employeeId,
      retailerId,
      visitDate,
      visitType,
      notes,
      isRecurring,
      recurrenceInterval,
      lastVisitDate
    } = req.body;

    const schedule = await VisitSchedule.findById(scheduleId);

    if (!schedule) {
      return res.status(404).json({ message: "Visit schedule not found" });
    }

    // Update fields only if provided
    if (campaignId) schedule.campaignId = campaignId;
    if (employeeId) schedule.employeeId = employeeId;
    if (retailerId) schedule.retailerId = retailerId;
    if (visitDate) schedule.visitDate = visitDate;
    if (visitType) schedule.visitType = visitType;
    if (notes) schedule.notes = notes;

    // Recurring updates
    if (isRecurring) schedule.isRecurring = isRecurring;

    if (isRecurring === "Yes") {
      if (recurrenceInterval) schedule.recurrenceInterval = recurrenceInterval;
    } else {
      schedule.recurrenceInterval = null;
    }

    if (lastVisitDate) {
      schedule.lastVisitDate = lastVisitDate;
    }

    await schedule.save();

    res.status(200).json({
      message: "Visit schedule updated successfully",
      schedule
    });

  } catch (error) {
    console.error("updateVisitScheduleDetails Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
export const deleteVisitSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    if (!scheduleId) {
      return res.status(400).json({ message: "scheduleId is required" });
    }

    const schedule = await VisitSchedule.findById(scheduleId);

    if (!schedule) {
      return res.status(404).json({ message: "Visit schedule not found" });
    }

    await VisitSchedule.deleteOne({ _id: scheduleId });

    res.status(200).json({
      message: "Visit schedule deleted successfully",
      deletedScheduleId: scheduleId
    });

  } catch (error) {
    console.error("Delete visit schedule error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
/* ======================================================
   DELETE EMPLOYEE REPORT (ADMIN ONLY)
   DELETE /api/reports/:reportId
====================================================== */
export const deleteEmployeeReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    // Validate admin
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can delete reports"
      });
    }

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: "Invalid report ID" });
    }

    // Check if exists
    const report = await EmployeeReport.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Delete the report
    await EmployeeReport.deleteOne({ _id: reportId });

    return res.status(200).json({
      message: "Report deleted successfully",
      deletedReportId: reportId
    });

  } catch (error) {
    console.error("Delete Employee Report Error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
export const adminGetRetailerReportsInCampaign = async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { campaignId, retailerId, fromDate, toDate } = req.query;

    if (!campaignId) {
      return res.status(400).json({ message: "campaignId is required" });
    }

    // -----------------------------------------------
    // Build Filter
    // -----------------------------------------------
    const filter = { campaignId };

    if (retailerId) filter.retailerId = retailerId;

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    // -----------------------------------------------
    // Fetch Reports with Population
    // -----------------------------------------------
    const reports = await EmployeeReport.find(filter)
      .populate("retailerId", "name uniqueId retailerCode contactNo shopDetails")
      .populate("employeeId", "name phone email position employeeId") // 👈 Added employeeId field
      .populate("campaignId", "name type client")
      .populate("visitScheduleId", "visitDate status visitType")
      .sort({ createdAt: -1 });

    if (!reports.length) {
      return res.status(200).json({
        message: "No retailer reports found for this campaign",
        totalReports: 0,
        reports: []
      });
    }

    // -----------------------------------------------
    // Buffer → Base64 Helpers
    // -----------------------------------------------
    const convertImages = (imgs = []) =>
      imgs.map(img => ({
        fileName: img.fileName || "",
        contentType: img.contentType || "image/jpeg",
        base64: `data:${img.contentType};base64,${img.data.toString("base64")}`
      }));

    const convertBillCopy = (bill) => {
      if (!bill || !bill.data) return null;

      return {
        fileName: bill.fileName || "",
        contentType: bill.contentType || "application/pdf",
        base64: `data:${bill.contentType};base64,${bill.data.toString("base64")}`
      };
    };

    // -----------------------------------------------
    // Final Frontend-Aligned Response
    // -----------------------------------------------
    const finalReports = reports.map(r => ({
      ...r._doc,

      // Correct images & bill copy formats
      images: convertImages(r.images),
      billCopy: convertBillCopy(r.billCopy),

      // Employee info
      employeeName: r.employeeId?.name || "",
      employeePhone: r.employeeId?.phone || "",
      employeeEmail: r.employeeId?.email || "",
      employeePosition: r.employeeId?.position || "",

      // 🔥 Added employee's unique auto-generated ID
      employeeUniqueId: r.employeeId?.employeeId || "",

      // Retailer info
      retailerName: r.retailerId?.name || "",
      retailerUniqueId: r.retailerId?.uniqueId || "",
      retailerCode: r.retailerId?.retailerCode || "",
      retailerContact: r.retailerId?.contactNo || "",

      shopName: r.retailerId?.shopDetails?.shopName || "",
      shopCity: r.retailerId?.shopDetails?.shopAddress?.city || "",
      shopState: r.retailerId?.shopDetails?.shopAddress?.state || "",
      shopPincode: r.retailerId?.shopDetails?.shopAddress?.pincode || "",

      // Campaign info
      campaignName: r.campaignId?.name || "",
      campaignType: r.campaignId?.type || "",
      clientName: r.campaignId?.client || "",

      // Visit details
      visitDate: r.visitScheduleId?.visitDate || "",
      visitStatus: r.visitScheduleId?.status || "",
      visitType: r.visitScheduleId?.visitType || "",

      // Report fields
      reportType: r.reportType || "",
      frequency: r.frequency || "",
      stockType: r.stockType || "",
      productType: r.productType || "",
      brand: r.brand || "",
      product: r.product || "",
      sku: r.sku || "",
      quantity: r.quantity || "",
      location: r.location || "",
      attended: r.attended || "",
      notVisitedReason: r.notVisitedReason || "",
      otherReasonText: r.otherReasonText || "",
      extraField: r.extraField || "",
      submittedByRole: r.submittedByRole || "",
    }));

    return res.status(200).json({
      message: "Retailer reports for campaign fetched successfully",
      totalReports: finalReports.length,
      reports: finalReports
    });

  } catch (err) {
    console.error("Admin retailer campaign reports error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const adminGetReportsByRetailer = async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { retailerId } = req.params;
    const { campaignId, fromDate, toDate } = req.query;

    if (!retailerId) {
      return res.status(400).json({ message: "retailerId is required" });
    }

    const filter = { retailerId };

    if (campaignId) filter.campaignId = campaignId;

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    const reports = await EmployeeReport.find(filter)
      .populate("campaignId", "name type client")
      .populate("retailerId", "name uniqueId retailerCode contactNo shopDetails")
      .populate("employeeId", "name email phone position")
      .populate("visitScheduleId", "visitDate status visitType")
      .sort({ createdAt: -1 })
      .lean();

    if (!reports.length) {
      return res.status(200).json({
        message: "No reports found for this retailer",
        totalReports: 0,
        reports: []
      });
    }

    const finalReports = reports.map(r => ({
      ...r,

      submittedByRole: r.submittedByRole,

      retailerName: r.retailerId?.name || "",
      retailerCode: r.retailerId?.retailerCode || "",
      retailerUniqueId: r.retailerId?.uniqueId || "",
      retailerContact: r.retailerId?.contactNo || "",

      shopName: r.retailerId?.shopDetails?.shopName || "",
      shopCity: r.retailerId?.shopDetails?.shopAddress?.city || "",
      shopState: r.retailerId?.shopDetails?.shopAddress?.state || "",
      shopPincode: r.retailerId?.shopDetails?.shopAddress?.pincode || "",

      campaignName: r.campaignId?.name || "",
      campaignType: r.campaignId?.type || "",
      clientName: r.campaignId?.client || "",

      employeeName: r.employeeId?.name || "",
      employeePhone: r.employeeId?.phone || "",
      employeeEmail: r.employeeId?.email || "",
      employeePosition: r.employeeId?.position || "",

      visitDate: r.visitScheduleId?.visitDate || "",
      visitStatus: r.visitScheduleId?.status || "",
      visitType: r.visitScheduleId?.visitType || "",
    }));

    res.status(200).json({
      message: "Retailer-specific reports fetched successfully",
      totalReports: finalReports.length,
      reports: finalReports
    });

  } catch (err) {
    console.error("Admin retailer reports error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
export const adminSetPaymentPlan = async (req, res) => {
  try {
    const { campaignId, retailerId, totalAmount, notes } = req.body;

    // 🔐 Only ADMIN allowed
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can set payment plans" });
    }

    // 1️⃣ Validate Campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    // 2️⃣ Check retailer is assigned to this campaign
    const isAssigned = campaign.assignedRetailers.some(
      (r) => r.retailerId.toString() === retailerId.toString()
    );

    if (!isAssigned) {
      return res
        .status(400)
        .json({ message: "Retailer is not assigned to this campaign" });
    }

    // 3️⃣ Avoid duplicate payment plan creation
    const existing = await Payment.findOne({
      campaign: campaignId,
      retailer: retailerId,
    });

    if (existing) {
      return res.status(400).json({
        message: "Payment plan already exists for this retailer in this campaign",
        payment: existing,
      });
    }

    // 4️⃣ Create new payment plan
    const payment = await Payment.create({
      retailer: retailerId,
      campaign: campaignId,
      totalAmount,
      amountPaid: 0,
      remainingAmount: totalAmount,
      paymentStatus: "Pending",
      notes,
      lastUpdatedByAdmin: req.user._id,
    });

    return res.status(201).json({
      message: "Payment plan created successfully by admin",
      payment,
    });

  } catch (error) {
    console.error("Admin Set Payment Error:", error);
    res.status(500).json({ message: error.message });
  }
};
export const adminUpdatePaymentPlan = async (req, res) => {
  try {
    const { campaignId, retailerId, amountPaid, utrNumber } = req.body;

    // 🔐 Only admin can access this
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can update payments" });
    }

    // 1️⃣ Validate Campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // 2️⃣ Check retailer is part of campaign & accepted
    const assigned = campaign.assignedRetailers.find(
      (r) => r.retailerId.toString() === retailerId.toString()
    );

    if (!assigned || assigned.status !== "accepted") {
      return res.status(400).json({
        message: "Retailer has not accepted this campaign yet or is not assigned",
      });
    }

    // 3️⃣ Fetch payment plan
    const payment = await Payment.findOne({
      campaign: campaignId,
      retailer: retailerId,
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment plan not found" });
    }

    // 4️⃣ Apply updates
    let updated = false;

    // Add amount
    if (amountPaid !== undefined) {
      payment.amountPaid += amountPaid;
      updated = true;
    }

    // Add UTR entry
    if (utrNumber) {
      payment.utrNumbers.push({
        utrNumber,
        amount: amountPaid || 0,
        date: new Date(),
        updatedBy: req.user._id,
      });
      updated = true;
    }

    // Update balances
    payment.remainingAmount = payment.totalAmount - payment.amountPaid;

    // Prevent negative balance
    if (payment.remainingAmount < 0) {
      return res
        .status(400)
        .json({ message: "Paid amount exceeds total amount!" });
    }

    // Update payment status
    if (payment.amountPaid === 0) {
      payment.paymentStatus = "Pending";
    } else if (payment.amountPaid < payment.totalAmount) {
      payment.paymentStatus = "Partially Paid";
    } else {
      payment.paymentStatus = "Completed";
    }

    // Save updater admin
    payment.lastUpdatedByAdmin = req.user._id;

    // Save
    if (updated) await payment.save();

    res.status(200).json({
      message: "Payment updated successfully by admin",
      payment,
    });

  } catch (error) {
    console.error("Admin payment update error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
