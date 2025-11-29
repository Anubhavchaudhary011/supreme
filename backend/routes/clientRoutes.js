import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  loginClientAdmin,
  loginClientUser,
  clientSetPaymentPlan,
  getAllEmployeeReportsForClient
} from "../controllers/clientController.js";

const router = express.Router();

// CLIENT LOGIN
router.post("/admin/login", loginClientAdmin);
router.post("/user/login", loginClientUser);

// CLIENT PAYMENT PLAN
router.post("/campaigns/payment", protect, clientSetPaymentPlan);
router.get(
  "/client/reports",
  protect,
  getAllEmployeeReportsForClient
);
export default router;
