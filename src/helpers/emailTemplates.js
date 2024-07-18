// import sgMail from "@sendgrid/mail";
import pdf from "pdf-creator-node";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import config from "../config";
import Bill from "../models/bill.model";
import Order from "../models/order.model";
import { uploadBill } from "../helpers/s3";
import puppeteer from "puppeteer";
// Helper function to send emails
import { sendEmail } from './../helpers/emailHelper';

const unlinkAsync = promisify(fs.unlink);

// sgMail.setApiKey(config.SENDGRID_API_KEY);

export const sendEmailOrder = async (data) => {
  try {
    const emailRecolector = {
      to: data.recolectorEmail,
      from: {
        name: "Recirculapp Orden",
        email: "info@recirculapp.com",
      },
      headers: { Priority: "Urgent", Importance: "high" },
      subject: "Recirculapp Orden Reservada",
      html: `
      <!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Orden Reservada Exitosamente</title>
</head>

<body>
    <h1>Recirculapp 🌎</h1>
    <p>Querida(o) Recirculamiga(o),</p>
    <p>La orden ha sido recolectada</p>
    <table>
        <tbody>
            <tr>
                <td>Nombre de la Empresa:</td>
                <td>${data.businessName}</td>
            </tr>
            <tr>
                <td>Nombre de la Sucursal:</td>
                <td>${data.branchName}</td>
            </tr>
            <tr>
                <td>Dirección:</td>
                <td>${data.branchDepartment}, ${data.branchMunicipality}, ${data.branchAddress}</td>
            </tr>
            <tr>
                <td>No. Orden:</td>
                <td>${data.orderNumber}</td>
            </tr>
            <tr>
                <td>Fecha: </td>
                <td>${data.date}</td>
            </tr>
            <tr>
                <td>Monto total: </td>
                <td>$: ${data.total}</td>
            </tr>
        </tbody>
    </table>

    <p>Si tiene alguna pregunta o inquietud sobre su orden, no dude en contactarnos a info@recirculapp.com

    <p>Tenga un maravilloso dia!</p>
</body>

</html>
      `,
    };

    const emailCompany = {
      to: data.branchEmail,
      from: {
        name: "Recirculapp Orden",
        email: "info@recirculapp.com",
      },
      headers: { Priority: "Urgent", Importance: "high" },
      subject: "Recirculapp Orden Reservada",
      html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Orden Reservada Exitosamente</title>
        </head>
          <body>
          <h1>Recirculapp 🌎</h1>
          <p>Querida(o) Recirculamiga(o),</p>
          <p>La orden ha sido recolectada</p>
          <table>
            <tbody>
              <tr>
                <td>Recolector:</td>
                <td>${data.recolectorName}</td>
              </tr>
              <tr>
                <td>Correo del Recolector:</td>
                <td>${data.recolectorEmail}</td>
              </tr>
              <tr>
                <td>No. Orden:</td>
                <td>${data.orderNumber}</td>
              </tr>
              <tr>
                <td>Fecha: </td>
                <td>${data.date}</td>
              </tr>
              <tr>
                <td>Monto total: </td>
                <td>$: ${data.totalEnterprise}</td>
              </tr>
            </tbody>
          </table>

          <p>Si tiene alguna pregunta o inquietud sobre su orden, no dude en contactarnos a info@recirculapp.com

          <p>Tenga un maravilloso dia!</p>
        </body>
      </html>
      `,
    };

    const emailMardo = {
      to: ["jcarranza@gmail.com", "roberto.climaco@recirculapp.com"],
      from: {
        name: "Notificaciones: Nueva Orden Recolectada",
        email: "info@recirculapp.com",
      },
      headers: { Priority: "Urgent", Importance: "high" },
      subject: "Recirculapp Nueva Orden Recolectada",
      html: `
      <body>
        <table>
          <div>
            <tbody>
              <tr>
                <td>Nombre de la Empresa:</td>
                <td>${data.businessName}</td>
              </tr>
              <tr>
                <td>ID Empresa:</td>
                <td>${data.companyID}</td>
              </tr>
              <tr>
                <td>Nombre de la Sucursal:</td>
                <td>${data.branchName}</td>
              </tr>
              <tr>
                <td>ID Sucursal:</td>
                <td>${data.branchID}</td>
              </tr>
              <tr>
                <td>Dirección:</td>
                <td>${data.branchDepartment}, ${data.branchMunicipality}, ${data.branchAddress}</td>
              </tr>
              <tr>
                <td>Recolector:</td>
                <td>${data.recolectorName}</td>
              </tr>
              <tr>
                <td>Correo del Recolector:</td>
                <td>${data.recolectorEmail}</td>
              </tr>
              <tr>
                <td>Correo del User:</td>
                <td>${data.userEmail}</td>
              </tr>
              <tr>
                <td>No. Orden:</td>
                <td>${data.orderNumber}</td>
              </tr>
              <tr>
                <td>Fecha: </td>
                <td>${data.date}</td>
              </tr>
              <tr>
                <td>Monto total Recolector: </td>
                <td>$: ${data.total}</td>
              </tr>
              <tr>
                <td>Monto total Empresa: </td>
                <td>$: ${data.totalEnterprise}</td>
              </tr>
            </tbody>
          </div>
        </table>
      </body>
      `,
    };

    await sendEmail(data.recolectorEmail, "Recirculapp Orden Reservada", emailRecolector.html);
    console.log("Email Client sent");
    await sendEmail(data.branchEmail, "Recirculapp Orden Reservada", emailCompany.html);
    console.log("Email Company sent");
    await sendEmail(emailMardo.to, "Recirculapp Nueva Orden Recolectada", emailMardo.html);
    console.log("Email Mardo sent");

  } catch (error) {
    console.log(error);
  }
};

export const sendEmailBill = async (templateName, data) => {
  try {
    const browser = await puppeteer.launch(
      {
        executablePath: '/usr/bin/google-chrome-stable',
      }
    );
    const page = await browser.newPage();

    const pathHtml = path.resolve(__dirname, `../templates/${templateName}.html`);
    const html = fs.readFileSync(pathHtml, 'utf-8');

    await page.setContent(html);

    const idPdf = Date.now();
    const pdfPath = path.resolve(__dirname, `../bills/bill-${idPdf}.pdf`);

    const options = {
      path: pdfPath,
      format: 'A4',
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm',
      },
    };

    await page.pdf(options);
    await browser.close();

    // Rest of the code remains the same...
    const result = await uploadBill(
      'filemanagerrecir',
      pdfPath,
      `bill-${'prueba'}-${idPdf}.pdf`
    );

    // Rest of the code remains the same...
    const attachment = fs.readFileSync(pdfPath).toString('base64');

    // Rest of the code remains the same...
    const emailClient = {
      to: data.email,
      // to: 'arcetechnologies@gmail.com',
      from: {
        name: "Recirculapp Pay",
        email: "info@recirculapp.com",
      },
      headers: { Priority: "Urgent", Importance: "high" },
      templateId: "d-a46d4bb8f4e34bb2aa4118ee9f517369",
      dynamicTemplateData: {
        ...data,
        subject: `Comprobante de pago Orden No. ${data.orderID}`,
        fee: newTotalWithFee.toFixed(2),
        feeTotal: totalWithfee.toFixed(2),
        amount: newAmount.toFixed(2)
      },
      attachments: [
        {
          content: attachment.toString('base64'),
          filename: `bill-${data._id}-${idPdf}.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    };
    // await sgMail.send(emailClient);

    //Eliminar el pdf de la carpeta
    try {
      //await unlinkAsync(pdfPath);
    } catch (error) {
      console.log(error);
    }
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};


export const sendEmailBillAdmin = async (templateName, data) => {
  try {
    const html = fs.readFileSync(
      path.resolve("helpers/", `../src/templates/${templateName}.html`),
      "utf-8"
    );
    const idPdf = Date.now();
    const options = {
      format: "A4",
      orientation: "portrait",
    };

    const document = {
      html,
      data,
      path: `./src/bills/bill-${idPdf}.pdf`,
      type: "application/pdf",
    };

    const bill = await pdf.create(document, options);

    const attachment = fs
      .readFileSync(path.resolve("helpers/", `../src/bills/bill-${idPdf}.pdf`))
      .toString("base64");
    const emailClient = {
      to: "geratobe@gmail.com",
      from: {
        name: "Recirculapp Pay",
        email: "info@vertikalcompany.com",
      },
      subject: "Bill",

      headers: { Priority: "Urgent", Importance: "high" },
      html: "<h1>Hola</h1>",
      attachments: [
        {
          content: attachment,
          filename: "bill.pdf",
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    };

    // await sgMail.send(emailClient);

    //Eliminar el pdf de la carpeta
    try {
      await unlinkAsync(bill.filename);
    } catch (error) {
      console.log(error);
    }
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};
