
// routes/contactUsRoutes.js
/* import express from "express";
import { sendOtp, verifyOtp } from "../controllers/contactuscontroller.js";


const router = express.Router(); */
/* 
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
 */
/* export default router; */
import express from "express";
import { contactUs } from "../controllers/contactuscontroller.js";

const router = express.Router();

router.post("/send", contactUs);

export default router;

