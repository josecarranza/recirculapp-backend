import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const { CHAT_ENGINE_PROJECT_ID, CHAT_ENGINE_PRIVATE_KEY } = process.env;

export const RegistrarUsuario = async (req, res) => {
  const { username, secret, email, first_name, last_name } = req.body;
  try {
    const r = await axios.post(
      "https://api.chatengine.io/users/",
      { username, secret, email, first_name, last_name },
      { headers: { "Private-Key": CHAT_ENGINE_PRIVATE_KEY } }
    );
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(e.response.status).json(e.response.data);
  }
};

export const LoginUsuario = async (req, res) => {
  const { username, secret } = req.body;

  try {
    const r = await axios.get("https://api.chatengine.io/users/me/", {
      headers: {
        "Project-ID": CHAT_ENGINE_PROJECT_ID,
        "User-Name": username,
        "User-Secret": secret,
      },
    });
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(e.response.status).json(e.response.data);
  }
};

export const CrearChat = async (req, res) => {
  const { username, secret, title, users } = req.body;

  try {
    const r = await axios.post(
      "https://api.chatengine.io/chats/",
      { title, users },
      {
        headers: {
          "Project-ID": CHAT_ENGINE_PROJECT_ID,
          "User-Name": username,
          "User-Secret": secret,
        },
      }
    );
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(e.response.status).json(e.response.data);
  }
}

export const getChats = async (req, res) => {
  const { username, secret } = req.body;

  try {
    const r = await axios.get("https://api.chatengine.io/chats/", {
      headers: {
        "Project-ID": CHAT_ENGINE_PROJECT_ID,
        "User-Name": username,
        "User-Secret": secret,
      },
    });
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(e.response.status).json(e.response.data);
  }
}

export const getChat = async (req, res) => {
  const { username, secret, id } = req.body;

  try {
    const r = await axios.get(`https://api.chatengine.io/chats/${id}/`, {
      headers: {
        "Project-ID": CHAT_ENGINE_PROJECT_ID,
        "User-Name": username,
        "User-Secret": secret,
      },
    });
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(e.response.status).json(e.response.data);
  }
}

export const getMessages = async (req, res) => {
  const { username, secret, id } = req.body;

  try {
    const r = await axios.get(`https://api.chatengine.io/chats/${id}/messages/`, {
      headers: {
        "Project-ID": CHAT_ENGINE_PROJECT_ID,
        "User-Name": username,
        "User-Secret": secret,
      },
    });
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(e.response.status).json(e.response.data);
  }
}

export const sendMessage = async (req, res) => {
  const { username, secret, id, message } = req.body;

  try {
    const r = await axios.post(
      `https://api.chatengine.io/chats/${id}/messages/`,
      { message },
      {
        headers: {
          "Project-ID": CHAT_ENGINE_PROJECT_ID,
          "User-Name": username,
          "User-Secret": secret,
        },
      }
    );
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(e.response.status).json(e.response.data);
  }
}

export const getUsuarios = async (req, res) => {
  const { username, secret } = req.body;

  try {
    const r = await axios.get("https://api.chatengine.io/users/", {
      headers: {
        "Project-ID": CHAT_ENGINE_PROJECT_ID,
        "User-Name": username,
        "User-Secret": secret,
      },
    });
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(e.response.status).json(e.response.data);
  }
}

export const getUsuario = async (req, res) => {
  const { username, secret, id } = req.body;

  try {
    const r = await axios.get(`https://api.chatengine.io/users/${id}/`, {
      headers: {
        "Project-ID": CHAT_ENGINE_PROJECT_ID,
        "User-Name": username,
        "User-Secret": secret,
      },
    });
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(e.response.status).json(e.response.data);
  }
}

export const getProyectos = async (req, res) => {
  const { username, secret } = req.body;

  try {
    const r = await axios.get("https://api.chatengine.io/projects/", {
      headers: {
        "Project-ID": CHAT_ENGINE_PROJECT_ID,
        "User-Name": username,
        "User-Secret": secret,
      },
    });
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(e.response.status).json(e.response.data);
  }
}

export const getProyecto = async (req, res) => {
  const { username, secret, id } = req.body;

  try {
    const r = await axios.get(`https://api.chatengine.io/projects/${id}/`, {
      headers: {
        "Project-ID": CHAT_ENGINE_PROJECT_ID,
        "User-Name": username,
        "User-Secret": secret,
      },
    });
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(e.response.status).json(e.response.data);
  }
}
