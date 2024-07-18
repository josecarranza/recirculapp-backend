import Branch from "../models/branch.model";
import User from "../models/usuario.model";
import config from "../config";
import Role from "../models/roles.model";
import Joi from "joi";
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

// Constants or configuration values
const FROM_EMAIL = 'info@recirculapp.com';
const LOGIN_URL = 'https://app.recirculapp.com/'

export const registerBrand = async (req, res) => {
  try {
    // Extract data from request
    const { userId } = req;
    const {
      email,
      branchName,
      address,
      department,
      country,
      phone,
      mobile_number,
      municipality,
      companyID,
    } = req.body;

    // Define the input validation schema
    const schema = Joi.object({
      email: Joi.string().email().required(),
      branchName: Joi.string().required(),
      address: Joi.string().required(),
      department: Joi.string().required(),
      country: Joi.string().required(),
      phone: Joi.string().required(),
      mobile_number: Joi.string().required(),
      municipality: Joi.string().required(),
      companyID: Joi.string().required(),
    });

    // Validate input data against the schema
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        ok: false,
        message: 'Validation error',
        details: error.details.map((detail) => detail.message),
      });
    }

    // Check if a user with the same email already exists
    const userExists = await User.findOne({ email }).exec();
    if (userExists) {
      return res.status(400).json({
        ok: false,
        message: 'Ya existe un usuario con ese correo.',
      });
    }

    // Check if branch with the same email already exists
    const branchExists = await Branch.findOne({ email }).exec();
    if (branchExists) {
      return res.status(400).json({
        ok: false,
        message: 'Ya existe una sucursal con ese correo.',
      });
    }

    // Create a new branch instance
    const newBranch = new Branch({
      email,
      branchName,
      address,
      department,
      country,
      phone,
      mobile_number,
      municipality,
      companyID,
    });

    // Save the new branch
    await newBranch.save();

    // Send welcome email
    const subject = 'Gracias por tu registro.';
    const html = `
        <div>
          <p>Hemos recibido tu solicitud y estamos verificando tus datos.</p>
          <p>Una vez verificada tu información, recibirás otro correo con las credenciales para ingresar a la plataforma.</p>
          <br>
          <p>Atte:</p>
          <p><strong>Recirculapp</strong></p>
        </div>
      `;

    try {
      await sendEmail(email, subject, html);
    } catch (error) {
      console.error(error);
      res.json({
        ok: false,
        message: 'An error occurred sending the email',
      });
    }

    // Send success response
    res.json({
      ok: true,
      message: 'Branch created',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      message: 'An error occurred',
    });
  }
};

export const editarBranch = async (req, res) => {
  try {
    const { id, branchName, email, address, department, municipality, phone, latitude, longitude } = req.body.sucursal;

    const newbody = {
      branchName,
      email,
      address,
      department,
      municipality,
      phone,
      latitude,
      longitude,
    };

    // Check if the email already exists with another user
    const existingUser = await User.findOne({ email });

    const branchDB = await Branch.findOne({ _id: id });

    // if (existingUser && existingUser._id != branchDB.ownerID) {
    //   return res.json({
    //     ok: false,
    //     message: "El correo electrónico ya está en uso por otro usuario.",
    //   });
    // }

    const updatedBranch = await Branch.findOneAndUpdate(
      { _id: id },
      { $set: newbody },
      { new: true, 
        // useFindAndModify: false 
      }
    );

    if (!updatedBranch) {
      return res.json({
        ok: false,
        message: "No existe ninguna sucursal con ese ID",
      });
    }

    // Generate new random password using generatePassword function from helpers
    const { plain: randomPass, hashed: newPassword } = generateSecurePassword();

    // Update user password
    const user = await User.findOneAndUpdate(
      { _id: branchDB.ownerID },
      { $set: { email: newbody.email, password: newPassword } },
      { new: true,  }
    );

    if (!user) {
      return res.json({
        ok: false,
        message: "No existe ningún usuario con ese email.",
      });
    }

    // Send new credentials to the new email
    const to = newbody.email;
    const subject = 'Nuevas Credenciales';
    const html = `Your new credentials are:
          <br>Email: ${newbody.email}
          <br>Password: ${randomPass} 
          <br>Login URL: ${LOGIN_URL}`;
    try {
      await sendEmail(to, subject, html);
    } catch (error) {
      console.error(error);
      res.json({
        ok: false,
        message: 'An error occurred sending the email',
      });
    }

    res.json({
      ok: true,
      branch: updatedBranch,
    });
  } catch (err) {
    console.log(err);
    res.json(err);
  }
};

export const approveBrand = async (req, res) => {
  const { id } = req.body;
  try {
    const branchFetched = await Branch.findById(id).exec();
    if (!branchFetched) {
      return res.status(400).json({ ok: false, message: "Branch not found" });
    }

    await Branch.findOneAndUpdate(
      { _id: branchFetched._id },
      { $set: { status: "active" } }
    ).exec();

    const { plain: randomPass, hashed: newPassword } = generateSecurePassword();
    const roles = "branch";
    const branchUser = new User({
      email: branchFetched.email,
      username: branchFetched.branchName,
      password: newPassword,
      phone_number: branchFetched.mobile_number,
      roles: "branch",
    });

    if (roles) {
      const foundRole = await Role.find({ name: { $in: roles } });
      branchUser.roles = foundRole.map((role) => role._id);
    } else {
      const role = await Role.findOne({ name: "branch" });
      branchUser.roles = [role._id];
    }

    const userCreated = await branchUser.save();

    const emailContent =
      "<div>" +
      "<h3>Hola 👋, se ha aprobado tu solicitud.</h3>" +
      "<p>Tu empresa ha sido registrada, estas son tus credenciales de acceso a la plataforma</p>" +
      "<ul>" +
      "<li>Usuario: " +
      userCreated.email +
      "</li>" +
      "<li>Contraseña: " +
      randomPass +
      "</li>" +
      "</ul>" +
      "<br>" +
      '<p>Puedes iniciar sesión dando click <a href="https://app.recirculapp.com/" target="_blank">aquí</a></p>' +
      "</div>";

    await sendEmail(userCreated.email, "Usuario activado.", emailContent);

    assignOwnerToBrand(branchFetched._id, userCreated._id);

    res.status(200).json({ ok: true, message: "Status Updated" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, message: "An error occurred" });
  }
};

export const registerAndApproveBrand = async (req, res) => {
  try {
    // Extract data from request
    const { userId } = req;
    const {
      email,
      branchName,
      branchEncargado,
      address,
      department,
      country,
      phone,
      mobile_number,
      municipality,
      companyID,
      latitude,
      longitude,
    } = req.body;

    // Define the input validation schema
    const schema = Joi.object({
      email: Joi.string().email().required(),
      branchName: Joi.string().required(),
      branchEncargado: Joi.string().required(),
      address: Joi.string().required(),
      department: Joi.string().required(),
      country: Joi.string().required(),
      phone: Joi.string().required(),
      mobile_number: Joi.string().required(),
      municipality: Joi.string().required(),
      companyID: Joi.string().required(),
      latitude,
      longitude,
    });

    // Validate input data against the schema
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        ok: false,
        message: 'Validation error',
        details: error.details.map((detail) => detail.message),
      });
    }

    // Check if a user with the same email already exists
    const userExists = await User.findOne({ email }).exec();
    if (userExists) {
      return res.status(400).json({
        ok: false,
        message: 'Ya existe un usuario con ese correo.',
      });
    }

    // Check if branch with the same email already exists
    const branchExists = await Branch.findOne({ email }).exec();
    if (branchExists) {
      return res.status(400).json({
        ok: false,
        message: 'Ya existe una sucursal con ese correo.',
      });
    }

    // Create a new branch instance
    const newBranch = new Branch({
      email,
      branchName,
      branchEncargado,
      address,
      department,
      country,
      phone,
      mobile_number,
      municipality,
      companyID,
      latitude,
      longitude,
    });

    // Save the new branch
    await newBranch.save();

    // Generate a random password for the branch owner
    const { plain: randomPass, hashed: newPassword } = generateSecurePassword();

    // Create a user for the branch
    const roles = "branch";
    const branchUser = new User({
      email: email,
      username: branchName,
      branchEncargado: branchEncargado,
      password: newPassword,
      phone_number: mobile_number,
      roles: "branch",
    });

    if (roles) {
      const foundRole = await Role.find({ name: { $in: roles } });
      branchUser.roles = foundRole.map((role) => role._id);
    } else {
      const role = await Role.findOne({ name: "branch" });
      branchUser.roles = [role._id];
    }

    const userCreated = await branchUser.save();

    // Send welcome email
    const subject = 'Gracias por tu registro.';
    const html = `
        <div>
          <p>Hemos recibido tu solicitud y estamos verificando tus datos.</p>
          <p>Una vez verificada tu información, recibirás otro correo con las credenciales para ingresar a la plataforma.</p>
          <br>
          <p>Atte:</p>
          <p><strong>Recirculapp</strong></p>
        </div>
      `;

    try {
      await sendEmail(email, subject, html);
    } catch (error) {
      console.error(error);
      res.json({
        ok: false,
        message: 'An error occurred sending the email',
      });
    }

    // Update the branch status
    await Branch.findOneAndUpdate({ _id: newBranch._id }, { $set: { status: "active" } }).exec();

    // Send an email with login credentials to the branch owner
    const emailContent =
      "<div>" +
      "<h3>Hola 👋, se ha aprobado tu solicitud.</h3>" +
      "<p>Tu empresa ha sido registrada, estas son tus credenciales de acceso a la plataforma</p>" +
      "<ul>" +
      "<li>Usuario: " +
      userCreated.email +
      "</li>" +
      "<li>Contraseña: " +
      randomPass +
      "</li>" +
      "</ul>" +
      "<br>" +
      '<p>Puedes iniciar sesión dando click <a href="https://app.recirculapp.com/" target="_blank">aquí</a></p>' +
      "</div>";

    await sendEmail(userCreated.email, "Usuario activado.", emailContent);

    assignOwnerToBrand(newBranch._id, userCreated._id);

    // Send success response
    res.json({
      ok: true,
      message: 'Branch created',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      message: 'An error occurred',
    });
  }
};


const assignOwnerToBrand = (companyID, userID) => {
  Branch.updateOne({ _id: companyID }, { $set: { ownerID: userID } })
    .exec()
    .then(() => {
      console.log("Owner assigned to brand");
    });
};

export const getBransComapny = (req, res) => {
  const { userId } = req;
  Branch.find({ companyID: userId })
    .exec()
    .then((brancsFetched) => {
      res.json({ ok: true, brands: brancsFetched });
    })
    .catch(() => {
      res.json({ ok: false, message: "Algo salio mal" });
    });
};

export const getBrandPendingValidation = (req, res) => {
  const { id } = req.body;
  Branch.find({ status: "validation-pending", companyID: id })
    .exec()
    .then((brandsFetched) => {
      res.json({ ok: true, brands: brandsFetched });
    })
    .catch(() => {
      res.json({ ok: false, message: "Algo salio mal" });
    });
};

export const getBrandByUser = (req, res) => {
  const { userId } = req;
  Branch.find({ ownerID: userId })
    .exec()
    .then((brandFetched) => {
      res.json({ ok: true, branch: brandFetched });
    })
    .catch(() => {
      res.json({ ok: false, message: "Algo salio mal" });
    });
};

export const getBrandActive = (req, res) => { //
  const { id } = req.body;
  Branch.find({ status: "active", companyID: id })
    .exec()
    .then((brandFetched) => {
      res.json({ ok: true, brands: brandFetched });
    })
    .catch(() => {
      res.json({ ok: false, message: "Algo salio mal" });
    });
};

export const asignarZona = async (req, res) => {
  const { id, zone } = req.body;

  // Validate id and zone
  // if (!id || typeof id !== 'string') {
  //   return res.status(400).json({ ok: false, message: 'Invalid id' });
  // }

  if (!zone || typeof zone !== 'string') {
    return res.status(400).json({ ok: false, message: 'Invalid zone' });
  }

  try {
    // Check if the branch exists
    const branch = await Branch.findById(id);

    if (!branch) {
      return res.status(404).json({ ok: false, message: 'Branch not found' });
    }

    console.log("BRANCH: " + branch);
    console.log("BRANCH ZONE: " + branch.zone);
    // Update the zone in the database
    await Branch.findOneAndUpdate({ _id: id }, { $set: { zone: zone } }).exec();

    // Send the response after the update is complete
    res.json({ ok: true, message: 'Zona asignada', branch });
  } catch (error) {
    console.error("Error al asignar zona:", error);
    // Handle errors and send an appropriate response
    res.status(500).json({ ok: false, message: "Algo salió mal" });
  }
};

