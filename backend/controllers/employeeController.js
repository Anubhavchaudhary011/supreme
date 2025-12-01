import jwt from "jsonwebtoken";
import { Employee, Campaign,EmployeeReport,VisitSchedule } from "../models/user.js";
import bcrypt from "bcryptjs";
import { Retailer } from "../models/user.js";
import XLSX from "xlsx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
/* ======================================================
   UPDATE EMPLOYEE PROFILE
====================================================== */
export const updateEmployeeProfile = async (req, res) => {
  try {
    const { id } = req.user; // From JWT
    const employee = await Employee.findById(id);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    /* --------------------------------------------------
       🔥 Step 1: Apply Contractual vs Permanent Rules
    -------------------------------------------------- */
    const isContractual = employee.employeeType === "Contractual";

    if (isContractual) {
      const blocked = [
        "highestQualification",
        "maritalStatus",
        "fathersName",
        "fatherDob",
        "motherName",
        "motherDob",
        "spouseName",
        "spouseDob",
        "child1Name",
        "child1Dob",
        "child2Name",
        "child2Dob",
        "uanNumber",
        "esiNumber",
        "pfNumber",
        "esiDispensary",
        "experiences",
      ];

      blocked.forEach((f) => delete req.body[f]);

      const blockedFiles = [
        "familyPhoto",
        "esiForm",
        "pfForm",
        "employmentForm",
        "cv",
      ];

      blockedFiles.forEach((f) => delete req.files?.[f]);
    }

    /* --------------------------------------------------
       🔥 Step 2: Simple fields (direct assignment)
    -------------------------------------------------- */
    const simpleFields = [
      "gender",
      "dob",
      "highestQualification",
      "maritalStatus",
      "fathersName",
      "fatherDob",
      "motherName",
      "motherDob",
      "spouseName",
      "spouseDob",
      "child1Name",
      "child1Dob",
      "child2Name",
      "child2Dob",
      "alternatePhone",
      "aadhaarNumber",
      "panNumber",
      "uanNumber",
      "esiNumber",
      "pfNumber",
      "esiDispensary",
      "contractLength",
    ];

    simpleFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        employee[field] = req.body[field];
      }
    });

    /* --------------------------------------------------
       🔥 Step 3: Parse nested JSON OR accept direct object
    -------------------------------------------------- */
    const parseField = (value) => {
      if (!value) return null;
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch (e) {
          return null;
        }
      }
      if (typeof value === "object") return value;
      return null;
    };

    const corrAddr = parseField(req.body.correspondenceAddress);
    if (corrAddr) employee.correspondenceAddress = corrAddr;

    const permAddr = parseField(req.body.permanentAddress);
    if (permAddr) employee.permanentAddress = permAddr;

    const bank = parseField(req.body.bankDetails);
    if (bank) employee.bankDetails = bank;

    if (!isContractual) {
      const exp = parseField(req.body.experiences);
      if (exp) employee.experiences = exp;
    }

    /* --------------------------------------------------
       🔥 Step 4: Handle dot-notation fields (React forms)
    -------------------------------------------------- */
    const nestedFields = Object.keys(req.body).filter((key) =>
      key.includes(".")
    );

    nestedFields.forEach((key) => {
      const [parent, child] = key.split(".");
      if (!employee[parent]) employee[parent] = {};
      employee[parent][child] = req.body[key];
    });

    /* --------------------------------------------------
       🔥 Step 5: Handle File Uploads
    -------------------------------------------------- */
    const files = req.files || {};

    // Person Photo (stored outside employee.files)
    if (files["personPhoto"]) {
      employee.personPhoto = {
        data: files["personPhoto"][0].buffer,
        contentType: files["personPhoto"][0].mimetype,
      };
    }

    if (!employee.files) employee.files = {};

    const fileFields = [
      "aadhaarFront",
      "aadhaarBack",
      "panCard",
      "familyPhoto",
      "bankProof",
      "esiForm",
      "pfForm",
      "employmentForm",
      "cv",
    ];

    fileFields.forEach((field) => {
      if (files[field]) {
        employee.files[field] = {
          data: files[field][0].buffer,
          contentType: files[field][0].mimetype,
        };
      }
    });

    /* --------------------------------------------------
       🔥 Step 6: Password Change
    -------------------------------------------------- */
    if (req.body.newPassword && req.body.newPassword.trim().length >= 6) {
      employee.password = await bcrypt.hash(req.body.newPassword, 10);
    }

    employee.isFirstLogin = false;

    /* --------------------------------------------------
       🔥 Step 7: Save Employee
    -------------------------------------------------- */
    await employee.save();

    res.status(200).json({
      message: "Profile updated successfully",
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        isFirstLogin: employee.isFirstLogin,
      },
    });
  } catch (error) {
    console.error("❌ Error updating employee profile:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

/* ======================================================
   LOGIN EMPLOYEE
====================================================== */
export const loginEmployee = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ message: "Email or phone is required" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const employee = await Employee.findOne({
      $or: [{ email }, { phone }],
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: employee._id, role: "employee" },
      process.env.JWT_SECRET || "supremeSecretKey",
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        isFirstLogin: employee.isFirstLogin,
      },
    });
  } catch (error) {
    console.error("Employee login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ======================================================
   GET EMPLOYEE CAMPAIGNS
====================================================== */
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

/* ======================================================
   UPDATE CAMPAIGN STATUS
====================================================== */
export const updateCampaignStatus = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { campaignId } = req.params;
    const { status } = req.body;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const campaign = await Campaign.findOne({
      _id: campaignId,
      "assignedEmployees.employeeId": employeeId,
    });

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found or not assigned to this employee" });
    }

    const employeeEntry = campaign.assignedEmployees.find(
      (e) => e.employeeId.toString() === employeeId
    );

    if (!employeeEntry) {
      return res.status(404).json({ message: "Employee not assigned to this campaign" });
    }

    employeeEntry.status = status;
    employeeEntry.updatedAt = new Date();

    await campaign.save();

    res.status(200).json({
      message: `Campaign ${status} successfully`,
      campaignId,
      employeeStatus: employeeEntry.status,
    });
  } catch (error) {
    console.error("Update campaign status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ======================================================
   CLIENT PAYMENT PLAN
====================================================== */
export const clientSetPaymentPlan = async (req, res) => {
  try {
    const { campaignId, retailerId, totalAmount, notes, dueDate } = req.body;

    if (!req.user || !["client-admin", "client-user"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only client admins or users can set payment plans" });
    }

    if (!campaignId || !retailerId || !totalAmount) {
      return res.status(400).json({ message: "campaignId, retailerId, and totalAmount are required" });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    const retailer = await Retailer.findById(retailerId);
    if (!retailer) return res.status(404).json({ message: "Retailer not found" });

    const assignedRetailer = campaign.assignedRetailers.find(
      (r) => r.retailerId.toString() === retailerId.toString() && r.status === "accepted"
    );

    if (!assignedRetailer) {
      return res.status(400).json({ message: "Retailer must be assigned and accepted the campaign" });
    }

    const existingPayment = await Payment.findOne({ campaign: campaignId, retailer: retailerId });
    if (existingPayment) {
      return res.status(400).json({ message: "Payment plan already exists for this retailer" });
    }


    const payment = new Payment({
      campaign: campaignId,
      retailer: retailerId,
      totalAmount,
      amountPaid: 0,
      remainingAmount: totalAmount,
      paymentStatus: "Pending",
      lastUpdatedBy: req.user.id,
      notes,
      dueDate,
    });

    await payment.save();

    res.status(201).json({
      message: "Payment plan created successfully",
      payment,
    });
  } catch (error) {
    console.error("Client set payment plan error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const submitEmployeeReport = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const {
      campaignId,
      retailerId,
      visitScheduleId,  // optional (employee can send or auto-match)
      visitType,
      attended,
      notVisitedReason,
      otherReasonText,
      reportType,
      frequency,
      fromDate,
      toDate,
      extraField,
      stockType,
      brand,
      product,
      sku,
      productType,
      quantity,
      latitude,
      longitude
    } = req.body;

    if (!campaignId || !retailerId) {
      return res.status(400).json({ message: "campaignId and retailerId are required" });
    }

    /* =======================================================
       🔥 1. AUTO-FIND VISIT SCHEDULE IF NOT PROVIDED
    ======================================================= */

    let schedule = null;

    if (visitScheduleId) {
      schedule = await VisitSchedule.findById(visitScheduleId);
    } else {
      // Match today's schedule automatically
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      schedule = await VisitSchedule.findOne({
        campaignId,
        employeeId,
        retailerId,
        visitDate: { $gte: todayStart, $lte: todayEnd },
        status: "Scheduled"
      });
    }

    /* =======================================================
       🔥 2. UPDATE SCHEDULE STATUS BASED ON REPORT
    ======================================================= */

    let updatedStatus = "No Schedule Found";

    if (schedule) {
      if (attended === "Yes") {
        schedule.status = "Completed";
      } else {
        // Mark as Missed or Cancelled
        const cancellationReasons = ["Closed", "Out of Stock", "Owner Not Available"];

        if (cancellationReasons.includes(notVisitedReason)) {
          schedule.status = "Cancelled";
        } else {
          schedule.status = "Missed";
        }
      }

      schedule.notes = `Status auto-updated from report on ${new Date().toLocaleString()}`;
      await schedule.save();

      updatedStatus = schedule.status;
    }

    /* =======================================================
       🔥 3. CREATE REPORT DOCUMENT
    ======================================================= */

    const report = new EmployeeReport({
      employeeId,
      campaignId,
      retailerId,
      visitScheduleId: schedule?._id || null,  // Link report → schedule
      visitType,
      attended,
      notVisitedReason,
      otherReasonText,
      reportType,
      frequency,
      fromDate,
      toDate,
      extraField,
      stockType,
      brand,
      product,
      sku,
      productType,
      quantity,
      location: {
        latitude: Number(latitude) || null,
        longitude: Number(longitude) || null,
      },
    });

    /* =======================================================
       🔥 4. HANDLE IMAGES
    ======================================================= */

    const files = req.files || {};

    if (files.images) {
      report.images = files.images.map((file) => ({
        data: file.buffer,
        contentType: file.mimetype,
        fileName: file.originalname,
      }));
    }

    if (files.billCopy && files.billCopy[0]) {
      const file = files.billCopy[0];
      report.billCopy = {
        data: file.buffer,
        contentType: file.mimetype,
        fileName: file.originalname,
      };
    }

    await report.save();

    /* =======================================================
       🔥 5. RESPONSE
    ======================================================= */

    res.status(201).json({
      message: "Report submitted successfully",
      visitScheduleStatusUpdated: updatedStatus,
      linkedVisitScheduleId: schedule?._id || "None",
      report
    });

  } catch (error) {
    console.error("Submit report error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

export const getEmployeeReports = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const reports = await EmployeeReport.find({ employeeId })
      .populate("retailerId", "name shopDetails")
      .populate("campaignId", "name type")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Reports fetched successfully",
      reports,
    });

  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const downloadEmployeeReport = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { reportId } = req.body;

    if (!reportId) {
      return res.status(400).json({ message: "reportId is required" });
    }

    // Fetch EXACT report of logged-in employee
    const report = await EmployeeReport.findOne({
      _id: reportId,
      employeeId
    })
      .populate("employeeId", "name email phone")
      .populate("campaignId", "name type")
      .populate("retailerId", "name contactNo shopDetails");

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // ---------------------------
    // CREATE PDF DOCUMENT
    // ---------------------------
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    let y = height - 40;

    const write = (text, size = 12) => {
      if (y < 60) {
        page = pdfDoc.addPage();
        y = page.getSize().height - 40;
      }
      page.drawText(String(text), {
        x: 40,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
      });
      y -= size + 6;
    };

    // ---------------------------
    // HEADER
    // ---------------------------
    write("Employee Visit Report", 22);
    y -= 10;

    // ---------------------------
    // EMPLOYEE DETAILS
    // ---------------------------
    write("Employee Details", 16);
    write(`Name: ${report.employeeId?.name || "N/A"}`);
    write(`Email: ${report.employeeId?.email || "N/A"}`);
    write(`Phone: ${report.employeeId?.phone || "N/A"}`);
    y -= 10;

    // ---------------------------
    // CAMPAIGN DETAILS
    // ---------------------------
    write("Campaign Details", 16);
    write(`Campaign Name: ${report.campaignId?.name || "N/A"}`);
    write(`Campaign Type: ${report.campaignId?.type || "N/A"}`);
    y -= 10;

    // ---------------------------
    // RETAILER DETAILS
    // ---------------------------
    write("Retailer Details", 16);
    write(`Retailer Name: ${report.retailerId?.name || "N/A"}`);
    write(`Contact: ${report.retailerId?.contactNo || "N/A"}`);

    const addr = report.retailerId?.shopDetails?.shopAddress;

    const addressText = addr
      ? `${addr.address || ""}, ${addr.city || ""}, ${addr.state || ""}, ${addr.pincode || ""}`
      : "N/A";

    write(`Address: ${addressText}`);
    y -= 10;

    // ---------------------------
    // REPORT DETAILS
    // ---------------------------
    write("Report Details", 16);
    write(`Visit Type: ${report.visitType || "N/A"}`);
    write(`Attended: ${report.attended ? "Yes" : "No"}`);
    write(`Reason: ${report.notVisitedReason || "N/A"}`);
    write(`Report Type: ${report.reportType || "N/A"}`);
    write(`Frequency: ${report.frequency || "N/A"}`);

    const from = report.fromDate ? new Date(report.fromDate).toLocaleDateString() : "N/A";
    const to = report.toDate ? new Date(report.toDate).toLocaleDateString() : "N/A";

    write(`Date Range: ${from} to ${to}`);
    y -= 10;

    // ---------------------------
    // LOCATION
    // ---------------------------
    write("Location", 16);
    write(`Latitude: ${report.location?.latitude || "N/A"}`);
    write(`Longitude: ${report.location?.longitude || "N/A"}`);
    y -= 10;

    // ========================================================
    // ATTACHED IMAGES
    // ========================================================
    if (report.images?.length) {
      for (let img of report.images) {
        if (!img?.data) continue;

        const imgPage = pdfDoc.addPage();
        let embeddedImage;

        try {
          if (img.contentType === "image/png") {
            embeddedImage = await pdfDoc.embedPng(img.data);
          } else if (img.contentType === "image/jpeg" || img.contentType === "image/jpg") {
            embeddedImage = await pdfDoc.embedJpg(img.data);
          } else {
            console.log("Unsupported image type:", img.contentType);
            continue;
          }
        } catch (e) {
          console.log("Image embed failed:", e.message);
          continue;
        }

        const dims = embeddedImage.scale(0.5);

        imgPage.drawImage(embeddedImage, {
          x: 50,
          y: 150,
          width: dims.width,
          height: dims.height
        });
      }
    }

    // ========================================================
    // BILL COPY
    // ========================================================
    if (report.billCopy?.data) {
      const billPage = pdfDoc.addPage();
      let embeddedBill;

      try {
        if (report.billCopy.contentType === "image/png") {
          embeddedBill = await pdfDoc.embedPng(report.billCopy.data);
        } else {
          embeddedBill = await pdfDoc.embedJpg(report.billCopy.data);
        }
      } catch (e) {
        console.log("Bill copy embed failed:", e.message);
      }

      if (embeddedBill) {
        const dims = embeddedBill.scale(0.5);
        billPage.drawImage(embeddedBill, {
          x: 50,
          y: 150,
          width: dims.width,
          height: dims.height
        });
      }
    }

    // ---------------------------
    // SEND PDF
    // ---------------------------
    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=report_${reportId}.pdf`
    );

    return res.end(Buffer.from(pdfBytes));

  } catch (error) {
    console.error("PDF Download Error:", error);
    return res.status(500).json({
      message: "Failed generating report PDF",
      error: error.message
    });
  }
};
export const downloadEmployeeReportsExcel = async (req, res) => {
  try {
    const employeeId = req.user.id;

    // Fetch all reports for employee
    const reports = await EmployeeReport.find({ employeeId })
      .populate("campaignId", "name type")
      .populate("retailerId", "name contactNo shopDetails")
      .sort({ createdAt: -1 });

    if (!reports.length) {
      return res.status(404).json({ message: "No reports found for this employee" });
    }

    // Convert reports to Excel rows
    const data = reports.map((report) => ({
      ReportID: report._id.toString(),
      CampaignName: report.campaignId?.name || "N/A",
      CampaignType: report.campaignId?.type || "N/A",

      RetailerName: report.retailerId?.name || "N/A",
      RetailerContact: report.retailerId?.contactNo || "N/A",

      RetailerAddress: report.retailerId?.shopDetails?.shopAddress
        ? `${report.retailerId.shopDetails.shopAddress.address || ""}, ${
            report.retailerId.shopDetails.shopAddress.city || ""
          }, ${report.retailerId.shopDetails.shopAddress.state || ""}, ${
            report.retailerId.shopDetails.shopAddress.pincode || ""
          }`
        : "N/A",

      VisitType: report.visitType || "N/A",
      Attended: report.attended ? "Yes" : "No",
      NotVisitedReason: report.notVisitedReason || "N/A",

      ReportType: report.reportType || "N/A",
      Frequency: report.frequency || "N/A",

      FromDate: report.fromDate
        ? new Date(report.fromDate).toLocaleDateString()
        : "N/A",
      ToDate: report.toDate
        ? new Date(report.toDate).toLocaleDateString()
        : "N/A",

      StockType: report.stockType || "N/A",
      Brand: report.brand || "N/A",
      Product: report.product || "N/A",
      SKU: report.sku || "N/A",
      ProductType: report.productType || "N/A",
      Quantity: report.quantity || "N/A",

      Latitude: report.location?.latitude || "N/A",
      Longitude: report.location?.longitude || "N/A",

      CreatedAt: new Date(report.createdAt).toLocaleString(),
    }));

    // Convert JSON → Sheet → Workbook
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Required headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=employee_reports.xlsx"
    );
    res.setHeader("Content-Length", excelBuffer.length);

    // MUST use res.end() for Hoppscotch/Postman downloads
    return res.end(excelBuffer);

  } catch (error) {
    console.error("Excel Download Error:", error);
    return res.status(500).json({
      message: "Failed to generate Excel file",
      error: error.message,
    });
  }
};
export const getEmployeeVisitProgress = async (req, res) => {
  try {
    const employeeId = req.user.id;

    // Optional campaign filter
    const { campaignId } = req.query;

    const filter = { employeeId };

    if (campaignId) filter.campaignId = campaignId;

    const visits = await VisitSchedule.find(filter).lean();

    if (!visits.length) {
      return res.status(200).json({
        message: "No visit schedules found",
        progress: {
          total: 0,
          completed: 0,
          missed: 0,
          cancelled: 0,
          pending: 0,
          progressPercent: 0
        },
        visits: []
      });
    }

    /* ===========================
       🔥 Calculate progress
    =========================== */

    const total = visits.length;
    const completed = visits.filter(v => v.status === "Completed").length;
    const missed = visits.filter(v => v.status === "Missed").length;
    const cancelled = visits.filter(v => v.status === "Cancelled").length;
    const pending = visits.filter(v => v.status === "Scheduled").length;

    const progressPercent = total > 0 
      ? Math.round((completed / total) * 100)
      : 0;

    /* ===========================
       🔥 Send response
    =========================== */

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
    console.error("Visit progress error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
/* ======================================================
   GET LOGGED-IN EMPLOYEE PROFILE
====================================================== */
export const getEmployeeProfile = async (req, res) => {
  try {
    const employeeId = req.user.id; // Extract employee ID from JWT

    const employee = await Employee.findById(employeeId)
      .select(
        `
        -password
        -files.aadhaarFront.data
        -files.aadhaarBack.data
        -files.panCard.data
        -files.familyPhoto.data
        -files.bankProof.data
        -files.esiForm.data
        -files.pfForm.data
        -files.employmentForm.data
        -files.cv.data
        `
      )
      .lean();

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    return res.status(200).json({
      message: "Employee profile fetched successfully",
      employee,
    });

  } catch (error) {
    console.error("❌ Get employee profile error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
