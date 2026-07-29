import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getMyTemplateAccess,
} from "../controllers/testTemplate.controller";

const router = Router();

// All routes require authentication
router.get("/", authenticateToken, getAllTemplates);
router.get("/my-access", authenticateToken, getMyTemplateAccess);
router.get("/:id", authenticateToken, getTemplateById);

// Admin only routes
router.post("/", authenticateToken, createTemplate);
router.put("/:id", authenticateToken, updateTemplate);
router.delete("/:id", authenticateToken, deleteTemplate);

export default router;
