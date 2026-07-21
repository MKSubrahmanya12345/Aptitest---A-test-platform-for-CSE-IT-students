import axios from "axios";

const API = "http://localhost:5000/api/auth";

export const login = async (email, password) => {
  const response = await axios.post(`${API}/login`, {
    email,
    password,
  });

  return response.data;
};

export const signup = async (name, email, password) => {
  const res = await axios.post("http://localhost:5000/api/auth/signup", {
    name,
    email,
    password,
  });

  return res.data;
};