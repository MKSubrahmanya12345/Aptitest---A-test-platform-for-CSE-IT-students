import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { testTemplateService } from "../services/testTemplate.service";

// GET /api/test-templates - Get all templates (public)
export const getAllTemplates = async (req: Request, res: Response) => {
  try {
    const { active, paid, difficulty } = req.query;
    
    const filters = {
      is_active: active !== undefined ? active === "true" : undefined,
      is_paid: paid !== undefined ? paid === "true" : undefined,
      difficulty: difficulty as string | undefined,
    };

    const templates = await testTemplateService.getAllTemplates(filters);
    return res.json({ templates });
  } catch (err: any) {
    console.error("getAllTemplates error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch templates" });
  }
};

// GET /api/test-templates/:id - Get single template (public)
export const getTemplateById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid template ID" });
    }

    const template = await testTemplateService.getTemplateById(id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    return res.json({ template });
  } catch (err: any) {
    console.error("getTemplateById error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch template" });
  }
};

// POST /api/test-templates - Create new template (admin only)
export const createTemplate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const {
      name,
      description,
      difficulty,
      count,
      duration_seconds,
      duration_minutes, // alternative input
      categories,
      question_types,
      subcategories,
      is_paid,
      price_paise,
      price_rupees, // alternative input
      currency,
      is_active,
      allow_reattempt,
    } = req.body;

    // Validation
    if (!name || !difficulty || !count) {
      return res.status(400).json({ 
        message: "Name, difficulty, and count are required" 
      });
    }

    // Handle duration (accept seconds or minutes)
    let finalDurationSeconds = duration_seconds;
    if (!finalDurationSeconds && duration_minutes) {
      finalDurationSeconds = duration_minutes * 60;
    }
    if (!finalDurationSeconds) {
      finalDurationSeconds = 1800; // default 30 min
    }

    // Handle price (accept paise or rupees)
    let finalPricePaise = price_paise;
    if (!finalPricePaise && price_rupees) {
      finalPricePaise = Math.round(price_rupees * 100);
    }

    // Validate paid template has price
    if (is_paid && !finalPricePaise) {
      return res.status(400).json({ 
        message: "Paid templates must have a price" 
      });
    }

    const templateId = await testTemplateService.createTemplate({
      name,
      description,
      difficulty,
      count,
      duration_seconds: finalDurationSeconds,
      categories: categories || null,
      question_types: question_types || null,
      subcategories: subcategories || null,
      is_paid: is_paid || false,
      price_paise: finalPricePaise || null,
      currency: currency || "inr",
      is_active: is_active !== undefined ? is_active : true,
      allow_reattempt: allow_reattempt !== undefined ? allow_reattempt : true,
      created_by: userId,
    });

    return res.status(201).json({ 
      message: "Template created successfully", 
      templateId 
    });
  } catch (err: any) {
    console.error("createTemplate error:", err);
    return res.status(500).json({ message: err.message || "Failed to create template" });
  }
};

// PUT /api/test-templates/:id - Update template (admin only)
export const updateTemplate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid template ID" });
    }

    const updateData: any = { ...req.body };

    // Handle duration conversion
    if (updateData.duration_minutes && !updateData.duration_seconds) {
      updateData.duration_seconds = updateData.duration_minutes * 60;
      delete updateData.duration_minutes;
    }

    // Handle price conversion
    if (updateData.price_rupees && !updateData.price_paise) {
      updateData.price_paise = Math.round(updateData.price_rupees * 100);
      delete updateData.price_rupees;
    }

    // Validate paid template has price
    if (updateData.is_paid && !updateData.price_paise) {
      const existing = await testTemplateService.getTemplateById(id);
      if (!existing?.price_paise) {
        return res.status(400).json({ 
          message: "Paid templates must have a price" 
        });
      }
    }

    const success = await testTemplateService.updateTemplate(id, updateData);
    if (!success) {
      return res.status(404).json({ message: "Template not found" });
    }

    return res.json({ message: "Template updated successfully" });
  } catch (err: any) {
    console.error("updateTemplate error:", err);
    return res.status(500).json({ message: err.message || "Failed to update template" });
  }
};

// DELETE /api/test-templates/:id - Delete template (admin only)
export const deleteTemplate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid template ID" });
    }

    const success = await testTemplateService.deleteTemplate(id);
    if (!success) {
      return res.status(404).json({ message: "Template not found" });
    }

    return res.json({ message: "Template deleted successfully" });
  } catch (err: any) {
    console.error("deleteTemplate error:", err);
    return res.status(500).json({ message: err.message || "Failed to delete template" });
  }
};

// GET /api/test-templates/my-access - Get user's access to paid templates
export const getMyTemplateAccess = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get all paid templates
    const paidTemplates = await testTemplateService.getAllTemplates({ is_paid: true, is_active: true });

    // Check access for each
    const accessMap: Record<number, boolean> = {};
    for (const template of paidTemplates) {
      if (template.id) {
        accessMap[template.id] = await testTemplateService.hasUserPaidForTemplate(userId, template.id);
      }
    }

    return res.json({ access: accessMap });
  } catch (err: any) {
    console.error("getMyTemplateAccess error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch access info" });
  }
};
