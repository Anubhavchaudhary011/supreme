import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema, model  ,Types } = mongoose;

/* ===============================
   STATE CODE MAP
=============================== */
const stateCodes = {
  "Andhra Pradesh": "AP",
  "Arunachal Pradesh": "AR",
  Assam: "AS",
  Bihar: "BR",
  Chhattisgarh: "CG",
  Goa: "GA",
  Gujarat: "GJ",
  Haryana: "HR",
  "Himachal Pradesh": "HP",
  Jharkhand: "JH",
  Karnataka: "KA",
  Kerala: "KL",
  "Madhya Pradesh": "MP",
  Maharashtra: "MH",
  Manipur: "MN",
  Meghalaya: "ML",
  Mizoram: "MZ",
  Nagaland: "NL",
  Odisha: "OD",
  Punjab: "PB",
  Rajasthan: "RJ",
  Sikkim: "SK",
  "Tamil Nadu": "TN",
  Telangana: "TS",
  Tripura: "TR",
  "Uttar Pradesh": "UP",
  Uttarakhand: "UK",
  "West Bengal": "WB",
  "Andaman and Nicobar Islands": "AN",
  Chandigarh: "CH",
  "Dadra and Nagar Haveli and Daman and Diu": "DN",
  Delhi: "DL",
  "Jammu and Kashmir": "JK",
  Ladakh: "LA",
  Lakshadweep: "LD",
  Puducherry: "PY",
};

/* ===============================
   ADMIN SCHEMA
=============================== */
const adminSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // 🔒 For password reset functionality
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);
export const Admin = model("Admin", adminSchema);

/* ===============================
   CLIENT ADMIN SCHEMA
=============================== */
const clientAdminSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    contactNo: String,
    password: { type: String, required: true },
    organizationName: { type: String, required: true },

    // 🔥 MULTIPLE STATES (matches states.map())
    states: [
      {
        type: String,
        required: true,
      }
    ],

    // 🔥 MULTIPLE REGIONS (matches regions.map())
    regions: [
      {
        type: String,

      }
    ],

    // 🔥 JOB ROLE (matches role.value)
    role: {
      type: String,
      required: true,
    },

    registrationDetails: {
      username: { type: String, required: true },
      password: { type: String, required: true }
    }
  },
  { timestamps: true }
);

export const ClientAdmin = model("ClientAdmin", clientAdminSchema);


/* ===============================
   CLIENT USER SCHEMA
=============================== */
const clientUserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    contactNo: String,
    password: { type: String, required: true },
    roleProfile: {
      type: String,
      enum: ["National", "Regional", "State", "Key Account"],
    },
    parentClientAdmin: { type: Schema.Types.ObjectId, ref: "ClientAdmin" },
  },
  { timestamps: true }
);
export const ClientUser = model("ClientUser", clientUserSchema);

/* ===============================
   RETAILER SCHEMA
=============================== */
const retailerSchema = new Schema(
  {
    uniqueId: { type: String, unique: true },
    retailerCode: { type: String, unique: true },
    name: { type: String, required: true },
    contactNo: { type: String, required: true, unique: true },
    email: String,

    
    password: { type: String, required: true },

    gender: { type: String, enum: ["Male", "Female", "Other","Prefer not to say"] },
    govtIdType: String,
    govtIdNumber: String,
    govtIdPhoto: { data: Buffer, contentType: String },
    personPhoto: { data: Buffer, contentType: String },
    registrationForm: { data: Buffer, contentType: String },

    shopDetails: {
      shopName:{ type:String , required:true},
      businessType:{ type:String ,required:true},
      ownershipType: String,
      GSTNo: String,
      PANCard:{ type:String , required:true},
      outletPhoto: { data: Buffer, contentType: String },
      shopAddress: {
        address:{ type:String , required:true},
        address2: String,
        city: { type:String , required:true},
        state:{ type:String , required:true},
        pincode: { type:String , required:true},
      },
    },

    bankDetails: {
      bankName: { type:String , required:true},
      accountNumber: { type:String , required:true},
      IFSC:{ type:String , required:true},
      branchName: { type:String , required:true},
    },

    createdBy: {
      type: String,
      enum: ["RetailerSelf", "Employee", "AdminAdded"],
      default: "RetailerSelf",
    },

    phoneVerified: { type: Boolean, default: false },

    assignedCampaigns: [
      {
        type: Schema.Types.ObjectId,
        ref: "Campaign",
      },
    ],

    assignedEmployee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },

    partOfIndia: { type: String, default: "N" },
  },
  { timestamps: true }
);

export const Retailer = model("Retailer", retailerSchema);

/* ===============================
   EMPLOYEE SCHEMA
=============================== */
const employeeSchema = new Schema(
  {
    // -------- Basic Account Info (set by Admin) --------
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String },
    isFirstLogin: { type: Boolean, default: true },

    position: { type: String, required: false },
    personPhoto: { data: Buffer, contentType: String },
    isActive: {
      type: Boolean,
      default: true, // every new employee is active
    },

    employeeId: {
      type: String,
      unique: true,
    },

    // Linked organization/admin
    organization: { type: Schema.Types.ObjectId, ref: "ClientAdmin" },
    createdByAdmin: { type: Schema.Types.ObjectId, ref: "Admin" },

    // -------- Employee Type --------
    employeeType: {
      type: String,
      enum: ["Permanent", "Contractual"],
      required: false,
    },

    // -------- Personal Details --------
    gender: String,
    dob: Date,
    highestQualification: String,
    maritalStatus: String,
    fathersName: String,
    fatherDob: Date,
    motherName: String,
    motherDob: Date,
    spouseName: String,
    spouseDob: Date,
    child1Name: String,
    child1Dob: Date,
    child2Name: String,
    child2Dob: Date,
    alternatePhone: String,

    // -------- Address Details --------
    correspondenceAddress: {
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pincode: String,
    },
    permanentAddress: {
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pincode: String,
    },

    // -------- Identification Details --------
    aadhaarNumber: String,
    panNumber: String,
    uanNumber: String,
    esiNumber: String,
    pfNumber: String,
    esiDispensary: String,

    // -------- Bank Details --------
    bankDetails: {
      accountNumber: String,
      ifsc: String,
      bankName: String,
      branchName: String,
    },

    // -------- Contractual Specific --------
    contractLength: String,

    // -------- Work Experience --------
    experiences: [
      {
        organization: String,
        designation: String,
        from: Date,
        to: Date,
        currentlyWorking: { type: Boolean, default: false },
      },
    ],

    // -------- Uploaded Files --------
    files: {
      aadhaarFront: { data: Buffer, contentType: String },
      aadhaarBack: { data: Buffer, contentType: String },
      panCard: { data: Buffer, contentType: String },
      personPhoto: { data: Buffer, contentType: String },
      familyPhoto: { data: Buffer, contentType: String },
      bankProof: { data: Buffer, contentType: String },
      esiForm: { data: Buffer, contentType: String },
      pfForm: { data: Buffer, contentType: String },
      employmentForm: { data: Buffer, contentType: String },
      cv: { data: Buffer, contentType: String },
    },

    // -------- Campaign Assignment --------
    assignedCampaigns: [
      {
        type: Schema.Types.ObjectId,
        ref: "Campaign",
      },
    ],
  },
  { timestamps: true }
);

// ------------------------------------------------------
// 🔥 Auto-generate employeeId (4 letters + 5 digits)
// ------------------------------------------------------
employeeSchema.pre("save", function (next) {
  if (!this.employeeId) {
    // Generate 4 random uppercase alphabets
    const letters = Array.from({ length: 4 }, () =>
      String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join("");

    // Generate 5 random numbers
    const numbers = Math.floor(10000 + Math.random() * 90000);

    // Final employee ID
    this.employeeId = `${letters}${numbers}`;
  }

  next();
});

const reportFileSchema = new mongoose.Schema({
  data: Buffer,
  contentType: String,
});
const employeeReportSchema = new Schema(
  {
    employeeId: { type: Types.ObjectId, ref: "Employee", required: true },
    campaignId: { type: Types.ObjectId, ref: "Campaign", required: true },
    retailerId: { type: Types.ObjectId, ref: "Retailer", required: true },

    visitType: String,
    attended: String,
    notVisitedReason: String,
    otherReasonText: String,

    reportType: String,
    frequency: String,
    fromDate: Date,
    toDate: Date,
    extraField: String,

    stockType: String,
    brand: String,
    product: String,
    sku: String,
    productType: String,
    quantity: Number,

    // Geo Tag
    location: {
      latitude: Number,
      longitude: Number,
    },

    images: [
      {
        data: Buffer,
        contentType: String,
        fileName: String,
      },
    ],

    billCopy: {
      data: Buffer,
      contentType: String,
      fileName: String,
    },
  },
  { timestamps: true }
);

export const EmployeeReport = model("EmployeeReport", employeeReportSchema);

/* ===========================
   PASSWORD HASH MIDDLEWARE
=========================== */
employeeSchema.pre("save", async function (next) {
  try {
    // Auto-hash password only when employee is newly created
    if (this.isNew && this.phone) {
      this.password = await bcrypt.hash(this.phone.toString(), 10);
      this.isFirstLogin = true;
    }
    next();
  } catch (err) {
    next(err);
  }
});

/* ===========================
   EXPORT MODEL
=========================== */
export const Employee = model("Employee", employeeSchema);
/* ===============================
   CAMPAIGN SCHEMA
=============================== */
const campaignSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    client: { type: String, required: true, trim: true },

    type: {
      type: String,
      enum: ["Retailer Enrolment", "Display Payment", "Incentive Payment", "Others"],
      required: true,
    },

 regions: [
  {
    type: String,
    enum: ["North", "South", "East", "West", "All"],
    required: true,
  }
],

states: [
  {
    type: String,
    required: true,
  }
],

    createdBy: { type: Types.ObjectId, ref: "Admin", required: true },

    // ---------------------------
    // CAMPAIGN LEVEL DATE RANGE
    // ---------------------------
    campaignStartDate: { type: Date, required: true },
    campaignEndDate: { type: Date, required: true },

    // Campaign Active Status
    isActive: { type: Boolean, default: true },

    // ---------------------------
    // ASSIGNED RETAILERS
    // ---------------------------
    assignedRetailers: [
      {
        retailerId: { type: Types.ObjectId, ref: "Retailer", required: true },

        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },

        // Automatic timestamps
        assignedAt: { type: Date, default: Date.now },
        updatedAt: { type: Date },

        // Each retailer can have their own date range
        startDate: { type: Date },  // optional override
        endDate: { type: Date },    // optional override
      },
    ],

    // ---------------------------
    // ASSIGNED EMPLOYEES
    // ---------------------------
    assignedEmployees: [
      {
        employeeId: { type: Types.ObjectId, ref: "Employee" },

        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },

        assignedAt: { type: Date, default: Date.now },
        updatedAt: { type: Date },

        // Optional employee-specific date override
        startDate: { type: Date },
        endDate: { type: Date },
      },
    ],
  },
  { timestamps: true }
);



const paymentSchema = new mongoose.Schema(
  {
    retailer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Retailer",
      required: true,
    },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    remainingAmount: {
      type: Number,
      default: function () {
        return this.totalAmount - this.amountPaid;
      },
    },
    // Track all UTR numbers as an array
    utrNumbers: [
      {
        utrNumber: { type: String, required: true },
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, // or ClientAdmin
      },
    ],
    paymentStatus: {
      type: String,
      enum: ["Pending", "Partially Paid", "Completed"],
      default: "Pending",
    },
    lastUpdatedByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin", // admin who last updated
    },
  },
  { timestamps: true }
);

/* ===============================
   CAREER APPLICATION SCHEMA (UPDATED)
=============================== */
/* ===============================
   CAREER APPLICATION SCHEMA (Candidate)
=============================== */
const careerApplicationSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    city: { type: String, required: true },
    resume: {
      data: Buffer,
      contentType: String,
      fileName: String,
    },
  },
  { timestamps: true }
);

export const CareerApplication = mongoose.model("CareerApplication", careerApplicationSchema);


/* ===============================
   JOB SCHEMA
=============================== */
const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    salaryRange: { type: String },
    experienceRequired: { type: String },
    employmentType: {
      type: String,
      enum: ["Full-Time", "Part-Time", "Contract-Based"],
      
      required: true
    }
    ,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);


export const Job = mongoose.model("Job", jobSchema);


/* ===============================
   JOB APPLICATION SCHEMA (Tracks each job application)
=============================== */
const jobApplicationSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareerApplication",
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Under Review", "Shortlisted", "Rejected", "Selected"],
      default: "Pending",
    },
    totalRounds: { type: Number, default: 1 },
    currentRound: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const JobApplication = mongoose.model("JobApplication", jobApplicationSchema);


export default mongoose.model("Payment", paymentSchema);


export const Payment = mongoose.model("Payment", paymentSchema);
export const Campaign = model("Campaign", campaignSchema);



