import sql from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { useReducer } from 'react';
import { es } from 'zod/locales';
//import teacherService from '../service/teacher.service.js';

export const Login = async (req, res, next) => {
  const body = req.body;
  try {
    const user = await sql`
        SELECT * FROM users WHERE email = ${body.email} AND role = 'teacher'`;
    if (user.length === 0) {
      return res.status(401).json({
        message: ' you dont have a compte in oure web site',
      });
    }
    const isPasswordValid = await bcrypt.compare(body.password, user[0].password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }
    const token = jwt.sign(
      {
        userId: user[0].id,
        role: user[0].role,
      },

      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
      }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(error);
  }
};

// 1️⃣ مشاهدة قائمة الأطفال

export const viewChildrenList = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const children = await teacherService.getChildrenByTeacher(teacherId);
    res.json(children);
  } catch (error) {
    next(error);
  }
};

// 3️⃣ رفع تقرير
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
