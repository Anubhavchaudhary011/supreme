import express from "express";
import {
  loginEmployee,
  getEmployeeCampaigns,
  updateCampaignStatus,
  updateEmployeeProfile,
  clientSetPaymentPlan,
   submitEmployeeReport,
   getEmployeeReports,
     downloadEmployeeReport,
     getEmployeeVisitProgress,
     downloadEmployeeReportsExcel,
    getEmployeeProfile,
  getAssignedRetailersForEmployee,
   getLastVisitDetails,
   getScheduleReportMapping,

  getAllVisitSchedulesForEmployee
} from "../controllers/employeeController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js"; 
const router = express.Router();

/* ================================
   EMPLOYEE ROUTES
================================ */

// 🔹 Employee login
router.post("/employee/login", loginEmployee);

// 🔹 Complete / Update profile (multipart with memory storage)
router.put(
  "/employee/profile",
  protect,
  upload.fields([
    { name: "aadhaarFront", maxCount: 1 },
    { name: "aadhaarBack", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "personPhoto", maxCount: 1 },
    { name: "familyPhoto", maxCount: 1 },
    { name: "bankProof", maxCount: 1 },
    { name: "esiForm", maxCount: 1 },
    { name: "pfForm", maxCount: 1 },
    { name: "employmentForm", maxCount: 1 },
    { name: "cv", maxCount: 1 },
  ]),
  updateEmployeeProfile
);
router.get("/assigned-retailers", protect, getAssignedRetailersForEmployee);
// 🔹 Get assigned campaigns
router.get("/employee/campaigns", protect, getEmployeeCampaigns);

// 🔹 Update campaign status
router.put("/employee/campaigns/:campaignId/status", protect, updateCampaignStatus);

// 🔹 Client sets payment plan
router.post("/client/campaigns/payment", protect, clientSetPaymentPlan);
router.post(
  "/reports/submit",
  protect,
  upload.fields([
    { name: "images", maxCount: 20 },
    { name: "billCopy", maxCount: 5 }
  ]),
  submitEmployeeReport
);

router.get("/reports", protect, getEmployeeReports);
router.post(
  "/report/download",
  protect,
  downloadEmployeeReport
);
router.get("/reports/download/excel", protect, downloadEmployeeReportsExcel);
// 🔹 Get employee visit progress (Scheduled / Completed / Missed / Cancelled)
router.get(
  "/employee/visit-progress",
  protect,
  getEmployeeVisitProgress
);

router.get("/profile", protect, getEmployeeProfile);
router.get("/last-visit-details", protect, getLastVisitDetails);
router.get(
  "/schedules/all",
  protect,
  getAllVisitSchedulesForEmployee
);
router.get(
  "/employee/schedule-report-mapping",
  protect,
  getScheduleReportMapping
);

export default router;
