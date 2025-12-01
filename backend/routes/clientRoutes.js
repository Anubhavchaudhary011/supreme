import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  loginClientAdmin,
  loginClientUser,
  clientSetPaymentPlan,
  getAllEmployeeReportsForClient,
   getClientCampaigns,
   getClientCampaignPayments,
    getClientReportedOutlets
} from "../controllers/clientController.js";

const router = express.Router();

// CLIENT LOGIN
router.post("/admin/login", loginClientAdmin);
router.post("/user/login", loginClientUser);
router.get("/client/campaigns", protect, getClientCampaigns);

// CLIENT PAYMENT PLAN
router.post("/campaigns/payment", protect, clientSetPaymentPlan);
router.get(
  "/client/reports",
  protect,
  getAllEmployeeReportsForClient
);
router.get("/client/payments", protect, getClientCampaignPayments);
router.get("/client/reported-outlets", protect, getClientReportedOutlets);

export default router;
