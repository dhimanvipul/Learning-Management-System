const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("./payment.model");
const Enrollment = require("../enrollments/enrollment.model");
const Course = require("../courses/course.model");
const Student = require("../students/student.model");
const { success, error } = require("../../utils/apiResponse");
const { notifyAdmins, notifyCourseInstructor, notifyUserByEmail } = require("../../utils/notificationHelper");

const triggerPaymentSuccessNotifications = async (payment) => {
  try {
    const student = await Student.findById(payment.studentId);
    const course = await Course.findById(payment.courseId);
    if (!student || !course) return;

    const amount = payment.amount;

    // 1. Notify Admins
    await notifyAdmins(
      "New Payment Received",
      `Payment of INR ${amount} received from ${student.name} for course "${course.title}".`,
      "payment",
      "/admin/payments"
    );
    await notifyAdmins(
      "New Student Enrolled",
      `Student ${student.name} has enrolled in course "${course.title}".`,
      "enrollment",
      "/admin/courses"
    );

    // 2. Notify Instructor
    await notifyCourseInstructor(
      payment.courseId,
      "New student enrolled in instructor course",
      `Student ${student.name} has enrolled in your course "${course.title}".`,
      "enrollment",
      "/instructor/students"
    );

    // 3. Notify Student
    await notifyUserByEmail(
      student.email,
      "Payment Successful",
      `Your payment of INR ${amount} for "${course.title}" was successful.`,
      "payment",
      "/student/my-courses"
    );
    await notifyUserByEmail(
      student.email,
      "Enrollment Successful",
      `You have successfully enrolled in "${course.title}".`,
      "enrollment",
      "/student/my-courses"
    );

  } catch (err) {
    console.error("Error sending success notifications:", err.message);
  }
};

// Initialize Razorpay helper
const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return null;
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

exports.createOrder = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    if (!studentId || !courseId) {
      return error(res, "studentId & courseId are required", 400);
    }

    const student = await Student.findById(studentId);
    const course = await Course.findById(courseId);
    if (!student || !course) {
      return error(res, "Student or Course not found", 404);
    }

    const amount = course.price > 0 ? course.price : 1; // Default to 1 INR if free/missing
    const amountInPaise = Math.round(amount * 100);

    const rzp = getRazorpay();
    let orderId = "";
    let isMock = false;

    if (rzp) {
      const options = {
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_c_${courseId.toString().slice(-6)}_${Date.now()}`,
      };
      const order = await rzp.orders.create(options);
      orderId = order.id;
    } else {
      // Fallback sandbox simulation order
      orderId = `order_mock_${crypto.randomBytes(6).toString("hex")}`;
      isMock = true;
    }

    // Save in DB
    const payment = await Payment.create({
      studentId,
      courseId,
      orderId,
      amount,
      status: "created",
    });

    return success(res, {
      payment,
      orderId,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
      amount: amountInPaise,
      currency: "INR",
      isMock,
    }, 201);
  } catch (e) {
    console.error(e);
    return error(res, e.message, 400);
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id) {
      return error(res, "razorpay_order_id is required", 400);
    }

    // Find local payment record
    const payment = await Payment.findOne({ orderId: razorpay_order_id });
    if (!payment) {
      return error(res, "Order record not found", 404);
    }

    const isMockOrder = razorpay_order_id.startsWith("order_mock_");
    let verified = false;

    if (isMockOrder) {
      // Mock mode: auto-verify
      verified = true;
    } else {
      // Real signature verification
      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!secret) {
        return error(res, "Payment keys not configured on server", 500);
      }
      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const generatedSignature = hmac.digest("hex");
      verified = generatedSignature === razorpay_signature;
    }

    if (!verified) {
      payment.status = "failed";
      await payment.save();
      return error(res, "Signature verification failed", 400);
    }

    // Update status to success
    payment.status = "success";
    payment.paymentId = razorpay_payment_id || "pmt_mock_success";
    payment.signature = razorpay_signature || "sig_mock_success";
    await payment.save();

    // Check if enrollment already exists
    let enrollment = await Enrollment.findOne({
      studentId: payment.studentId,
      courseId: payment.courseId,
    });

    if (!enrollment) {
      const course = await Course.findById(payment.courseId).populate("instructorId");
      enrollment = await Enrollment.create({
        studentId: payment.studentId,
        courseId: payment.courseId,
        instructorId: course?.instructorId?._id || null,
        status: "approved",
        progress: 0,
      });
    }

    // Trigger real-time notifications
    triggerPaymentSuccessNotifications(payment);

    return success(res, {
      message: "Payment successfully verified and enrollment unlocked!",
      enrollment,
    });
  } catch (e) {
    console.error(e);
    return error(res, e.message, 400);
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Optional verification of webhook
    if (signature && webhookSecret) {
      const shasum = crypto.createHmac("sha256", webhookSecret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest("hex");
      if (digest !== signature) {
        return res.status(400).send("Invalid webhook signature");
      }
    }

    const event = req.body.event;
    if (event === "payment.captured" || event === "order.paid") {
      const orderId = req.body.payload?.payment?.entity?.order_id || req.body.payload?.order?.entity?.id;
      if (orderId) {
        const payment = await Payment.findOne({ orderId });
        if (payment && payment.status !== "success") {
          payment.status = "success";
          payment.paymentId = req.body.payload?.payment?.entity?.id || "";
          await payment.save();

          // Create enrollment if missing
          const existing = await Enrollment.findOne({
            studentId: payment.studentId,
            courseId: payment.courseId,
          });

          if (!existing) {
            const course = await Course.findById(payment.courseId).populate("instructorId");
            await Enrollment.create({
              studentId: payment.studentId,
              courseId: payment.courseId,
              instructorId: course?.instructorId?._id || null,
              status: "approved",
              progress: 0,
            });
          }

          // Trigger notifications
          triggerPaymentSuccessNotifications(payment);
        }
      }
    }

    // Always respond 200 OK to Razorpay
    return res.status(200).json({ status: "ok" });
  } catch (e) {
    console.error("Webhook processing error:", e.message);
    return res.status(500).json({ error: e.message });
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("studentId", "name email")
      .populate("courseId", "title price")
      .sort({ createdAt: -1 });
    return success(res, payments);
  } catch (e) {
    console.error(e);
    return error(res, e.message, 500);
  }
};
