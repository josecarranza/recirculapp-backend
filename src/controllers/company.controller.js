import Company from "../models/companies.model";

import User from "../models/usuario.model";
import Branch from "../models/branch.model";
import config from "../config";
import Role from "../models/roles.model";
import e from "express";
const { promisify } = require("util");
const fs = require("fs");
import { uploadToBucket2 } from "../helpers/s3.helper";

import { v4 as uuidv4 } from 'uuid';

import { generateSecurePassword } from "../helpers/generateSecurePass";

// Helper function to send emails
import { sendEmail } from './../helpers/emailHelper';

const unlinkAsync = promisify(fs.unlink);
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
export const registerCompany = async (req, res) => {
  const {
    email,
    businessName,
    tradeName,
    phone,
    mobile_number,
    country,
    address,
    department,
    municipality,
    bank_name,
    bank_owner,
    bank_type_account,
    bank_number,
    contactFullName,
    contactPhone,
    contactEmail,
    nit,
    nrc,
    billing_type,
    billing_period,
    // imgs,
  } = req.body;


  try {
    let file = req.files.file;
    let image;
    const newCompany = new Company({
      email,
      businessName,
      tradeName,
      phone,
      mobile_number,
      bank_name,
      country,
      bank_owner,
      bank_type_account,
      bank_number,
      address,
      department,
      municipality,

      contactFullName,
      contactPhone,
      contactEmail,
      nit,
      nrc,
      // imgs,
      billing_type,
      billing_period,
    });

    if (!file) {
      const gatherer = await Company.findOne({
        $or: [{ email: email }, { nrc: nrc }, { nit: nit }],
      });

      if (gatherer) {
        return res.status(400).json({
          ok: false,
          message: "Ya existe un registro con ese email, nit y/o nrc",
        });
      } else {
        const newCompanySaved = await newCompany.save();

        const welcomeEmailContent =
          "<div>" +
          "<p>Hemos recibido tu solicitud y estamos verificando tus datos.</p>" +
          "<p>Una vez verificada tu información, recibirás otro correo con las credenciales para ingresar a la plataforma.</p>" +
          "<br>" +
          "<p>Atte:</p>" +
          "<p><strong>Recirculapp</strong></p>" +
          "</div>";
        await sendEmail(
          email,
          "Gracias por tu registro.",
          welcomeEmailContent,
          "Recirculapp Info"
        );

        return res.status(200).json({
          ok: true,
          message: "Company created",
        });
      }
    } else {
      let ext = file.name.split('.').pop();
      let tmp_name = new Date().getTime() + "." + ext;
      await file.mv(`tmp/${tmp_name}`);

      let serverPath = `tmp/${tmp_name}`;

      let filename = 'company-';
      let newfilename = filename + uuidv4();

      let objectImage = {
        filename: newfilename,
        path: serverPath,
        mimetype: file.mimetype,
      }

      const result = await uploadToBucket2("filemanagerrecir", objectImage, newfilename);
      await unlinkAsync(serverPath);
      image = result.Location;

      const gatherer = await Company.findOne({
        $or: [{ email: email }, { nrc: nrc }, { nit: nit }],
      });

      if (gatherer) {
        return res.status(400).json({
          ok: false,
          message: "Ya existe un registro con ese email, nit y/o nrc",
        });
      } else {

        newCompany.imgs = [image];

        const newCompanySaved = await newCompany.save();

        const notifyEmailContent =
          "<div>" +
          "<p>Nueva solicitud de empresa en la plataforma.</p>" +
          `<p>Correo de la solicitd: ${email} </p>` +
          "<br>" +
          "<p>Atte:</p>" +
          "<p><strong>Recirculapp</strong></p>" +
          "</div>";

        const welcomeEmailContent =
          "<div>" +
          "<p>Hemos recibido tu solicitud y estamos verificando tus datos.</p>" +
          "<p>Una vez verificada tu información, recibirás otro correo con las credenciales para ingresar a la plataforma.</p>" +
          "<br>" +
          "<p>Atte:</p>" +
          "<p><strong>Recirculapp</strong></p>" +
          "</div>";

        await sendEmail(
          ["jcarranza@gmail.com", "roberto.climaco@recirculapp.com"],
          "Nuevo registro.",
          notifyEmailContent,
          "Notificaciones: Empresa Solicitud Nueva"
        );
        await sendEmail(
          email,
          "Gracias por tu registro.",
          welcomeEmailContent,
          "Recirculapp Info"
        );

        return res.status(200).json({
          ok: true,
          message: "Company created",
        });
      }
    }
  } catch (error) {

    console.log(error);
    res.status(500).json({ ok: false, message: "Error al actualizar" });
  }
};

export const getCompanyByUser = (req, res) => {
  const { userId } = req;
  Company.find({ ownerID: userId })
    .exec()
    .then((companiesFetched) => {
      res.json({ ok: true, company: companiesFetched });
    })
    .catch(() => {
      res.json({ ok: false, message: "Algo salio mal" });
    });
};

export const getAllCompanies = (req, res) => {
  Company.find({})
    .exec()
    .then((companiesFetched) => {
      res.json({ ok: true, companies: companiesFetched });
    })
    .catch(() => {
      res.json({ ok: false, message: "Algo salio mal" });
    });
};

export const getCompaniesPendingValidation = (req, res) => {
  Company.find({ isNewCompany: "true" })
    .exec()
    .then((companiesFetched) => {
      res.json({ ok: true, companies: companiesFetched });
    })
    .catch(() => {
      res.json({ ok: false, message: "Algo salio mal" });
    });
};

export const getLatestCompanies = (req, res) => {
  Company.find({})
    .sort({ createdAt: -1 }) // Sort by creation date in descending order (latest first)
    .limit(5) // Limit the result to the latest five companies
    .exec()
    .then((companiesFetched) => {
      res.json({ ok: true, latestCompanies: companiesFetched });
    })
    .catch(() => {
      res.json({ ok: false, message: "Algo salio mal" });
    });
};

export const getCompaniesActive = (req, res) => {
  Company.find({ status: "active" })
    .populate("ownerID")
    .exec()
    .then((companiesFetched) => {
      // Extract the _id values from the fetched companies
      const companyIds = companiesFetched.map((company) => company._id);

      // Fetch the branches for each company using the _id as companyID
      Branch.find({ companyID: { $in: companyIds } })
        .exec()
        .then((branchesFetched) => {
          // Map the branches to their respective companies
          const companiesWithBranches = companiesFetched.map((company) => {
            const branches = branchesFetched.filter(
              (branch) => branch.companyID.toString() === company._id.toString()
            );

            if (branches.length === 0) {
              // Set a custom message when there are no branches
              // branches.push({ message: "Sin sucursales disponibles" });
            }

            return { ...company._doc, branches };
          });

          res.json({ ok: true, companies: companiesWithBranches });
        })
        .catch(() => {
          res.json({ ok: false, message: "Something went wrong" });
        });
    })
    .catch(() => {
      res.json({ ok: false, message: "Something went wrong" });
    });
};

// Function to send password reset email
export const sendPasswordCompany = async (req, res) => {
  try {
    // Validate input
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Invalid email address" });
    }

    // Find user in database
    const user = await User.findOne({ email }).exec();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate new random password using generatePassword function from helpers
    const { plain: randomPass, hashed: newPassword } = generateSecurePassword();

    // Update user password in database
    await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { password: newPassword } }
    ).exec();

    // Send password reset email
    const emailContent = `
      <div>
        <h3>Hola 👋, estas son tus credenciales para acceder a la plataforma.</h3>
        <ul>
          <li>Usuario: ${user.email}</li>
          <li>Contraseña: ${randomPass}</li>
        </ul>
        <br>
        <p>Puedes iniciar sesión dando click <a href="https://app.recirculapp.com/login" target="_blank">aquí</a></p>
      </div>
    `;

    await sendEmail(
      user.email,
      "Credenciales",
      emailContent,
      "Recirculapp Info"
    );

    // Return success response
    res.status(200).json({ ok: true, message: "Password reset email sent" });
  } catch (error) {
    // Handle errors
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

async function createUserForCompany(companyFetched, randomPass) {
  const foundUser = await User.findOne({ email: companyFetched.contactEmail });
  if (foundUser) {
    return foundUser;
  }

  const roles = "enterprise";
  const companyUser = new User({
    email: companyFetched.contactEmail,
    username: companyFetched.contactFullName,
    password: await User.encryptPassword(randomPass),
    phone_number: companyFetched.contactPhone,
    roles: "enterprise",
  });

  if (roles) {
    const foundRole = await Role.find({ name: { $in: roles } });
    companyUser.roles = foundRole.map((role) => role._id);
  } else {
    const role = await Role.findOne({ name: "enterprise" });
    companyUser.roles = [role._id];
  }

  return companyUser.save();
}

export const approveCompany = async (req, res) => {
  const { id } = req.body;
  try {
    const companyFetched = await Company.findById(id).exec();
    if (!companyFetched) {
      return res.status(404).json({ ok: false, message: "Company not found" });
    }

    // Generate new random password using generatePassword function from helpers
    const { plain: randomPass, hashed: newPassword } = generateSecurePassword();

    const userCreated = await createUserForCompany(companyFetched, randomPass);

    await Company.findOneAndUpdate(
      { _id: id },
      { $set: { status: "active", ownerID: userCreated._id } }
    ).exec();

    // Set new password in user object
    userCreated.password = newPassword;
    await userCreated.save();

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

    await sendEmail(
      userCreated.email,
      "Usuario activado.",
      emailContent,
      "Recirculapp Info"
    );

    assignOwnerToCompany(companyFetched._id, userCreated._id);

    res.status(200).json({ ok: true, message: "Status Updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const assignOwnerToCompany = (companyID, userID) => {
  Company.updateOne({ _id: companyID }, { $set: { ownerID: userID } })
    .exec()
    .then(() => {
      console.log("Owner assigned to enterprise");
    });
};

export const changeCompanyStatus = async (req, res) => {
  const { id } = req.body;
  try {
    const companyFetched = await Company.findById(id).exec();
    if (!companyFetched) {
      return res.status(404).json({ ok: false, message: "Company not found" });
    }

    await Company.findOneAndUpdate(
      { _id: id },
      { $set: { isNewCompany: "false" } }
    ).exec();

    res.status(200).json({ ok: true, message: "Status Updated" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

export const editCompany = async (req, res) => {
  const body = req.body.company;
  console.log(body);

  const newbody = {
    _id: body["_id"],
    bank_name: body["bank_name"],
    bank_number: body["bank_number"],
    bank_owner: body["bank_owner"],
    bank_type_account: body["bank_type_account"],
    businessName: body["businessName"],
    email: body["email"],
    municipality: body["municipality"],
    // coordinates: {
    //   latitude: body["latitude"],
    //   longitude: body["longitude"],
    // },
    department: body["department"],
    phone: body["phone"],
    address: body["address"],
  };

  Company.findOneAndUpdate(
    { _id: newbody._id },
    { $set: newbody },
    { new: true, }
  )
    .then((companyDB) => {
      if (!companyDB) {
        return res.json({
          ok: false,
          message: "No existe nunguna empresa con ese ID",
        });
      }
      User.findOneAndUpdate(
        { userID: companyDB.userID },
        { $set: { email: companyDB.email } },
        { new: true }
      ).then((companyDB) => {
        res.json({
          ok: true,
          company: companyDB,
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.json(err);
    });
};

export const registerAndApproveCompany = async (req, res) => {
  console.log(req.body);
  const {
    email,
    businessName,
    branchEncargado,
    tradeName,
    phone,
    mobile_number,
    country,
    address,
    department,
    municipality,
    bank_name,
    bank_owner,
    bank_type_account,
    bank_number,
    contactFullName,
    contactPhone,
    contactEmail,
    nit,
    nrc,
    billing_type,
    billing_period,
    // imgs,
  } = req.body;


  // Set nit and nrc to empty string if they are empty
  const nitValue = nit || "";
  const nrcValue = nrc || "";
  const bank_nameValue = bank_name || "";
  const bank_ownerValue = bank_owner || "";
  const bank_type_accountValue = bank_type_account || "";
  const bank_numberValue = bank_number || "";

  try {
    // Check if req.files is not null and if req.files.file is present
    let file = req.files && req.files.file ? req.files.file : null;
    let image;

    const newCompany = new Company({
      email,
      businessName,
      branchEncargado,
      tradeName,
      phone,
      mobile_number,
      country,
      address,
      department,
      municipality,
      contactFullName,
      contactPhone,
      contactEmail,
      nit: nitValue,
      nrc: nrcValue,
      bank_name: bank_nameValue,
      bank_owner: bank_ownerValue,
      bank_type_account: bank_type_accountValue,
      bank_number: bank_numberValue,
      // imgs,
      billing_type,
      billing_period,
    });

    if (!file) {
      // Check if a company with the same email, nit, or nrc already exists
      const gatherer = await Company.findOne({
        $or: [{ email: email }],
      });

      if (gatherer) {
        return res.status(400).json({
          ok: false,
          message: "Ya existe un registro con ese email, nit y/o nrc",
        });
      } else {
        // Save the new company
        const newCompanySaved = await newCompany.save();

        // Generate a random password for the company owner
        const { plain: randomPass, hashed: newPassword } = generateSecurePassword();

        // Create a user for the company
        const userCreated = await createUserForCompany(newCompany, randomPass);

        // Update the company status and assign the owner
        await Company.findByIdAndUpdate(newCompanySaved._id, {
          $set: { status: "active", ownerID: userCreated._id, isNewCompany: "true" },
        }).exec();

        // Set the new password for the user
        userCreated.password = newPassword;
        await userCreated.save();

        // Send emails
        const welcomeEmailContent =
          "<div>" +
          "<p>Hemos recibido tu solicitud y estamos verificando tus datos.</p>" +
          "<p>Una vez verificada tu información, recibirás otro correo con las credenciales para ingresar a la plataforma.</p>" +
          "<br>" +
          "<p>Atte:</p>" +
          "<p><strong>Recirculapp</strong></p>" +
          "</div>";
        await sendEmail(
          email,
          "Gracias por tu registro.",
          welcomeEmailContent,
          "Recirculapp Info"
        );

        // Send an email with login credentials to the company owner
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
        await sendEmail(
          userCreated.email,
          "Usuario activado.",
          emailContent,
          "Recirculapp Info"
        );

        res.status(200).json({
          ok: true,
          message: "Company created",
        });
      }
    } else {
      // Handle the case when a file is provided (similar logic as in your existing code)
      let ext = file.name.split('.').pop();
      let tmp_name = new Date().getTime() + "." + ext;
      await file.mv(`tmp/${tmp_name}`);

      let serverPath = `tmp/${tmp_name}`;

      let filename = 'company-';
      let newfilename = filename + uuidv4();

      let objectImage = {
        filename: newfilename,
        path: serverPath,
        mimetype: file.mimetype,
      }

      const result = await uploadToBucket2("filemanagerrecir", objectImage, newfilename);
      await unlinkAsync(serverPath);
      image = result.Location;

      const gatherer = await Company.findOne({
        $or: [{ email: email }, { nrc: nrc }, { nit: nit }],
      });

      if (gatherer) {
        return res.status(400).json({
          ok: false,
          message: "Ya existe un registro con ese email, nit y/o nrc",
        });
      } else {

        newCompany.imgs = [image];

        // Save the new company
        const newCompanySaved = await newCompany.save();

        // Generate a random password for the company owner
        const { plain: randomPass, hashed: newPassword } = generateSecurePassword();

        // Create a user for the company
        const userCreated = await createUserForCompany(newCompany, randomPass);

        // Update the company status and assign the owner
        await Company.findByIdAndUpdate(newCompanySaved._id, {
          $set: { status: "active", ownerID: userCreated._id, isNewCompany: "true" },
        }).exec();

        // Set the new password for the user
        userCreated.password = newPassword;
        await userCreated.save();

        const notifyEmailContent =
          "<div>" +
          "<p>Nueva solicitud de empresa en la plataforma.</p>" +
          `<p>Correo de la solicitd: ${email} </p>` +
          "<br>" +
          "<p>Atte:</p>" +
          "<p><strong>Recirculapp</strong></p>" +
          "</div>";

        const welcomeEmailContent =
          "<div>" +
          "<p>Hemos recibido tu solicitud y estamos verificando tus datos.</p>" +
          "<p>Una vez verificada tu información, recibirás otro correo con las credenciales para ingresar a la plataforma.</p>" +
          "<br>" +
          "<p>Atte:</p>" +
          "<p><strong>Recirculapp</strong></p>" +
          "</div>";

        // Send an email with login credentials to the company owner
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

        await sendEmail(
          ["jcarranza@gmail.com", "roberto.climaco@recirculapp.com"],
          "Nuevo registro.",
          notifyEmailContent,
          "Notificaciones: Empresa Solicitud Nueva"
        );
        await sendEmail(
          email,
          "Gracias por tu registro.",
          welcomeEmailContent,
          "Recirculapp Info"
        );

        await sendEmail(
          userCreated.email,
          "Usuario activado.",
          emailContent,
          "Recirculapp Info"
        );

        return res.status(200).json({
          ok: true,
          message: "Company created",
        });
      }

    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, message: "Error al actualizar" });
  }
};
