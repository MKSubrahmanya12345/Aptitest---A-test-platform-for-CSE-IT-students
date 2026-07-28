import api from "./api";

// Hardcoded fallback templates - used when database is empty
const HARDCODED_TEMPLATES = [
  {
    id: 'easy_30',
    name: 'Easy Practice - 30 Qs',
    description: 'Perfect for quick basic revision. Covers easy level questions across chosen streams.',
    difficulty: 'easy',
    count: 30,
    duration_seconds: 1800, // 30 minutes
    duration: 30,
    categories: null,
    question_types: null,
    subcategories: null,
    is_paid: false,
    price_paise: null,
    currency: 'inr',
    is_active: true,
    allow_reattempt: true
  },
  {
    id: 'easy_60',
    name: 'Easy Practice - 60 Qs',
    description: 'Full length foundation practice. Ideal for building solid speed and accuracy.',
    difficulty: 'easy',
    count: 60,
    duration_seconds: 3600, // 60 minutes
    duration: 60,
    categories: null,
    question_types: null,
    subcategories: null,
    is_paid: false,
    price_paise: null,
    currency: 'inr',
    is_active: true,
    allow_reattempt: true
  },
  {
    id: 'hard_30',
    name: 'Hard Practice - 30 Qs',
    description: 'Challenging intermediate and advanced tasks designed to test logical limits.',
    difficulty: 'hard',
    count: 30,
    duration_seconds: 1800, // 30 minutes
    duration: 30,
    categories: null,
    question_types: null,
    subcategories: null,
    is_paid: false,
    price_paise: null,
    currency: 'inr',
    is_active: true,
    allow_reattempt: true
  },
  {
    id: 'hard_60',
    name: 'Hard Practice - 60 Qs',
    description: 'Complete advanced simulation. Designed to stress test your skill stamina.',
    difficulty: 'hard',
    count: 60,
    duration_seconds: 3600, // 60 minutes
    duration: 60,
    categories: null,
    question_types: null,
    subcategories: null,
    is_paid: true,
    price_paise: 5000, // ₹50
    currency: 'inr',
    is_active: true,
    allow_reattempt: true
  }
];

export const testTemplateService = {
  // Get all test templates
  async getAllTemplates(filters = {}) {
    const params = new URLSearchParams();
    if (filters.active !== undefined) params.append("active", filters.active);
    if (filters.paid !== undefined) params.append("paid", filters.paid);
    if (filters.difficulty) params.append("difficulty", filters.difficulty);
    
    try {
      const res = await api.get(`/test-templates?${params.toString()}`);
      
      // If API returns templates, use them; otherwise fallback to hardcoded
      const apiTemplates = res.data?.templates || [];
      if (apiTemplates.length > 0) {
        return res.data;
      }
      
      // Return hardcoded templates when database is empty
      console.log('No templates in database, using hardcoded defaults');
      return { templates: HARDCODED_TEMPLATES };
    } catch (err) {
      console.error('Failed to fetch templates from API, using hardcoded defaults:', err);
      // Return hardcoded templates on error
      return { templates: HARDCODED_TEMPLATES };
    }
  },

  // Get single template by ID
  async getTemplateById(id) {
    // Check hardcoded templates first
    const hardcoded = HARDCODED_TEMPLATES.find(t => t.id === id || t.id === String(id));
    if (hardcoded) {
      return { template: hardcoded };
    }
    
    const res = await api.get(`/test-templates/${id}`);
    return res.data;
  },

  // Create new template (admin only)
  async createTemplate(templateData) {
    const res = await api.post("/test-templates", templateData);
    return res.data;
  },

  // Update template (admin only)
  async updateTemplate(id, templateData) {
    const res = await api.put(`/test-templates/${id}`, templateData);
    return res.data;
  },

  // Delete template (admin only)
  async deleteTemplate(id) {
    const res = await api.delete(`/test-templates/${id}`);
    return res.data;
  },

  // Get user's access to paid templates
  async getMyTemplateAccess() {
    try {
      const res = await api.get("/test-templates/my-access");
      return res.data;
    } catch (err) {
      // For hardcoded templates, return the access map based on API response
      // or default to checking via payment service for hard_60
      console.log('Template access check failed, using default access');
      return { access: {} };
    }
  },
};
