import User from "../models/usuario.model";
import jwt from "jsonwebtoken";
import config from "../config";
import Role from "../models/roles.model";
import limiter from "../middlewares/rateLimit";
import bcrypt from "bcrypt";
import { sendEmail } from './../helpers/emailHelper';

export const signUp = async (req, res) => {
  const {
    email,
    first_name,
    last_name,
    username,
    phone_number,
    password,
    roles,
  } = req.body;

  const newUser = new User({
    email,
    first_name,
    last_name,
    username,
    phone_number,
    password: await User.encryptPassword(password),
    roles,
  });

  if (roles) {
    const foundRole = await Role.find({ name: { $in: roles } });
    newUser.roles = foundRole.map((role) => role._id);
  } else {
    const role = await Role.findOne({ name: "customer" });
    newUser.roles = [role._id];
  }

  const savedUser = await newUser.save();

  const token = jwt.sign(
    { id: savedUser._id, role: savedUser.roles },
    config.SECRET,
    {
      expiresIn: 86400, // 24 horas
    }
  );
  console.log(token);

  res.json({
    ok: true,
    email: savedUser.email,
    username: savedUser.username,
    uid: savedUser._id,
    token: token,
  });
};

export const signIn = async (request, response) => {
  try {
    const { email, password } = request.body;

    const userFound = await User.findOne({ email }).populate("roles", "-_id");

    if (!userFound) {
      return response
        .status(400)
        .json({ error: "User not found." });
    }

    if (userFound.status === false) {
      return response
        .status(400)
        .json({ error: "This user is deactivated." });
    }

    const matchPassword = await bcrypt.compare(password, userFound.password);

    if (!matchPassword) {
      return limiter(request, response, () => {
        response.status(400).json({ error: 'Invalid password.' });
      });
    }

    const token = generateToken(userFound);

    response.json({
      email: userFound.email,
      username: userFound.username,
      uid: userFound._id,
      role: userFound.roles,
      token,
    });
  } catch (error) {
    console.error("Error in signIn:", error);
    response.status(500).json({ error: "Internal server error." });
  }
};

export const signInEmail = async (request, response) => {
  try {
    const { email } = request.body;

    const userFound = await User.findOne({ email }).populate("roles", "-_id");

    if (!userFound) {
      return response
        .status(400)
        .json({ error: "User not found." });
    }

    if (userFound.status === false) {
      return response
        .status(400)
        .json({ error: "This user is deactivated." });
    }

    const token = generateToken(userFound);

    response.json({
      email: userFound.email,
      username: userFound.username,
      uid: userFound._id,
      role: userFound.roles,
      token,
    });
  } catch (error) {
    console.error("Error in signIn:", error);
    response.status(500).json({ error: "Internal server error." });
  }
};

function generateToken(user) {
  const { _id, roles } = user;
  return jwt.sign({ id: _id, role: roles }, config.SECRET, {
    expiresIn: config.TOKEN_EXPIRATION,
  });
}

export const revalidarToken = async (req, res) => {
  const { userId } = req;

  const dbUser = await User.findById(userId).populate("roles");

  const token = await jwt.sign(
    { id: dbUser._id, role: dbUser.roles },
    config.SECRET,
    {
      expiresIn: 86400,
    }
  );

  return res.json({
    ok: true,
    uid: userId,
    username: dbUser.username,
    email: dbUser.email,
    roles: dbUser.roles,
    token: token,
  });
};

export const updatePassword = async (req, res) => {
  const { userId } = req;
  const newUser = {
    password: await User.encryptPassword(req.body.password),
  };
  User.findByIdAndUpdate(userId, newUser)
    .then(async (userDB) => {
      await userDB;
      if (userDB == null) {
        res.status(400).json({
          ok: false,
          message: "No hay ningún estudiante registrado con ese id.",
        });
      } else {
        res.json({ ok: true, message: "Contraseña actualizada con exito." });
      }
    })
    .catch((error) => {
      res.status(400).json({
        ok: false,
        message: "Ocurrio un error",
      });
    });
};

export const updateStatus = async (req, res) => {
  const { status, id } = req.body;
  console.log(id);
  console.log(status);
  const newUser = {
    status,
  };
  User.findByIdAndUpdate(id, newUser)
    .then(async (userDB) => {
      await userDB;
      if (userDB == null) {
        res.status(400).json({
          ok: false,
          message: "No hay ningún registrado con ese id.",
        });
      } else {
        res.json({ ok: true, message: "Estado actualizada con exito." });
      }
    })
    .catch((error) => {
      res.status(400).json({
        ok: false,
        message: "Ocurrio un error",
      });
    });
};

export const sendPasswordEmail = async (req, res) => {
  try {
    // Apply rate limiter middleware to the specific route
    limiter(req, res, async () => {
      const { email } = req.body;
      console.log(email);
      const userDB = await User.findOne({ email });

      if (!userDB) {
        return res.status(400).json({
          ok: false,
          message: "No hay ningún usuario registrado con ese correo.",
        });
      }

      const token = jwt.sign({ id: userDB._id }, config.SECRET, {
        expiresIn: 86400, // 24 horas
      });

      const subject = 'Recuperar contraseña';
      const html =
        '<div>' +
        '<h3>Recuperar contraseña: </h3>' +
        '<p>No hay de qué preocuparse. Puedes restablecer la contraseña haciendo clic en el siguiente enlace</p>' +
        `<a href="https://app.recirculapp.com/auth/new-password/${token}">Recuperar contraseña</a>` +
        '<br>' +
        '</div>';

      try {
        await sendEmail(userDB.email, subject, html);
        res.json({
          ok: true,
          message: 'Send email',
        });
      } catch (error) {
        console.log(error);
        res.status(500).json({
          ok: false,
          message: 'Error sending email',
        });
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      message: 'Error',
    });
  }
};