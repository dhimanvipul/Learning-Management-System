const Section = require("./section.model");
const { success, error } = require("../../utils/apiResponse");

exports.createSection = async (req, res) => {
  try {
    const section = await Section.create(req.body);
    success(res, section, 201);
  } catch (err) {
    error(res, err.message, 400);
  }
};

const mongoose = require("mongoose");

exports.getSectionsByCourse = async (req, res) => {
  try {
    const sections = await Section.find({ courseId: req.params.courseId }).sort({ order: 1 });
    success(res, sections);
  } catch (err) {
    error(res, err.message, 500);
  }
};

exports.updateSection = async (req, res) => {
  try {
    const section = await Section.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    success(res, section);
  } catch (err) {
    error(res, err.message, 400);
  }
};

exports.deleteSection = async (req, res) => {
  try {
    await Section.findByIdAndDelete(req.params.id);

    success(res, {
      message: "Section deleted",
    });
  } catch (err) {
    error(res, err.message, 400);
  }
};