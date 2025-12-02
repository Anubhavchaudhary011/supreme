
import nodemailer from "nodemailer";
export const contactUs = async (req, res) => {
  try {
    const { fullName, city, phone, email, subject, message } = req.body;

    // Validate all fields
    if (!fullName || !email || !phone || !city || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const managerEmail = "manager@conceptpromotions.in";

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // -------------------------------
    // 1️⃣ EMAIL TO MANAGER
    // -------------------------------
    const managerHtml = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>City:</strong> ${city}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong><br>${message}</p>
      <hr/>
      <p style="color:gray;">This message was submitted through the website contact form.</p>
    `;

    await transporter.sendMail({
      from: `"Contact Us" <${process.env.EMAIL_USER}>`,
      to: managerEmail,
      replyTo: email,
      subject: `New Contact Query - ${subject}`,
      html: managerHtml,
    });

    // -------------------------------
    // 2️⃣ EMAIL TO USER (Confirmation)
    // -------------------------------
    const userHtml = `
      <h3>Hello ${fullName},</h3>
      <p>Thank you for contacting Concept Promotions. We have received your message and our team will get back to you shortly.</p>

      <h4>Your Submitted Details:</h4>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong><br>${message}</p>

      <br />
      <p>Regards,<br/>Concept Promotions Team</p>
    `;

    await transporter.sendMail({
      from: `"Contact Us" <${process.env.EMAIL_USER}>`,
      to: email, // user receives confirmation
      subject: `We Received Your Query - ${subject}`,
      html: userHtml,
    });

    // Response to frontend
    return res.status(200).json({
      success: true,
      message: "Your message has been sent successfully!",
    });

  } catch (err) {
    console.error("Contact Form Error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
      error: err.message,
    });
  }
};
