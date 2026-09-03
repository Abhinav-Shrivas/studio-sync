'use strict';

const bookingService = require('../services/booking.service');

async function create(req, res, next) {
  try {
    const result = await bookingService.createBooking(req.body, req.user);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const result = await bookingService.cancelBooking(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function settle(req, res, next) {
  try {
    const result = await bookingService.settleAttendance(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function addNote(req, res, next) {
  try {
    const result = await bookingService.addStaffNote(req.params.id, req.body, req.user);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getTimeline(req, res, next) {
  try {
    const result = await bookingService.getBookingTimeline(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const result = await bookingService.getBookingById(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  cancel,
  settle,
  addNote,
  getTimeline,
  getById,
};
