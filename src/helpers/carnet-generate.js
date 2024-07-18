import fs from "fs";
import path from "path";
import { promisify } from "util";
import config from "../config";
import puppeteer from 'puppeteer-core';

// Helper function to send emails
import { sendEmail } from './../helpers/emailHelper';

const unlinkAsync = promisify(fs.unlink);

export const GenerateCarnet = async (data) => {
  console.log(data);
  try {
    const pathHtml = path.resolve(__dirname, `../templates/carnet.html`);
    let html = fs.readFileSync(pathHtml, "utf-8");
    html = html.replace('{{fullName}}', data.fullName);
    html = html.replace('{{phone}}', data.phone);
    html = html.replace('{{status}}', data.status);
    html = html.replace('{{_id}}', data.userID);
    html = html.replace('{{department}}', data.department);
    html = html.replace('{{municipality}}', data.municipality);
    html = html.replace('{{address}}', data.address);
    html = html.replace('{{email}}', data.email);
    const idPdf = Date.now();
    const options = {
      format: "A4",
      orientation: "portrait",
    };

    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome-stable',
    });
    const page = await browser.newPage();
    await page.setContent(html);
    await page.emulateMediaType('screen');
    const pdfPath = `${path.resolve(__dirname, `../carnets/carnet-${data._id}-${idPdf}.pdf`)}`;
    await page.pdf({ path: pdfPath, format: options.format, landscape: options.orientation === 'landscape' });
    await browser.close();

    const attachment = fs.readFileSync(pdfPath);

    const emailContent = {
      templateId: "d-bc9a554cdcda4b0eb79073442d128314",
      dynamicTemplateData: { ...data },
      attachments: [
        {
          content: attachment.toString('base64'),
          filename: `carnet-${data._id}-${idPdf}.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    };

    const recipients = ["jcarranza@gmail.com", "roberto.climaco@recirculapp.com", data.email];

    for (const recipient of recipients) {
      await sendEmail(
        recipient,
        "Carnet generado con éxito!",
        emailContent,
        "Recirculapp Carnet"
      );
    }

    console.log("Emails sent");

    // Remove the PDF file from the folder
    try {
      await unlinkAsync(pdfPath);
    } catch (error) {
      console.log(error);
    }
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};
