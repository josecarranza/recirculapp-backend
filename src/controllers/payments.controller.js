import Trans from "../models/trans_details.model";
import Pay from "../models/pay.model";
import Order from "../models/order.model";
import User from "../models/usuario.model";
import Branch from "../models/branch.model";
import Companies from "../models/companies.model";
const soapRequest = require("easy-soap-request");
const { transform, prettyPrint } = require("camaro");
const xml2js = require("xml2js");
import config from "../config";
import { sendEmailBill } from "../helpers/emailTemplates";
import { sendEmailOrder } from "../helpers/emailTemplates";
import Reserved from "../models/reserved.model";
import createError from 'http-errors';
// Helper function to send emails
import { sendEmail } from './../helpers/emailHelper';

function newPrice(amount) {
  console.log(amount);
  amount = Number(amount);
  amount = amount.toFixed(2);
  console.log(amount);
  amount *= 100;
  amount = amount.toFixed(0);
  amount = amount.toString();
  const cicles = 12 - amount.length;
  for (let index = 0; index < cicles; index++) {
    amount = "0" + amount;
  }
  return amount;
}

async function transformDataXmlToJson(body, template, newPay, res) {
  xml2js.parseString(body, (err, result) => {
    if (err) {
      console.error(err);
      return res
        .status(404)
        .json({ ok: false, message: "Error de comunicación con serfinsa." });
    }
    let json = JSON.stringify(result, null, 4);
    json = JSON.parse(json);

    let code =
      json["S:Envelope"]["S:Body"][0]["ns2:cardtransactionResponse"][0][
      "return"
      ][0];
    if (code.includes("0005") && code.includes("ERROR ENVIANDO ISO")) {
      return res
        .status(404)
        .json({ ok: false, message: "Error de comunicación con serfinsa." });
    }
  });
  const result = await transform(body, template);
  console.log(result);

  if (JSON.parse(result[0].return.includes("Error Enviando Iso."))) {
    return res
      .status(404)
      .json({ ok: false, message: "Error, los datos no son correctos." });
  }
  if (JSON.parse(result[0].return)["cliente_Trans_Respuesta"] == "00") {
    createPay(newPay, JSON.parse(result[0].return), "00", res);
  } else {
    createPay(newPay, JSON.parse(result[0].return), "10", res);
  }
}

function returnXml(
  card_number,
  cvv,
  expirate_date,
  amount,
  method,
  id,
  reciboId
) {
  return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservices.serfinsa.sysdots.com/">
 <soapenv:Header/>
 <soapenv:Body>
 <web:cardtransaction>
    <!--Optional:-->
    <security>{"comid":"SERVUNITYBA","comkey":"$erfins@BA","comwrkstation":"WORKUNITYBA"}</security>
    <!--Optional:-->
    <txn>MANCOMPRANOR</txn>
    <!--Optional:-->
<message>
{"CLIENTE_TRANS_TARJETAMAN":"${card_number}", <!-- CAPTURAR EN FORMLARIO-->
"CLIENTE_TRANS_MONTO":"${newPrice(amount)}", <!-- CAPTURAR EN FORM.EL MONTO LOS ULTIMOS 2 DIGITOS SON DECIMALES PARA EL CASO $ 0.27-->
"CLIENTE_TRANS_AUDITNO":"${id}", <!-- CONTROL DEL CLIENTE -->
"CLIENTE_TRANS_TARJETAVEN":"${expirate_date}", <!-- CAPTURAR VENCIM AAMM -->
"CLIENTE_TRANS_MODOENTRA":"012", <!-- 012 ENTRADA MANUAL -->
"CLIENTE_TRANS_TERMINALID":"50004131", <!-- ASIGNADA POR SERFINSA-->
"CLIENTE_TRANS_RETAILERID":"000005000210701", <!-- ASIGNADA POR SERFINSA-->
"CLIENTE_TRANS_RECIBOID":"${reciboId}", <!-- CONTROL DEL CLIENTE -->
"CLIENTE_TRANS_TOKENCVV":"1611 ${cvv}"} <!-- CAPTURAR EN FORMLARIO EL CVV EL QUE SE ENVIA 333 PARA EL CASO-->
</message>
 </web:cardtransaction>
</soapenv:Body>
</soapenv:Envelope>
`;
}

const ORDER_STATUSES = {
  CONFIRMADA: "CONFIRMADA",
  RESERVED: "reserved",
};

export async function setPaymentData(req, res) {
  try {
    let { NoDeOrden: orderId, userID, branchID, companyID, quantity } = req.body;

    if (!orderId) {
      throw createError(400, "Order ID is required");
    }

    let order = await Order.findById(orderId).exec();

    if (!order) {
      throw createError(404, "Order not found");
    }

    let { ownerID, subcategories, order_n, subtotal, subtotalEnterprice, subOrdersIDs } = order;

    console.log("branchID from Order: ", order.branchID);

    order.status = ORDER_STATUSES.CONFIRMADA;
    order.fecha_recoleccion = new Date();
    await order.save();

    let user = await User.findById(userID).exec();
    let userEmail = await user?.email || "";
    console.log("userEmail is: " + userEmail);

    const branchOrder = order.branchID;
    console.log("branchOrder is: " + branchOrder);

    let branch = await Branch.findById(branchOrder).exec();
    let branchName = await branch?.branchName || "";
    console.log("branchName is: " + branchName);
    let branchEmail = await branch?.email || "";
    let branchOwner = await branch?.ownerID || "";
    console.log("branchOwner is: " + branchOwner);
    let branchDepartment = await branch?.department || "";
    console.log("branchDepartment is: " + branchDepartment);
    let branchMunicipality = await branch?.municipality || "";
    console.log("branchMunicipality is: " + branchMunicipality);
    let branchAddress = await branch?.address || "";
    console.log("branchAddress is: " + branchAddress);

    let company = await Companies.findById({ _id: order.companyID }).exec();
    let businessName = company?.businessName || "";

    let recolector = await User.findById(ownerID).exec();
    let recolectorName = await recolector?.username || "";
    let recolectorEmail = await recolector?.email || "";
    console.log("recolectorEmail is: " + recolectorEmail);

    let newSubOrders = subcategories
      .map((subcategory) => {
        console.log('ownerID is: ' + subcategory.ownerID);

        if (subcategory.ownerID) {
          subcategory.status = ORDER_STATUSES.RESERVED;
          let subtotales = parseFloat(subcategory.subtotal);
          return subtotales;
        }
        return null;
      })
      .filter(subtotales => subtotales !== null);

    let total = newSubOrders.reduce((a, b) => eval(a + b), 0);
    console.log('Total is: ' + total);

    let totalRounded = Math.round(total * 100) / 100;

    let newSubOrdersEnterprise = subcategories
      .map((subcategory) => {
        console.log('ownerID is: ' + subcategory.ownerID);

        if (subcategory.ownerID) {
          subcategory.status = ORDER_STATUSES.RESERVED;
          let subtotales = parseFloat(subcategory.subtotalEnterprice);
          return subtotales;
        }
        return null;
      })
      .filter(subtotales => subtotales !== null);

    let totalEnterprise = newSubOrdersEnterprise.reduce((a, b) => eval(a + b), 0);
    console.log('Total Enterprise is: ' + totalEnterprise);

    var data = {
      userEmail,
      orderNumber: order_n,
      date: new Date().toLocaleDateString(),
      quantity,
      subtotal,
      subtotalEnterprice,
      subOrdersIDs,
      branchName,
      branchID: order.branchID,
      branchEmail,
      branchDepartment,
      branchMunicipality,
      branchAddress,
      companyID: order.companyID,
      newSubOrders,
      recolectorName,
      recolectorEmail,
      total,
      totalEnterprise,
      businessName,
    };

    console.log(JSON.stringify(data));
    await sendEmailOrder(data);

    res.status(200).json({ ok: true, msg: `ID Order: ${order_n}, Status: ${ORDER_STATUSES.CONFIRMADA}` });
  } catch (error) {
    console.error(error);
    res.status(error.statusCode || 500).json({ ok: false, msg: error.message || "Internal server error" });
  }
}


export const payment = async (req, res) => {
  const { userId } = req;
  const reciboId = new Date().getTime().toString();
  const recId = Date.parse(new Date());
  recId = recId.toString().slice(7);
  const id = new Date().getTime().toString();
  id = id.slice(7);
  const {
    full_name,
    email,
    phone,
    department,
    municipality,
    order,
    card_number,
    cvv,
    expirate_date,
  } = req.body;

  const amount = order.total;

  const newOrder = {
    full_name,
    email,
    phone_number: phone,
    department,
    municipality,
    amount: order.total,
    userID: userId,
    amount: order.total,
    reciboId: recId,
    auditnoId: id,
    orderID: order._id,
    order,
  };
  const url =
    "https://pg.redserfinsa.com:2121/WebPubTransactor/TransactorWS?WSDL";
  const sampleHeaders = {
    "Content-Type": "text/xml;charset=UTF-8",
  };
  (async () => {
    try {
      const { response } = await soapRequest({
        url: url,
        headers: sampleHeaders,
        xml: returnXml(
          card_number,
          cvv,
          expirate_date,
          amount,
          "MANCOMPRANOR",
          id,
          recId
        ),
        //  timeout: 30000,
      }); // Optional timeout parameter(milliseconds)
      const { headers, body, statusCode } = response;

      res.contentType("application/json");
      const template = [
        "S:Envelope/S:Body/ns2:cardtransactionResponse",
        {
          return: "title-case(return)",
        },
      ];

      transformDataXmlToJson(
        body,
        template,
        { ...newOrder, reciboId: recId },
        res
      );
    } catch (e) {
      console.log(e);

      console.log("Entro a catch, no se hizo la peticion");
      let error = JSON.stringify(e, Object.getOwnPropertyNames(e));
      error = JSON.parse(error);
      console.log(error);
      console.log(error.message);

      if (
        (error.message.includes("timeout") &&
          error.message.includes("exceeded")) ||
        error.code.includes("ETIMEDOUT")
      ) {
        const { response } = await soapRequest({
          url: url,
          headers: sampleHeaders,
          xml: returnXml(
            card_number,
            cvv,
            expirate_date,
            amount,
            "MANCOMPRANORR",
            id,
            recId
          ),
          timeout: 30000,
        }); // Optional timeout parameter(milliseconds)
        const { headers, body, statusCode } = response;
        console.log(body);
        console.log(statusCode);
        res.contentType("application/json");
        const template = [
          "S:Envelope/S:Body/ns2:cardtransactionResponse",
          {
            return: "title-case(return)",
          },
        ];
        res.status(404).json({
          ok: false,
          message: "Error de tiempo de comunicación con serfinsa",
        });
        //transformDataXmlToJson(body, template, newOrder, res)
      } else if (error.code) {
        console.log("Todo bien");
      }
    }
  })();
};

async function createPay(pay, trans, value, res) {
  const date = new Date().toISOString().slice(0, 10);
  const [yyyy, mm, dd] = date.split("-");
  const formattedDate = `${dd}/${mm}/${yyyy}`;
  Pay.create(pay)
    .then(async (payDB) => {
      Order.findOne({ _id: pay.order._id })
        .populate("subcategories.subcategory")
        .exec()
        .then(async (order) => {
          const count = 0;
          console.log(pay.userID);
          const reservedSubOrders = order.subcategories.map((sub) => {
            console.log(sub.ownerID);

            if (sub.ownerID == pay.userID) {
              sub.status = "payed";
              return sub;
            } else {
              count += 1;
              return sub;
            }
          });
          const newSubOrders = reservedSubOrders.filter((sub) => sub != null);

          console.log(newSubOrders);

          if (count === 0) {
            order.status = "payed";
          } else {
            order.status = "pending-complete-payed";
          }

          order.subcategories = newSubOrders;
          await order.save();

          let PET = 0;
          let PP = 0;
          let HDPE = 0;
          let LDPE = 0;
          let LATAS = 0;
          let PAPEL = 0;
          let CARTON = 0;

          let SUMEQPET = 0;
          let SUMEQPP = 0;
          let SUMEQHDPE = 0;
          let SUMLDPE = 0;
          let SUMLATAS = 0;
          let SUMPAPEL = 0;
          let SUMCARTON = 0;

          let SUMEQPETMJ = 0;
          let SUMEQPPMJ = 0;
          let SUMEQHDPEMJ = 0;
          let SUMLDPEMJ = 0;
          let SUMLATASMJ = 0;
          let SUMPAPELMJ = 0;
          let SUMCARTONMJ = 0;

          let SUMEQPETAGUA = 0;
          let SUMEQPPAGUA = 0;
          let SUMEQHDPEAGUA = 0;
          let SUMLDPEAGUA = 0;
          let SUMLATASAGUA = 0;
          let SUMPAPELAGUA = 0;
          let SUMCARTONAGUA = 0;

          let SUMEQPETAR = 0;
          let SUMEQPPAR = 0;
          let SUMEQHDPEAR = 0;
          let SUMLDPEAR = 0;
          let SUMLATASAR = 0;
          let SUMPAPELAR = 0;
          let SUMCARTONAR = 0;
          const subordersFilter = order.subcategories.filter(
            (sub) => sub.ownerID == pay.userID && sub.status == "payed"
          );
          order.subcategories = subordersFilter;
          subordersFilter.forEach((suborder) => {
            if (suborder.subcategory.subCategoryName == "PLASTICO PET/PETE") {
              PET += suborder.quantity;
              SUMEQPET = (PET / 2204) * suborder.subcategory.eq;
              SUMEQPETMJ = (PET / 2204) * suborder.subcategory.eq_mj;
              SUMEQPETAGUA = (PET / 2204) * suborder.subcategory.eq_water;
              SUMEQPETAR = (PET / 2204) * suborder.subcategory.eq_ar;
            }
            if (suborder.subcategory.subCategoryName == "PLASTICO PP") {
              PP += suborder.quantity;
              SUMEQPP = (PP / 2204) * suborder.subcategory.eq;
              SUMEQPPMJ = (PP / 2204) * suborder.subcategory.eq_mj;
              SUMEQPPAGUA = (PP / 2204) * suborder.subcategory.eq_water;
              SUMEQPPAR = (PP / 2204) * suborder.subcategory.eq_ar;
            }
            if (suborder.subcategory.subCategoryName == "PLASTICO HDPE") {
              HDPE += suborder.quantity;
              SUMEQHDPE = (HDPE / 2204) * suborder.subcategory.eq;
              SUMEQHDPEMJ = (HDPE / 2204) * suborder.subcategory.eq_mj;
              SUMEQHDPEAGUA = (HDPE / 2204) * suborder.subcategory.eq_water;
              SUMEQHDPEAR = (HDPE / 2204) * suborder.subcategory.eq_ar;
            }
            if (suborder.subcategory.subCategoryName == "PLASTICO LDPE") {
              LDPE += suborder.quantity;
              SUMLDPE = (LDPE / 2204) * suborder.subcategory.eq;
              SUMLDPEMJ = (LDPE / 2204) * suborder.subcategory.eq_mj;
              SUMLDPEAGUA = (LDPE / 2204) * suborder.subcategory.eq_water;
              SUMLDPEAR = (LDPE / 2204) * suborder.subcategory.eq_ar;
            }
            if (suborder.subcategory.subCategoryName == "LATAS") {
              LATAS += suborder.quantity;
              SUMLATAS = (LATAS / 2204) * suborder.subcategory.eq;
              SUMLATASMJ = (LATAS / 2204) * suborder.subcategory.eq_mj;
              SUMLATASAGUA = (LATAS / 2204) * suborder.subcategory.eq_water;
              SUMLATASAR = (LATAS / 2204) * suborder.subcategory.eq_ar;
            }
            if (suborder.subcategory.subCategoryName == "PAPEL BOND") {
              PAPEL += suborder.quantity;
              SUMPAPEL = (PAPEL / 2204) * suborder.subcategory.eq;
              SUMPAPELMJ = (PAPEL / 2204) * suborder.subcategory.eq_mj;
              SUMPAPELAGUA = (PAPEL / 2204) * suborder.subcategory.eq_water;
              SUMPAPELAR = (PAPEL / 2204) * suborder.subcategory.eq_ar;
            }
            if (suborder.subcategory.subCategoryName == "CARTON") {
              CARTON += suborder.quantity;
              SUMCARTON = (CARTON / 2204) * suborder.subcategory.eq;
              SUMCARTONMJ = (CARTON / 2204) * suborder.subcategory.eq_mj;
              SUMCARTONAGUA = (CARTON / 2204) * suborder.subcategory.eq_water;
              SUMCARTONAR = (CARTON / 2204) * suborder.subcategory.eq_ar;
            }
          });
          const TON = (
            (PET + PP + HDPE + LDPE + LATAS + PAPEL + CARTON) *
            0.000454
          ).toFixed(2);

          const TON_CO2 = (
            SUMEQPET +
            SUMEQPP +
            SUMEQHDPE +
            SUMLDPE +
            SUMLATAS +
            SUMPAPEL +
            SUMCARTON
          ).toFixed(2);
          const TOTAL_LB = (
            (PET + PP + HDPE + LDPE + LATAS + PAPEL + CARTON) *
            2.20462
          ).toFixed(2);

          const MJ_ENERGIA = (
            SUMEQPETMJ +
            SUMEQPPMJ +
            SUMEQHDPEMJ +
            SUMLDPEMJ +
            SUMLATASMJ +
            SUMPAPELMJ +
            SUMCARTONMJ
          ).toFixed(2);

          const M_AGUA = (
            SUMEQPETAGUA +
            SUMEQPPAGUA +
            SUMEQHDPEAGUA +
            SUMLDPEAGUA +
            SUMLATASAGUA +
            SUMPAPELAGUA +
            SUMCARTONAGUA
          ).toFixed(2);

          const ARBOLES = (
            SUMEQPETAR +
            SUMEQPPAR +
            SUMEQHDPEAR +
            SUMLDPEAR +
            SUMLATASAR +
            SUMPAPELAR +
            SUMCARTONAR
          ).toFixed(2);

          await sendEmailBill("factura", {
            ...pay,
            suborder: order,
            statistics: { TON, TON_CO2, TOTAL_LB, MJ_ENERGIA, M_AGUA, ARBOLES },
            date: formattedDate,
          });
        });

      Trans.create({
        ...trans,
        payID: payDB._id,
        userID: payDB.userID,
      })
        .then(async (transDB) => {
          if (value == "00") {
            res.status(200).json({
              ok: true,
              orden_detail: transDB,
            });
          } else {
            res.status(404).json({
              ok: false,
              orden_detail: transDB,
            });
          }
        })
        .catch((err) => {
          console.log(err);
          res.json({ ok: false, message: err });
        });
    })
    .catch((err) => {
      console.log(err);
      res.json({ ok: false, message: err });
    });
}

export const sendBill = async (req, res) => {
  const data = { full_name: "Gerardo Bladimir Tobar Ramos" };

  await sendEmailBill("factura", data);

  res.json("Ok");
};
