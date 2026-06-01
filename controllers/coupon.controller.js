const couponService = require("../services/coupon.services");

const validateCoupon = async (req, res) => {
  try {
    const { code, totalAmount } = req.body;
    const result = await couponService.validateCoupon(code, totalAmount);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const adminGetAllCoupons = async (req, res) => {
  try {
    const coupons = await couponService.getAllCoupons();
    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminCreateCoupon = async (req, res) => {
  try {
    const coupon = await couponService.createCoupon(req.body);
    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const adminUpdateCoupon = async (req, res) => {
  try {
    const coupon = await couponService.updateCoupon(req.params.id, req.body);
    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const adminDeleteCoupon = async (req, res) => {
  try {
    await couponService.deleteCoupon(req.params.id);
    res.status(200).json({ success: true, message: "Coupon deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  validateCoupon,
  adminGetAllCoupons,
  adminCreateCoupon,
  adminUpdateCoupon,
  adminDeleteCoupon,
};
