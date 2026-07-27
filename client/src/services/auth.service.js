import api from "./api";

export const login = async (email, password) => {
  const { data } = await api.post("/auth/login", {
    email,
    password,
  });

  return data;
};

export const signup = async (name, email, password) => {
  const { data } = await api.post("/auth/signup", {
    name,
    email,
    password,
  });

  return data;
};

export const forgotPassword = async (email) => {
  const { data } = await api.post("/auth/forgot-password", {
    email,
  });
  return data;
};

export const resetPassword = async (token, newPassword) => {
  const { data } = await api.post("/auth/reset-password", {
    token,
    newPassword,
  });
  return data;
};

export const verifyResetToken = async (token) => {
  const { data } = await api.get(`/auth/verify-reset-token?token=${token}`);
  return data;
};

export const verifyEmail = async (token) => {
  const { data } = await api.get(`/auth/verify-email?token=${token}`);
  return data;
};

export const resendVerificationEmail = async (email) => {
  const { data } = await api.post("/auth/resend-verification", {
    email,
  });
  return data;
};