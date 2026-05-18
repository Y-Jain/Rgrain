import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import CryptoJS from 'crypto-js';
import validator from 'validator';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-at-least-32-chars-long';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-encryption-key-32-chars-long';
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');

// Password Hashing
export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};

// Sensitive Data Encryption (AES-256)
export const encryptData = (data: string) => {
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
};

export const decryptData = (ciphertext: string) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Input Sanitization
export const sanitizeInput = (input: string) => {
  if (typeof input !== 'string') return input;
  return validator.escape(validator.trim(input));
};

// Rate Limiting (Simple In-Memory for demonstration, use Redis/DB for production)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

export const checkRateLimit = (ip: string, limit: number = 5, windowMs: number = 60000) => {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, lastReset: now };

  if (now - record.lastReset > windowMs) {
    record.count = 1;
    record.lastReset = now;
  } else {
    record.count++;
  }

  rateLimitMap.set(ip, record);
  return record.count <= limit;
};

// Audit Logging
import db from '@/lib/db';

export const logAudit = async (userId: string, action: string, details: string, severity: 'low' | 'medium' | 'high' = 'low') => {
  try {
    await db('audit_logs').insert({
      user_id: userId,
      action,
      details,
      severity,
      created_at: new Date()
    });
  } catch (error) {
    console.error('Audit Log Error:', error);
  }
};
