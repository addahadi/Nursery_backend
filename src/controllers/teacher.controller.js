import sql from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import * as teacherService from '../service/teacher.service.js';

export const viewChildrenList = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const children = await teacherService.getChildrenByTeacher(teacherId);
    res.json(children);
  } catch (error) {
    next(error);
  }
};

export const createChildReport = async (req, res) => {
  try {
    const teacherId = req.user.id;
    await teacherService.createChildReport({
      teacherId,
      ...req.body,
    });
    res.status(201).json({ message: 'Report created ' });
  } catch (err) {
    next(error);
  }
};

/**
 * Controller لإضافة media
 */

export const addActivityMedia = async (req, res, next) => {
  try {
    await teacherService.addActivityMedia({
      name: req.name,
      file_path: req.file_path,
      description: req.description,
      date: req.date,
      classroomId: req.classroomId,
    });
    res.status(201).json({ message: 'Activity media added successfully' });
  } catch (err) {
    next(error);
  }
};
