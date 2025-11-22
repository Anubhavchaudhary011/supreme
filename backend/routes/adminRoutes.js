import express from "express";
import multer from "multer";
import {
  loginAdmin,
  addAdmin,
  addClientAdmin,
  addClientUser,
  loginClientAdmin,
  registerRetailer,
  forgotPassword,
  resetPassword,
  protect,
  updateCampaignStatus,
  addCampaign,
  getAllCampaigns,
  deleteCampaign,
  assignCampaign,
  updateCampaignPayment,
  getSingleAdminJob,
  addEmployee,
  bulkAddEmployees,
  getAllEmployees,
  getAllRetailers,
  updateJobPosting,
  getAdminJobs,
  createJobPosting,
  getJobApplications,
  updateApplicationStatus,
  getCandidateResume,
updateCampaign,
changeEmployeeStatus,
  updateRetailerDates,
  updateEmployeeDates
} from "../controllers/adminController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.put("/campaigns/:id", protect, updateCampaign);

router.post("/login", loginAdmin);
router.post("/add-admin", protect, addAdmin);
router.post("/add-client-admin", protect, addClientAdmin);
router.post("/add-client-user", protect, addClientUser);
router.post("/client-admin-login", loginClientAdmin);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.post("/employees", protect, addEmployee);
router.post(
  "/employees/bulk",
  protect,
  upload.single("file"),   // file key MUST be "file"
  bulkAddEmployees
);

router.get("/employees", protect, getAllEmployees);

router.get("/retailers", protect, getAllRetailers);
router.post(
  "/retailers",
  protect,
  upload.fields([
    { name: "govtIdPhoto", maxCount: 1 },
    { name: "personPhoto", maxCount: 1 },
    { name: "signature", maxCount: 1 },
    { name: "outletPhoto", maxCount: 1 },
  ]),
  registerRetailer
);
router.put("/employee/status", protect, changeEmployeeStatus);

router.post("/campaigns", protect, addCampaign);
router.get("/campaigns", protect, getAllCampaigns);
router.delete("/campaigns/:id", protect, deleteCampaign);
router.post("/campaigns/assign", protect, assignCampaign);
router.post("/campaigns/payment", protect, updateCampaignPayment);
router.get("/admin/career/jobs/:id", protect, getSingleAdminJob);
router.patch("/campaigns/:id/status", protect, updateCampaignStatus);

router.post("/jobs", protect, createJobPosting);
router.get("/jobs", protect, getAdminJobs);
router.get("/applications", protect, getJobApplications);
router.put("/applications/:id/status", protect, updateApplicationStatus);
router.get("/applications/:id/resume", protect, getCandidateResume);
router.get("/career/jobs/:id", protect, getSingleAdminJob);
router.put("/jobs/:id", protect, updateJobPosting);

// ===========================================
//  NEW ROUTES TO UPDATE DATES (NO OTHER CHANGE)
// ===========================================
router.patch(
  "/campaigns/:campaignId/retailer/:retailerId/dates",
  protect,
  updateRetailerDates
);

router.patch(
  "/campaigns/:campaignId/employee/:employeeId/dates",
  protect,
  updateEmployeeDates
);

// ===========================================
export default router;
