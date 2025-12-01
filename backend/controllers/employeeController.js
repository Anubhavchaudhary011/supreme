/* ======================================================
   GET EMPLOYEE PROFILE
====================================================== */
export const getEmployeeProfile = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const employee = await Employee.findById(employeeId)
      .select("-password -files.aadhaarFront.data -files.aadhaarBack.data -files.panCard.data -files.familyPhoto.data -files.bankProof.data -files.esiForm.data -files.pfForm.data -files.employmentForm.data -files.cv.data")
      .lean();

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({
      message: "Employee profile fetched successfully",
      employee
    });

  } catch (error) {
    console.error("Get employee profile error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
