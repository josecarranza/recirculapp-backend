import Gatherer from "../models/gatherer.model";

import User from "../models/usuario.model";
import config from "../config";
import Role from "../models/roles.model";
const { promisify } = require("util");
const fs = require("fs");
import { uploadToBucket } from "../helpers/s3.helper";
const unlinkAsync = promisify(fs.unlink);
import { v4 as uuidv4 } from "uuid";
import { generateSecurePassword } from "../helpers/generateSecurePass";

// Helper function to send emails
import { sendEmail } from './../helpers/emailHelper';

const makeRandomString = (length) => {
  let result = "";
  let characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export const registerGatherer = async (req, res) => {
  const {
    fullName,
    email,
    phone,
    country,
    address,
    department,
    municipality,
    dui,
  } = req.body;
  console.log(req.body);

  try {
    let { file } = req;
    let image;
    const Newgatherer = new Gatherer({
      fullName,
      email,
      country,
      phone,
      address,
      department,
      municipality,
      dui,
    });

    if (!file) {
      const gatherer = await Gatherer.findOne({ $or: [{ email: email }] });
      if (gatherer) {
        return res.status(400).json({
          ok: false,
          message: "Ya existe un usuario con ese email",
        });
      } else {
        const notifyEmailContent =
          "<div>" +
          "<p>Nueva solicitud de recolector en la plataforma.</p>" +
          `<p>Correo de la solicitud: ${email} </p>` +
          "<br>" +
          "<p>Atte:</p>" +
          "<p><strong>Recirculapp</strong></p>" +
          "</div>";

        const welcomeEmailContent =
          "<div>" +
          "<p>Hemos recibido tu solicitud y estamos verificando tus datos.</p>" +
          "<p>Una vez verificada tu información por uno de nuestros administradores, recibirás otro correo con las credenciales para ingresar a la plataforma.</p>" +
          "<br>" +
          "<p>Atte:</p>" +
          "<p><strong>Recirculapp</strong></p>" +
          "</div>";

        const newgatherer = await Newgatherer.save();

        await sendEmail(
          ["jcarranza@gmail.com", "roberto.climaco@recirculapp.com"],
          "Nuevo registro.",
          notifyEmailContent,
          "Notificaciones: Recolector Solicitud Nueva"
        );
        await sendEmail(
          email,
          "Gracias por tu registro.",
          welcomeEmailContent,
          "Recirculapp Info"
        );

        return res.status(200).json({
          ok: true,
          message: "Gatherer created",
        });
      }
    } else {
      let filename = "recolector-";
      let newfilename = filename + uuidv4();

      const result = await uploadToBucket(
        "filemanagerrecir",
        file,
        newfilename
      );
      await unlinkAsync(file.path);
      image = result.Location;

      const gatherer = await Gatherer.findOne({ $or: [{ email: email }] });

      if (gatherer) {
        return res.status(400).json({
          ok: false,
          message: "Ya existe un usuario con ese email",
        });
      } else {
        Newgatherer.imgs = [image];
        const newgatherer = await Newgatherer.save();
        const notifyEmailContent =
          "<div>" +
          "<p>Nueva solicitud de recolector en la plataforma.</p>" +
          `<p>Correo de la solicitud: ${email} </p>` +
          "<br>" +
          "<p>Atte:</p>" +
          "<p><strong>Recirculapp</strong></p>" +
          "</div>";

        const welcomeEmailContent =
          "<div>" +
          "<p>Hemos recibido tu solicitud y estamos verificando tus datos.</p>" +
          "<p>Una vez verificada tu información por uno de nuestros administradores, recibirás otro correo con las credenciales para ingresar a la plataforma.</p>" +
          "<br>" +
          "<p>Atte:</p>" +
          "<p><strong>Recirculapp</strong></p>" +
          "</div>";

        await sendEmail(
          ["jcarranza@gmail.com", "roberto.climaco@recirculapp.com"],
          "Nuevo registro.",
          notifyEmailContent,
          "Notificaciones: Recolector Solicitud Nueva"
        );
        await sendEmail(
          email,
          "Gracias por tu registro.",
          welcomeEmailContent,
          "Recirculapp Info"
        );

        return res
          .status(200)
          .json({ ok: true, message: "Categoria actualizada" });
      }
    }
    //let event = await Event.findById(req.params.id);
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, message: "Error al actualizar" });
  }
};

export const getAllGatherer = (req, res) => {
  Gatherer.find()
    .exec()
    .then((gathererFetched) => {
      res.json({ ok: true, recolectores: gathererFetched });
    })
    .catch(() => {
      res.json({ ok: false, message: "Algo salio mal" });
    });
};

export const getGathererPendingValidation = (req, res) => {
  Gatherer.find({ status: "validation-pending" })
    .exec()
    .then((gathererFetched) => {
      res.json({ ok: true, gatherers: gathererFetched });
    })
    .catch(() => {
      res.json({ ok: false, message: "Algo salio mal" });
    });
};

export const getGathererOnline = async (req, res) => {
  try {
    const activeGatherers = await Gatherer.find({ status: "active" })
      .populate("userID")
      .exec();

    res.status(200).json({ success: true, gatherers: activeGatherers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const approveGatherer = async (req, res) => {
  const { id } = req.body;
  try {
    const gathererFetched = await Gatherer.findById(id).exec();
    if (!gathererFetched) {
      return res.status(404).json({ ok: false, message: "Gatherer not found" });
    }

    await Gatherer.findOneAndUpdate(
      { _id: gathererFetched._id },
      { $set: { status: "active" } }
    ).exec();

    const randomPass = "$CI" + makeRandomString(8);
    const roles = "gatherer";
    const gathererUser = new User({
      email: gathererFetched.email,
      username: gathererFetched.fullName,
      password: await User.encryptPassword(randomPass),
      phone_number: gathererFetched.phone,
      roles: "gatherer",
    });

    if (roles) {
      const foundRole = await Role.find({ name: { $in: roles } });
      gathererUser.roles = foundRole.map((role) => role._id);
    } else {
      const role = await Role.findOne({ name: "gatherer" });
      gathererUser.roles = [role._id];
    }

    const userCreated = await gathererUser.save();

    const emailContent =
      "<div>" +
      "<h3>Hola 👋, se ha aprobado tu solicitud.</h3>" +
      "<p>Ya formas parte de nuestros recolectores, estas son tus credenciales de acceso a la plataforma.</p>" +
      "<ul>" +
      "<li>Usuario: " +
      userCreated.email +
      "</li>" +
      "<li>Contraseña: " +
      randomPass +
      "</li>" +
      "</ul>" +
      "<br>" +
      '<p>Puedes iniciar sesión dando click <a href="#" target="_blank">Aquí</a></p>' +
      "</div>";

    await sendEmail(
      userCreated.email,
      "Usuario Activado",
      emailContent,
      "Recirculapp Info"
    );

    const notifyEmailContent =
      "<div>" +
      "<h3>Hola 👋, se ha aprobado la solicitud de un nuevo usuario.</h3>" +
      "<ul>" +
      "<li>Usuario: " +
      userCreated.email +
      "</li>" +
      "</div>";

    await sendEmail(
      ["jcarranza@gmail.com", "roberto.climaco@recirculapp.com"],
      "Notificacion Usuario Activado",
      notifyEmailContent,
      "Notificaciones: Usuario Aprobado"
    );

    assignOwnerToGatherer(gathererFetched._id, userCreated._id);

    res.status(200).json({ ok: true, message: "Status Updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

export const sendPasswordGatherer = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).exec();

    if (!user) {
      console.log(new Error("User not found"));
      return res.status(404).json({ message: "Usuario no existe" });
    }

    // Generate new random password using generatePassword function from helpers
    const { plain: randomPass, hashed: newPassword } = generateSecurePassword();

    await User.findOneAndUpdate({ _id: user._id }, { password: newPassword });

    const emailContent = getEmailHtml(user.email, randomPass);

    await sendEmail(
      user.email,
      "Credenciales",
      emailContent,
      "Recirculapp Info"
    );

    res.status(200).json({ message: "Password sent successfully" });
  } catch (error) {
    console.error(error);
    throw new Error("Internal server error");
  }
};

function getEmailHtml(email, password) {
  const html = `
    <div>
      <h3>Hola 👋, estas son tus credenciales para acceder a la plataforma.</h3>
      <ul>
        <li>Usuario: ${email}</li>
        <li>Contraseña: ${password}</li>
      </ul>
      <br>
      <p>Puedes iniciar sesión dando click <a href="https://app.recirculapp.com/" target="_blank">aquí</a></p>
    </div>
  `;
  return html;
}

export const getGathererByUser = (req, res) => {
  const { userId } = req;
  Gatherer.find({ userID: userId })
    .exec()
    .then((recolectorFetched) => {
      res.json({ ok: true, recolector: recolectorFetched });
    })
    .catch(() => {
      res.status(400).json({ ok: false, message: "Algo salio mal" });
    });
};

const assignOwnerToGatherer = (gathererID, userID) => {
  Gatherer.findById(gathererID)
    .exec()
    .then((gatherer) => {
      if (!gatherer) {
        console.log('Gatherer not found');
        return;
      }
      if (gatherer.userID) {
        console.log('Gatherer already has an owner');
        return;
      }
      Gatherer.updateOne({ _id: gathererID }, { $set: { userID: userID } })
        .exec()
        .then(() => {
          console.log('Owner assigned to gatherer');
        });
    });
};

export const editGatherer = async (req, res) => {
  const body = req.body.recolector;
  const newbody = {
    address: body["address"],
    department: body["department"],
    email: body["email"],
    fullName: body["fullName"],
    dui: body["dui"],
    municipality: body["municipality"],
    phone: body["phone"],
  };

  Gatherer.findOneAndUpdate(
    { userID: body["_id"] }, // Use the original _id here
    { $set: newbody },
    { new: true, }
  )
    .then((gathererDB) => {
      if (!gathererDB) {
        return res.json({
          ok: false,
          message: "No existe ningun recolector con ese ID",
        });
      } else {
        User.findOneAndUpdate(
          { _id: gathererDB.userID },
          { $set: { email: newbody.email } },
          { new: true,  }
        ).then((user) => {
          if (!user) {
            return res.json({
              ok: false,
              message: "No existe ningun user con ese email.",
            });
          }

          res.json({
            ok: true,
            producto: gathererDB,
          });
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.json(err);
    });
};
