import {
  Admin,
  ClientAdmin,
  ClientUser,
  Retailer,
  Employee,
  Campaign,
  Payment 

} from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import XLSX from "xlsx";
import { CareerApplication,Job, JobApplication } from "../models/user.js";
import mongoose from "mongoose";
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
      password, 
      jobRole,
      states 
    } = req.body;

    // Only main admin can create client admins
    if (!req.user || req.user.role !== "admin")
      return res.status(403).json({ message: "Only admins can add client admins" });

    // Required fields check
    if (!name || !email || !organizationName || !password || !jobRole)
      return res.status(400).json({ message: "Missing required fields" });

    // State validation
    if (!states || !Array.isArray(states) || states.length === 0)
      return res.status(400).json({ message: "At least one state must be provided" });

    // Check if email already exists
    const existing = await ClientAdmin.findOne({ email });
    if (existing)
      return res.status(409).json({ message: "Client admin already exists" });

    const hashedPass = await bcrypt.hash(password, 10);

    const newClientAdmin = new ClientAdmin({
      name,
      email,
      contactNo,
      organizationName,
      password: hashedPass,

      // 🔥 New fields
      jobRole,
      states,

      registrationDetails: {
        username: email,
        password: hashedPass,
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
    const { contactNo, email } = body;

    if (!email || !contactNo)
      return res.status(400).json({ message: "Email and contact number are required" });

    const personalAddress = {
      address: body.address,
      city: body.city,
      state: body.state,
      geoTags: {
        lat: parseFloat(body.geoTags?.lat) || 0,
        lng: parseFloat(body.geoTags?.lng) || 0,
      },
    };

    const shopAddress = {
      address: body["shopDetails.shopAddress.address"] || body.shopAddress,
      city: body["shopDetails.shopAddress.city"] || body.shopCity,
      state: body["shopDetails.shopAddress.state"] || body.shopState,
      geoTags: {
        lat: parseFloat(body["shopDetails.shopAddress.geoTags.lat"]) || 0,
        lng: parseFloat(body["shopDetails.shopAddress.geoTags.lng"]) || 0,
      },
    };

    const shopDetails = {
      shopName: body["shopDetails.shopName"] || body.shopName,
      businessType: body["shopDetails.businessType"] || body.businessType,
      ownershipType: body["shopDetails.ownershipType"] || body.ownershipType,
      dateOfEstablishment: body["shopDetails.dateOfEstablishment"] || body.dateOfEstablishment,
      GSTNo: body["shopDetails.GSTNo"] || body.GSTNo,
      PANCard: body["shopDetails.PANCard"] || body.PANCard,
      shopAddress,
      outletPhoto: files.outletPhoto
        ? { data: files.outletPhoto[0].buffer, contentType: files.outletPhoto[0].mimetype }
        : undefined,
    };

    const bankDetails = {
      bankName: body["bankDetails.bankName"] || body.bankName,
      accountNumber: body["bankDetails.accountNumber"] || body.accountNumber,
      IFSC: body["bankDetails.IFSC"] || body.IFSC,
      branchName: body["bankDetails.branchName"] || body.branchName,
    };

    // Check if email or phone already exists
    const existingRetailer = await Retailer.findOne({
      $or: [{ contactNo }, { email }],
    });
    if (existingRetailer)
      return res.status(400).json({ message: "Phone or email already registered" });

    const retailer = new Retailer({
      name: body.name,
      contactNo,
      email,
      dob: body.dob,
      gender: body.gender,
      govtIdType: body.govtIdType,
      govtIdNumber: body.govtIdNumber,
      govtIdPhoto: files.govtIdPhoto
        ? { data: files.govtIdPhoto[0].buffer, contentType: files.govtIdPhoto[0].mimetype }
        : undefined,
      personPhoto: files.personPhoto
        ? { data: files.personPhoto[0].buffer, contentType: files.personPhoto[0].mimetype }
        : undefined,
      signature: files.signature
        ? { data: files.signature[0].buffer, contentType: files.signature[0].mimetype }
        : undefined,
      personalAddress,
      shopDetails,
      bankDetails,

     
      createdBy: body.createdBy || "AdminAdded",

      
      phoneVerified: true,

      partOfIndia: body.partOfIndia || "N",
    });

    await retailer.save();

    res.status(201).json({
      message: "Retailer registered successfully",
      uniqueId: retailer.uniqueId,
    });
  } catch (error) {
    console.error("Retailer registration error:", error);
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
      client,              // This is organizationName
      type,
      region,
      state,
      campaignStartDate,
      campaignEndDate
    } = req.body;

    // Admin auth check
    if (!req.user || req.user.role !== "admin")
      return res.status(403).json({ message: "Only admins can create campaigns" });

    // Required fields validation
    if (!name || !client || !type || !region || !state)
      return res.status(400).json({ message: "All fields are required" });

    // Validate organization exists (ONLY VALIDATION)
    const clientOrg = await ClientAdmin.findOne({ organizationName: client });

    if (!clientOrg) {
      return res.status(404).json({
        message: `Client organization '${client}' does not exist.`
      });
    }

    // Date validation
    if (!campaignStartDate || !campaignEndDate)
      return res.status(400).json({ message: "Campaign start and end date are required" });

    const start = new Date(campaignStartDate);
    const end = new Date(campaignEndDate);

    if (isNaN(start) || isNaN(end))
      return res.status(400).json({ message: "Invalid date format" });


    if (start > end)
      return res.status(400).json({ message: "Start date cannot be after end date" });

    // Create campaign (ONLY store organization name)
    const campaign = new Campaign({
      name,
      client, // Store ONLY the organizationName string
      type,
      region,
      state,
      createdBy: req.user.id,
      campaignStartDate: start,
      campaignEndDate: end,
      // DO NOT LINK CLIENT ADMIN ID
      // ONLY STORE ORGANIZATION NAME
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


export const getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .populate("createdBy", "name email")
      .populate("assignedEmployees", "name email")
      .populate("assignedRetailers", "name contactNo");

    res.status(200).json({ campaigns });
  } catch (error) {
    console.error("Get campaigns error:", error);
    res.status(500).json({ message: "Server error" });
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

      // Create employee object (employeeId auto-created by schema)
      employeesToInsert.push({
        name,
        email,
        phone: contactNo,
        password: contactNo,           // Default password
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

    // Campaign allowed states (array)
    const allowedStates = Array.isArray(campaign.state)
      ? campaign.state
      : [campaign.state];

    const startDate = campaign.campaignStartDate;
    const endDate = campaign.campaignEndDate;

    // Ensure arrays exist
    campaign.assignedEmployees ||= [];
    campaign.assignedRetailers ||= [];

    /* =========================================================================
       ASSIGN EMPLOYEES — Validate state before assigning
    ========================================================================= */
    for (const empId of employeeIds) {
      if (!empId) continue;

      const employee = await Employee.findById(empId);
      if (!employee) continue;

      const employeeState = employee?.correspondenceAddress?.state;

      // Validate state match
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

      // Update Employee model
      await Employee.findByIdAndUpdate(empId, {
        $addToSet: { assignedCampaigns: campaign._id },
      });
    }

    /* =========================================================================
       ASSIGN RETAILERS — Validate retailer's single shop state
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
    const employees = await Employee.find().select("_id name email");
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
    const retailers = await Retailer.find().select("_id name contactNo");
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
