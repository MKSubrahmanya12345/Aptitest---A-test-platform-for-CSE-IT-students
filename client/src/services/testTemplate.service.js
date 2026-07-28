import api from "./api";

export const testTemplateService = {
  // Get all test templates
  async getAllTemplates(filters = {}) {
    const params = new URLSearchParams();
    if (filters.active !== undefined) params.append("active", filters.active);
    if (filters.paid !== undefined) params.append("paid", filters.paid);
    if (filters.difficulty) params.append("difficulty", filters.difficulty);
    
    const res = await api.get(`/test-templates?${params.toString()}`);
    return res.data;
  },

  // Get single template by ID
  async getTemplateById(id) {
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
    const res = await api.get("/test-templates/my-access");
    return res.data;
  },
};
