import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";


// Automatically load environment variables from .env if present
const ENV_FILE_PATH = path.join(process.cwd(), ".env");
if (fs.existsSync(ENV_FILE_PATH)) {
  try {
    const envLines = fs.readFileSync(ENV_FILE_PATH, "utf-8").split("\n");
    envLines.forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || "").trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        if (val && !process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  } catch (e) {}
}

// Ensure data persistence directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const INTENTS_FILE = path.join(DATA_DIR, "intents.json");
const DELETED_INTENTS_FILE = path.join(DATA_DIR, "deleted_intents.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const AUDIT_FILE = path.join(DATA_DIR, "audit_logs.json");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const ADS_FILE = path.join(DATA_DIR, "ads.json");
const JOB_PORTAL_FILE = path.join(DATA_DIR, "job_portal.json");

// Clean empty data arrays for fresh original user uploads
const INITIAL_SEEDS: any[] = [];
const INITIAL_ADS: any[] = [];
const INITIAL_JOB_PORTAL: any[] = [];


function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.warn(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Initialize seed data if file doesn't exist
if (!fs.existsSync(INTENTS_FILE)) {
  writeJsonFile(INTENTS_FILE, INITIAL_SEEDS);
}
if (!fs.existsSync(ADS_FILE)) {
  writeJsonFile(ADS_FILE, INITIAL_ADS);
}
if (!fs.existsSync(JOB_PORTAL_FILE)) {
  writeJsonFile(JOB_PORTAL_FILE, INITIAL_JOB_PORTAL);
}


async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global CORS Middleware (Essential for APK WebViews & Cross-Device Access)
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Parse JSON bodies
  app.use(express.json({ limit: '20mb' }));

  // Health Check Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ==========================================
  // MULTI-DEVICE REALTIME SYNC API ROUTES
  // ==========================================


  // 1. Get All Broadcast Intents (Live across all phones)
  app.get("/api/intents", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      const deletedIds = readJsonFile<string[]>(DELETED_INTENTS_FILE, []);

      // Fetch local intents
      const localIntents = readJsonFile<any[]>(INTENTS_FILE, INITIAL_SEEDS);
      
      const map = new Map<string, any>();
      localIntents.forEach(i => {
        if (!deletedIds.includes(i.id)) map.set(i.id, i);
      });

      const combined = Array.from(map.values());
      combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      res.json(combined);
    } catch (e) {
      console.warn("Recovering from fetch intents error:", e);
      const fallbackIntents = readJsonFile<any[]>(INTENTS_FILE, INITIAL_SEEDS);
      res.json(fallbackIntents);
    }
  });

  // 2. Broadcast a New Intent
  app.post("/api/intents", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const newIntent = req.body;
      if (!newIntent || !newIntent.description) {
        return res.status(400).json({ error: "Intent description is required" });
      }

      const deletedIds = readJsonFile<string[]>(DELETED_INTENTS_FILE, []);
      if (newIntent.id && deletedIds.includes(newIntent.id)) {
        return res.status(200).json(newIntent); // Silently ignore resurrecting deleted item
      }

      const intentRecord = {
        id: newIntent.id || 'intent_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        authorId: newIntent.authorId || 'anonymous_user',
        authorName: newIntent.authorName || 'Community Member',
        description: newIntent.description.trim(),
        tags: newIntent.tags || ['#General'],
        distance: typeof newIntent.distance === 'number' ? newIntent.distance : Number((Math.random() * 0.4 + 0.1).toFixed(1)),
        status: newIntent.status || 'active',
        createdAt: newIntent.createdAt || new Date().toISOString(),
        expiresAt: newIntent.expiresAt || new Date(Date.now() + 1000 * 60 * 120).toISOString(),
        hasLocationPin: !!newIntent.hasLocationPin,
        isVerifiedUser: true
      };

      // Save to local storage file
      const intents = readJsonFile<any[]>(INTENTS_FILE, INITIAL_SEEDS);
      const updated = [intentRecord, ...intents.filter(i => i.id !== intentRecord.id && i.description !== intentRecord.description)];
      writeJsonFile(INTENTS_FILE, updated);

      console.log(`[Broadcast Created] ${intentRecord.id}: "${intentRecord.description.substring(0, 40)}..."`);
      res.status(201).json(intentRecord);
    } catch (e) {
      console.error("Failed to save intent:", e);
      res.status(500).json({ error: "Failed to save intent" });
    }
  });

  // 3. Delete or Complete an Intent
  app.delete("/api/intents/:id", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const { id } = req.params;
      const { description } = req.body || {};
      const descQuery = (req.query?.desc as string) || '';

      const intents = readJsonFile<any[]>(INTENTS_FILE, INITIAL_SEEDS);
      const targetDesc = description || descQuery;

      const filtered = intents.filter(i => {
        if (i.id === id) return false;
        if (targetDesc && i.description && i.description.trim() === targetDesc.trim()) return false;
        return true;
      });
      writeJsonFile(INTENTS_FILE, filtered);

      // Record to permanent deleted IDs list
      const deletedIds = readJsonFile<string[]>(DELETED_INTENTS_FILE, []);
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        writeJsonFile(DELETED_INTENTS_FILE, deletedIds);
      }

      console.log(`[Post Deleted Permanently] ID: ${id}, Desc: ${targetDesc || 'N/A'}`);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete intent" });
    }
  });

  // 4. Get Chat Messages for an Intent (Live multi-device chat)
  app.get("/api/intents/:id/messages", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      const { id } = req.params;
      const allMessages = readJsonFile<Record<string, any[]>>(MESSAGES_FILE, {});
      const chatMessages = allMessages[id] || [];
      res.json(chatMessages);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // 5. Send Chat Message in an Intent
  app.post("/api/intents/:id/messages", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const { id } = req.params;
      const message = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message payload required" });
      }

      const allMessages = readJsonFile<Record<string, any[]>>(MESSAGES_FILE, {});
      const chatMessages = allMessages[id] || [];
      
      const newMsg = {
        id: message.id || 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        authorId: message.authorId || 'guest',
        text: message.text || '',
        type: message.type || 'text',
        attachmentUrl: message.attachmentUrl || null,
        attachmentType: message.attachmentType || null,
        createdAt: message.createdAt || new Date().toISOString()
      };

      chatMessages.push(newMsg);
      allMessages[id] = chatMessages;
      writeJsonFile(MESSAGES_FILE, allMessages);

      res.status(201).json(newMsg);
    } catch (e) {
      console.error("Failed to save message:", e);
      res.status(500).json({ error: "Failed to save message" });
    }
  });

  // 6. Save Permanent Safety & Police Audit Logs
  app.post("/api/audit-logs", (req, res) => {
    try {
      const auditPayload = req.body;
      const logs = readJsonFile<any[]>(AUDIT_FILE, []);
      const record = {
        id: 'audit_' + Date.now(),
        receivedAt: new Date().toISOString(),
        ...auditPayload
      };
      logs.push(record);
      writeJsonFile(AUDIT_FILE, logs);
      console.log(`[Safety Audit Archived] Permanent record saved for chatId: ${auditPayload.chatId}`);
      res.status(201).json({ success: true, id: record.id });
    } catch (e) {
      res.status(500).json({ error: "Failed to save audit log" });
    }
  });

  app.get("/api/audit-logs", (req, res) => {
    try {
      const logs = readJsonFile<any[]>(AUDIT_FILE, []);
      res.json(logs);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // 7. Community Reports
  app.post("/api/reports", (req, res) => {
    try {
      const report = req.body;
      const reports = readJsonFile<any[]>(REPORTS_FILE, []);
      const record = {
        id: 'rep_' + Date.now(),
        createdAt: new Date().toISOString(),
        ...report
      };
      reports.push(record);
      writeJsonFile(REPORTS_FILE, reports);
      res.status(201).json({ success: true, id: record.id });
    } catch (e) {
      res.status(500).json({ error: "Failed to submit report" });
    }
  });

  app.get("/api/reports", (req, res) => {
    try {
      const reports = readJsonFile<any[]>(REPORTS_FILE, []);
      res.json(reports);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // ==========================================
  // AD BANNER MANAGEMENT API ROUTES
  // ==========================================

  // 8. Get All Ad Banners
  app.get("/api/ads", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      const ads = readJsonFile<any[]>(ADS_FILE, INITIAL_ADS);
      res.json(ads);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch ad banners" });
    }
  });

  // 9. Add or Update Ad Banner
  app.post("/api/ads", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const ad = req.body;
      if (!ad || !ad.businessName || !ad.offerTitle) {
        return res.status(400).json({ error: "Business name and offer title are required" });
      }

      const ads = readJsonFile<any[]>(ADS_FILE, INITIAL_ADS);
      const newAd = {
        id: ad.id || 'ad_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        businessName: ad.businessName.trim(),
        logo: ad.logo || '🏪',
        category: ad.category || 'Retail & Services',
        offerBadge: ad.offerBadge || '🔥 Special Offer',
        offerTitle: ad.offerTitle.trim(),
        description: ad.description || '',
        photoUrl: ad.photoUrl || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80',
        distance: typeof ad.distance === 'number' ? ad.distance : 0.4,
        area: ad.area || 'Local Market',
        rating: typeof ad.rating === 'number' ? ad.rating : 4.9,
        reviewCount: typeof ad.reviewCount === 'number' ? ad.reviewCount : 12,
        isVerified: true,
        destinationUrl: ad.destinationUrl || '',
        initialMessage: ad.initialMessage || `Namaste! ${ad.businessName} me aapka swagat hai. Ad offer "${ad.offerBadge}" ke baare me poochhein.`,
        createdAt: ad.createdAt || new Date().toISOString()
      };

      // If id exists, update it; otherwise prepend to list
      const existingIdx = ads.findIndex(a => a.id === newAd.id);
      let updatedAds: any[];
      if (existingIdx >= 0) {
        updatedAds = [...ads];
        updatedAds[existingIdx] = newAd;
      } else {
        updatedAds = [newAd, ...ads];
      }

      writeJsonFile(ADS_FILE, updatedAds);
      console.log(`[Ad Banner Saved] ${newAd.id}: ${newAd.businessName} (Redirection: ${newAd.destinationUrl})`);
      res.status(201).json(newAd);
    } catch (e) {
      console.error("Failed to save ad banner:", e);
      res.status(500).json({ error: "Failed to save ad banner" });
    }
  });

  // 10. Delete Ad Banner
  app.delete("/api/ads/:id", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const { id } = req.params;
      const ads = readJsonFile<any[]>(ADS_FILE, INITIAL_ADS);
      const filtered = ads.filter(a => a.id !== id);
      writeJsonFile(ADS_FILE, filtered);
      console.log(`[Ad Banner Deleted] ${id}`);
      res.json({ success: true, id });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete ad banner" });
    }
  });

  // ==========================================
  // JOB PORTAL (JOB SEEKER & EMPLOYER VACANCIES) API
  // ==========================================

  // 11. Get Job Portal items (Default: Only Approved items for public feed)
  app.get("/api/job-portal", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const { status = 'approved', type, search } = req.query;
      const items = readJsonFile<any[]>(JOB_PORTAL_FILE, INITIAL_JOB_PORTAL);

      let filtered = items;

      // Filter by approval status
      if (status !== 'all') {
        filtered = filtered.filter(i => (i.status || 'pending') === status);
      }

      // Filter by type: 'job_seeker' or 'employer_vacancy'
      if (type && type !== 'all') {
        filtered = filtered.filter(i => i.type === type);
      }

      // Filter by search query
      if (search && typeof search === 'string') {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter(i => {
          const matchName = (i.fullName || i.companyOrShopName || '').toLowerCase().includes(q);
          const matchRole = (i.headline || i.jobRole || '').toLowerCase().includes(q);
          const matchCat = (i.category || '').toLowerCase().includes(q);
          const matchArea = (i.area || i.address || '').toLowerCase().includes(q);
          const matchDesc = (i.description || '').toLowerCase().includes(q);
          const matchSkills = Array.isArray(i.skills) && i.skills.some((s: string) => s.toLowerCase().includes(q));
          return matchName || matchRole || matchCat || matchArea || matchDesc || matchSkills;
        });
      }

      // Newest submissions first
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(filtered);
    } catch (e) {
      console.error("Failed to fetch job portal items:", e);
      res.status(500).json({ error: "Failed to fetch job portal items" });
    }
  });

  // 12. Submit New Job Seeker Profile or Employer Job Vacancy
  // CRITICAL REQUIREMENT: Always saves with status: "pending" for admin verification
  app.post("/api/job-portal", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const payload = req.body;
      if (!payload || !payload.type) {
        return res.status(400).json({ error: "Invalid submission payload: type is required" });
      }

      if (payload.type === 'job_seeker' && !payload.fullName) {
        return res.status(400).json({ error: "Full Name is required for Job Seeker profile" });
      }

      if (payload.type === 'employer_vacancy' && (!payload.companyOrShopName || !payload.jobRole)) {
        return res.status(400).json({ error: "Company/Shop name and Job Role are required for Employer vacancy" });
      }

      const items = readJsonFile<any[]>(JOB_PORTAL_FILE, INITIAL_JOB_PORTAL);

      const isSeeker = payload.type === 'job_seeker';
      const idPrefix = isSeeker ? 'job_seeker_' : 'job_emp_';
      const newRecord = {
        id: payload.id || idPrefix + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        type: payload.type,
        // STRICT ENFORCEMENT: Never goes live directly, always starts as "pending"
        status: "pending",

        // Job Seeker fields
        fullName: payload.fullName?.trim() || '',
        headline: payload.headline?.trim() || (isSeeker ? `${payload.category || 'Professional'} Specialist` : ''),
        skills: Array.isArray(payload.skills) 
          ? payload.skills 
          : (typeof payload.skills === 'string' && payload.skills.trim() ? payload.skills.split(',').map((s: string) => s.trim()) : []),
        experience: payload.experience?.trim() || 'Fresher',
        expectedSalary: payload.expectedSalary?.trim() || '',
        education: payload.education?.trim() || '',

        // Employer fields
        companyOrShopName: payload.companyOrShopName?.trim() || '',
        jobRole: payload.jobRole?.trim() || '',
        vacancyType: payload.vacancyType || 'Full-Time',
        salaryOffered: payload.salaryOffered?.trim() || 'Negotiable',
        openingsCount: Number(payload.openingsCount) || 1,
        urgency: payload.urgency || 'Immediate',

        // Common details
        category: payload.category || 'Retail & Services',
        phone: payload.phone?.trim() || '',
        whatsapp: payload.whatsapp?.trim() || payload.phone?.trim() || '',
        email: payload.email?.trim() || '',
        area: payload.area?.trim() || 'Local Area',
        address: payload.address?.trim() || '',
        description: payload.description?.trim() || (isSeeker ? 'Looking for local employment opportunities.' : 'Staff required for our business.'),
        photoOrLogoUrl: payload.photoOrLogoUrl || (isSeeker 
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
          : 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80'),
        createdAt: new Date().toISOString(),
        reviewedAt: null,
        adminNotes: ''
      };

      const updated = [newRecord, ...items];
      writeJsonFile(JOB_PORTAL_FILE, updated);

      console.log(`[Job Portal Submission Pending] ${newRecord.id} (${newRecord.type}): "${newRecord.fullName || newRecord.companyOrShopName}"`);

      // Exactly matches requested response message
      return res.status(201).json({
        success: true,
        item: newRecord,
        message: "Your submission has been received and is pending admin approval. It will appear live once verified."
      });
    } catch (e) {
      console.error("Failed to save job portal entry:", e);
      res.status(500).json({ error: "Failed to save job portal entry" });
    }
  });

  // 13. Update Job Portal Status (Admin Workflow: Approve / Reject)
  app.patch("/api/job-portal/:id/status", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const { id } = req.params;
      const { status, adminNotes } = req.body;

      if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: "Valid status ('approved', 'rejected', 'pending') is required" });
      }

      const items = readJsonFile<any[]>(JOB_PORTAL_FILE, INITIAL_JOB_PORTAL);
      const targetIndex = items.findIndex(i => i.id === id);

      if (targetIndex === -1) {
        return res.status(404).json({ error: "Job portal entry not found" });
      }

      items[targetIndex].status = status;
      items[targetIndex].reviewedAt = new Date().toISOString();
      if (typeof adminNotes === 'string') {
        items[targetIndex].adminNotes = adminNotes;
      }

      writeJsonFile(JOB_PORTAL_FILE, items);

      console.log(`[Job Portal Status Updated] ${id} -> ${status.toUpperCase()}`);
      res.json({
        success: true,
        item: items[targetIndex],
        message: `Status updated to ${status}`
      });
    } catch (e) {
      console.error("Failed to update status:", e);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // 14. Delete Job Portal Entry
  app.delete("/api/job-portal/:id", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const { id } = req.params;
      const items = readJsonFile<any[]>(JOB_PORTAL_FILE, INITIAL_JOB_PORTAL);
      const filtered = items.filter(i => i.id !== id);
      writeJsonFile(JOB_PORTAL_FILE, filtered);

      console.log(`[Job Portal Entry Deleted] ${id}`);
      res.json({ success: true, id });
    } catch (e) {
      console.error("Failed to delete entry:", e);
      res.status(500).json({ error: "Failed to delete entry" });
    }
  });

  // 15. Admin Clear Dummy Data (Purges all sample seed posts so ONLY user posts are active)
  app.post("/api/admin/clear-dummy-data", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

      // Clear seed broadcasts
      const intents = readJsonFile<any[]>(INTENTS_FILE, []);
      const realIntents = intents.filter(i => 
        !i.id.startsWith('seed_') && 
        !i.id.startsWith('sample_')
      );
      writeJsonFile(INTENTS_FILE, realIntents);

      // Clear seed ads / shop listings
      const ads = readJsonFile<any[]>(ADS_FILE, []);
      const realAds = ads.filter(a => 
        !a.id.startsWith('ad_elec_') && 
        !a.id.startsWith('ad_grocery_') && 
        !a.id.startsWith('ad_auto_') && 
        !a.id.startsWith('ad_fashion_') && 
        !a.id.startsWith('ad_bakery_')
      );
      writeJsonFile(ADS_FILE, realAds);

      // Clear seed job portal items
      const jobs = readJsonFile<any[]>(JOB_PORTAL_FILE, []);
      const realJobs = jobs.filter(j => 
        !j.id.startsWith('job_emp_01') && 
        !j.id.startsWith('job_seeker_01') && 
        !j.id.startsWith('job_emp_pending_01') && 
        !j.id.startsWith('job_seeker_pending_02')
      );
      writeJsonFile(JOB_PORTAL_FILE, realJobs);

      console.log(`[ADMIN PURGE] Cleared sample seed data. Active user broadcasts: ${realIntents.length}, Shops: ${realAds.length}, Jobs: ${realJobs.length}`);

      res.json({
        success: true,
        message: "All sample/dummy seed data purged successfully! Only real user posts are now active.",
        counts: {
          broadcasts: realIntents.length,
          shops: realAds.length,
          jobs: realJobs.length
        }
      });
    } catch (e) {
      console.error("Failed to clear dummy data:", e);
      res.status(500).json({ error: "Failed to clear dummy data" });
    }
  });

  // 16. Admin Complete System Reset (Wipes all data to empty state)
  app.post("/api/admin/reset-database", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      writeJsonFile(INTENTS_FILE, []);
      writeJsonFile(ADS_FILE, []);
      writeJsonFile(JOB_PORTAL_FILE, []);
      writeJsonFile(MESSAGES_FILE, {});
      writeJsonFile(REPORTS_FILE, []);

      console.log(`[ADMIN RESET] Complete database wipe executed.`);
      res.json({
        success: true,
        message: "Database reset completed. All posts, shops, and job listings have been cleared."
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to reset database" });
    }
  });


  // ==========================================
  // REAL AUTHENTICATION & OTP DISPATCH API
  // ==========================================
  interface OtpRecord {
    code: string;
    expiresAt: number;
    attempts: number;
    type: 'mobile' | 'email';
  }
  const otpStore = new Map<string, OtpRecord>();

  // 11. Request OTP (Email or Mobile)
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { identifier, type } = req.body;
      if (!identifier) {
        return res.status(400).json({ error: "Mobile number or Email address is required" });
      }

      const cleanIdentifier = String(identifier).trim().toLowerCase();
      // Generate 6-digit random verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

      otpStore.set(cleanIdentifier, {
        code,
        expiresAt,
        attempts: 0,
        type: type === 'email' ? 'email' : 'mobile'
      });

      if (type === 'email') {
        let emailSent = false;
        let emailError = '';

        // If SMTP credentials or Gmail App Password is provided in environment
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
          try {
            const smtpPass = process.env.SMTP_PASS.replace(/\s+/g, '');
            const transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST || 'smtp.gmail.com',
              port: Number(process.env.SMTP_PORT) || 587,
              secure: Number(process.env.SMTP_PORT) === 465,
              auth: {
                user: process.env.SMTP_USER.trim(),
                pass: smtpPass
              },
              tls: {
                rejectUnauthorized: false
              }
            });

            await transporter.sendMail({
              from: `"LocoHelp Verification" <${process.env.SMTP_USER.trim()}>`,
              to: cleanIdentifier,
              subject: `Your LocoHelp Login OTP: ${code}`,
              text: `Namaste!\n\nYour LocoHelp login verification code is: ${code}\n\nThis OTP is valid for 5 minutes. Do not share this code with anyone.\n\nTeam LocoHelp`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
                  <h2 style="color: #0066FF; margin-bottom: 8px;">LocoHelp Verification</h2>
                  <p style="font-size: 14px; color: #475569;">Namaste! Use the One-Time Password (OTP) below to securely log in to LocoHelp:</p>
                  <div style="background-color: #f0f4ff; border: 2px dashed #0066FF; padding: 18px; text-align: center; border-radius: 12px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0066FF;">${code}</span>
                  </div>
                  <p style="font-size: 12px; color: #64748b;">This OTP will expire in 5 minutes. If you did not request this code, please ignore this email.</p>
                </div>
              `
            });
            emailSent = true;
          } catch (err: any) {
            console.error("Nodemailer dispatch error:", err.message);
            emailError = err.message;
          }
        }

        console.log(`[REAL OTP DISPATCH] Generated OTP for email ${cleanIdentifier}: ${code} (Sent via Nodemailer: ${emailSent})`);

        return res.json({
          success: true,
          message: emailSent 
            ? `Verification OTP sent to ${cleanIdentifier}. Please check your Inbox and Spam folder.`
            : `OTP generated for ${cleanIdentifier}.`,
          emailSent,
          devOtp: !emailSent ? code : undefined,
          expiresInSeconds: 300
        });
      } else {
        // Mobile / WhatsApp direct OTP dispatch
        const cleanNumber = cleanIdentifier.replace(/\D/g, '');
        console.log(`[REAL OTP DISPATCH] Generated OTP for mobile +91 ${cleanNumber}: ${code}`);

        let whatsappDirectSent = false;

        // Meta WhatsApp Cloud API / Twilio Direct Dispatch
        if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
          try {
            const waRes = await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: "91" + cleanNumber,
                type: "template",
                template: {
                  name: process.env.WHATSAPP_TEMPLATE_NAME || "auth_otp",
                  language: { code: "en_US" },
                  components: [
                    {
                      type: "body",
                      parameters: [{ type: "text", text: code }]
                    }
                  ]
                }
              })
            });
            if (waRes.ok) {
              whatsappDirectSent = true;
              console.log(`[DIRECT WHATSAPP OTP] Dispatched directly to +91 ${cleanNumber} via Meta API`);
            }
          } catch (err: any) {
            console.error("WhatsApp Direct API error:", err.message);
          }
        }

        const whatsappMsg = encodeURIComponent(
          `*LocoHelp Security Verification*\n\nYour One-Time Password (OTP) is: *${code}*\n\nValid for 5 minutes. Do not share this code with anyone.`
        );
        const whatsappUrl = `https://api.whatsapp.com/send?phone=91${cleanNumber}&text=${whatsappMsg}`;

        return res.json({
          success: true,
          message: whatsappDirectSent
            ? `Direct WhatsApp OTP dispatched to +91 ${cleanNumber}.`
            : `OTP generated for +91 ${cleanNumber}`,
          whatsappDirectSent,
          whatsappUrl,
          expiresInSeconds: 300
        });
      }
    } catch (e: any) {
      console.error("OTP send error:", e);
      return res.status(500).json({ error: "Failed to send OTP. Please try again." });
    }
  });

  // 12. Verify OTP (Strict server validation - Reject on wrong OTP)
  app.post("/api/auth/verify-otp", (req, res) => {
    try {
      const { identifier, code, type } = req.body;
      if (!identifier || !code) {
        return res.status(400).json({ error: "Identifier and OTP code are required" });
      }

      const cleanIdentifier = String(identifier).trim().toLowerCase();
      const cleanCode = String(code).trim();
      const record = otpStore.get(cleanIdentifier);

      if (!record) {
        return res.status(400).json({ 
          error: "No OTP was requested for this identifier or it has expired. Please request a new OTP." 
        });
      }

      if (Date.now() > record.expiresAt) {
        otpStore.delete(cleanIdentifier);
        return res.status(400).json({ error: "OTP has expired. Please request a new OTP." });
      }

      if (record.attempts >= 5) {
        otpStore.delete(cleanIdentifier);
        return res.status(400).json({ error: "Too many failed attempts. Please request a new OTP." });
      }

      // STRICT VALIDATION: Must match exact 6-digit code
      if (record.code !== cleanCode) {
        record.attempts += 1;
        return res.status(400).json({ 
          error: "गलत OTP है! (Invalid OTP). Please enter the exact code received in your message or email." 
        });
      }

      // Success! Delete OTP so it cannot be reused
      otpStore.delete(cleanIdentifier);

      const isEmail = type === 'email' || cleanIdentifier.includes('@');
      const user = {
        uid: (isEmail ? 'email_' : 'phone_') + (isEmail ? cleanIdentifier.replace(/[^a-z0-9]/g, '_') : cleanIdentifier.replace(/\D/g, '')),
        displayName: isEmail ? cleanIdentifier.split('@')[0] : `User +91 ${cleanIdentifier.replace(/\D/g, '')}`,
        email: isEmail ? cleanIdentifier : '',
        phone: !isEmail ? `+91 ${cleanIdentifier.replace(/\D/g, '')}` : '',
        verifiedAt: new Date().toISOString()
      };

      console.log(`[AUTH SUCCESS] User successfully verified: ${user.uid}`);
      return res.json({ success: true, user });
    } catch (e) {
      console.error("OTP verify error:", e);
      return res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // Lazy initialization of Gemini API
  let ai: GoogleGenAI | null = null;
  function getAI() {
    if (!ai) {
      ai = new GoogleGenAI({
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return ai;
  }

  // AI API Route
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const aiClient = getAI();
      const response = await aiClient.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to generate AI response" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && process.env.VITE_DEV_SERVER !== 'false') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

