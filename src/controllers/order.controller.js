import Order from "../models/order.model";
import Company from "../models/companies.model";
import Branch from "../models/branch.model";
import Statistics from "../models/statistics.model";
import { statisticsByDatesAdmin } from "../helpers/calculator-statistics";
import webpush from "web-push";
import User from "../models/usuario.model";
import Gatherer from "../models/gatherer.model";
import SubCategory from "../models/subcategory.model";
const xlsx = require('xlsx');
import config from "../config";
const util = require('util');

// Helper function to send emails
import { sendEmail } from './../helpers/emailHelper';

// Redis Caching from Helper
import { redisGetData, redisSetDataWithTTL } from "../helpers/redisHelper";

//Excel JS
import {
  generateExcel,
  generateExcelForTotalWeightByBranchFromTimeRange,
  generateExcelForTotalWeightFromAllBranchesFromTimeRange,
  generateExcelForTotalRevenueFromAllBranchesFromTimeRange,
  generateExcelForTotalOrdersByBranchFromTimeRange,
  generateExcelForTotalOrdersFromAllBranchesFromTimeRange,
  generateExcelForTotalRevenueByBranchFromTimeRange,
  generateExcelForTotalRevenueByBranchNameFromTimeRange,
  generateExcelWithSubcategoryWeight,
  generateExcelForOrdersWithAllDetails,
} from "../helpers/generateExcel";

// Bucket
// const { promisify } = require("util");
const fs = require("fs");
import {
  uploadToBucketExcelFile,
  deleteFiles,
  deleteExcelFile,
  storage
} from "../helpers/s3.helper";

const S3 = require("aws-sdk/clients/s3");




const vapidKeys = {
  "publicKey": "BNmQuH1iA6kLb9hwTR4s69u-nNUdNPAvJjPcqQWdndFcSGhauqiAqSsiE3WZUfexCaPMn51qMYlqMC0qJbCnpw8",
  "privateKey": "R6DIrGqbSxKPDv64veDAohvoRpKkO0jXGbei_rOCRM4"
};

webpush.setVapidDetails(
  'mailto: karce@web-informatica.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
)

const enviarNotificacion = (req, res) => {

  const pushSubscription = {
    endpoint: 'https://wns2-bl2p.notify.windows.com/w/?token=BQYAAABX6TAKjDY1dF7ucRfpz5f4XuK5pnAhpvV3YsdeSz31T5atedvfwpwWVvhkjLGwbiy64qxzHmGodqBtaKn99vgjr2mrCPXje1YU4l4P4FfIcQmkJZA4gogy767z0G1GcBhsStMZdDrgVGoIwpDm1RLvABCd7EIIuqVmre%2Fau9OFbzvbIs9aB28CSUr37S4CDlo56AM%2BCfGO%2FG4wn70rfamcvJX6AeKgJtf%2FA%2BHhRy8vdz%2F5vpsfmll9kM%2FK%2B5QnCVva%2F5ZsX49NiAtyhRQYCd5%2FnoIsXwx0YXs3jzVPaxcl0votgS5auc5yr7UyQzGxqsmty%2FoD5ldIJo81%2FJrYzN9Q',
    keys: {
      auth: 's55avDVEP2lDpUeEB2_csQ',
      p256dh: 'BHt_wLLxoYNadFbqp7nLCRiN36cKmA75Ec_0fPOUlrAGqpPDOfaQzfyq-Wcal05KFzRIx59WuXJLwzIY1C_za_A'
    }
  };

  const payload = {
    notification: {
      title: 'Recirculapp te informa 🤠',
      body: 'Nueva orden 🚚',
      icon: 'https://recirculapp.com/wp-content/uploads/2021/09/logo-recirculapp-2021-480x480.jpg',
      image: 'https://recirculapp.com/wp-content/uploads/2021/09/logo-recirculapp-2021-480x480.jpg',
      vibrate: [100, 50, 100],
      actions: [{
        action: 'explore',
        title: 'Ir a la app',
        icon: 'https://recirculapp.com/wp-content/uploads/2021/09/logo-recirculapp-2021-480x480.jpg'
      }]
    }
  }

  webpush.sendNotification(pushSubscription, JSON.stringify(payload))
    .then(result => res.status(200).json(result))
    .catch(e => res.status(500).json(e))
}

export const registerOrder = async (req, res) => {
  try {
    const monthMap = {
      'January': 'A',
      'February': 'B',
      'March': 'C',
      'April': 'D',
      'May': 'E',
      'June': 'F',
      'July': 'G',
      'August': 'H',
      'September': 'I',
      'October': 'J',
      'November': 'K',
      'December': 'L'
    };

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(currentDate);
    const monthCode = monthMap[monthName];

    const uniqueValue = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `${year}${monthCode}${uniqueValue}`;

    const { userId } = req;

    const {
      category,
      dia,
      hasta_dia,
      desde_dia,
      departamento,
      municipio,
      hora_fija,
      hora_desde,
      total,
      totalEnterprice,
      hora_hasta,
      company,
      address,
      subcategories,
      // companyID,
    } = req.body.order;

    let { companyID } = req.body.order;
    console.log("companyID from Body: " + companyID);

    const validateDate = (date) => {
      return date ? new Date(date) : null;
    };

    const validateInteger = (value) => {
      return Number.isInteger(value) ? value : null;
    };

    const validateOrderFields = () => {
      if (!category || !dia || !total || !totalEnterprice || !companyID) {
        throw new Error("Required fields are missing");
      }
    };

    const validateOrderDateRange = () => {
      const fromDate = validateInteger(desde_dia);
      const toDate = validateInteger(hasta_dia);
      if (fromDate && toDate && fromDate > toDate) {
        throw new Error("The 'desde_dia' field must be less than the 'hasta_dia' field");
      }
    };

    let BranchFoundID; // Declare BranchFoundID variable outside the functions

    const validateCompanyOrBranch = async () => {
      console.log("companyID: " + companyID);
      const companyFound = await Company.findOne({ ownerID: userId });
      const branchFound = await Branch.findOne({ ownerID: userId });
      BranchFoundID = branchFound._id.toString(); // Assign value to BranchFoundID
      console.log("companyFound: " + companyFound);
      console.log("Branch: " + BranchFoundID);
      if (!branchFound) {
        throw new Error("The user must have a branch");
      }
      // if (companyID !== companyFound._id.toString())
      //   throw new Error("The companyID does not match the user's company");
      // return companyFound._id;

    };

    const createOrder = async (companyId) => {
      const subcategoryIds = req.body.order.subcategories.map((subcategory) => subcategory.subcategory);
      const subcategoriesFound = await SubCategory.find({ _id: { $in: subcategoryIds } });

      const updatedSubcategories = req.body.order.subcategories.map((subcategory) => {
        const foundSubcategory = subcategoriesFound.find((sub) => sub._id.toString() === subcategory.subcategory);
        if (foundSubcategory) {
          subcategory.comision_porcentaje = foundSubcategory.comision_porcentaje;
        }
        return subcategory;
      });

      const newOrder = new Order({
        category,
        userID: userId,
        total,
        totalEnterprice,
        companyID: companyID,
        branchID: BranchFoundID,
        departamento,
        municipio,
        date: validateDate(dia),
        hasta_dia: validateDate(hasta_dia),
        desde_dia: validateDate(desde_dia),
        hora_fija,
        company,
        hora_desde,
        hora_hasta,
        address,
        subcategories: updatedSubcategories,
        order_n: orderNumber
      });

      return await newOrder.save();
    };

    validateOrderFields();
    validateOrderDateRange();
    const companyId = await validateCompanyOrBranch();
    const newOrder = await createOrder(companyId);

    res.json({
      ok: true,
      order: newOrder,
      message: "Order created",
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message,
    });
  }
};

export const getAllOrders = async (req, res) => {
  Order.find({})
    .populate("category")
    .populate("userID")
    .populate("ownerID")
    .populate("companyID")
    .populate("subcategories.subcategory")
    .exec()
    .then((orders) => {
      res.json({ ok: true, orders: orders });
    })
    .catch((err) => {
      res.json(err);
    });
};

export const getOrdersBySucursal = async (req, res) => {
  try {
    const { userId } = req;
    const orders = await Order.find({ userID: userId })
      .populate([
        "companyID",
        "branchID",
        "ownerID",
        "category",
        "userID",
        "subcategories.subcategory",
      ])
      .sort({ createdAt: -1 })
      .exec();

    const ordersWithUser = [];

    for (const o of orders) {
      const subordersWithUser = [];

      for (const suborder of o.subcategories) {
        const ownerID = suborder.ownerID;
        const users = await User.find({ _id: { $in: ownerID } }).exec();
        const usernames = users.map((user) => user.username || "");

        // Retrieve "dui" field from the Gatherer collection
        const gatherer = await Gatherer.findOne({ userID: ownerID }).exec();
        const dui = gatherer?.dui || ""; // Replace 'dui' with the actual field name

        const suborderWithUser = {
          ...suborder.toObject(),
          user: usernames,
          dui: dui, // Add 'dui' to the suborderWithUser object
        };

        subordersWithUser.push(suborderWithUser);
      }

      const ownerID = o.ownerID;
      const users = await User.find({ _id: { $in: ownerID } }).exec();
      const usernames = users.map((user) => user.username || "");

      const orderData = {
        ...o.toObject(),
        subcategories: subordersWithUser,
        user: usernames,
      };

      ordersWithUser.push(orderData);
    }

    // Sort orders from latest to newest
    ordersWithUser.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const statistics = await statisticsByDatesAdmin(orders);
    res.json({ ok: true, orders: { orders: ordersWithUser, statistics } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, message: "An error occurred" });
  }
};

export const getOrdersByCompanyAll = async (req, res) => {
  try {
    const { companyID } = req.body;
    const orders = await Order.find({ companyID: companyID })
      .populate([
        "category",
        "companyID",
        "ownerID",
        "branchID",
        "userID",
        "subcategories.subcategory",
      ])
      .sort({ createdAt: -1 })
      .exec();

    const ordersWithUser = [];

    for (const o of orders) {
      const subordersWithUser = [];

      for (const suborder of o.subcategories) {
        const ownerID = suborder.ownerID;
        const users = await User.find({ _id: { $in: ownerID } }).exec();
        const usernames = users.map((user) => user.username || "");

        const suborderWithUser = {
          ...suborder.toObject(),
          user: usernames,
        };

        subordersWithUser.push(suborderWithUser);
      }

      const ownerID = o.ownerID;
      const users = await User.find({ _id: { $in: ownerID } }).exec();
      const usernames = users.map((user) => user.username || "");

      const orderData = {
        ...o.toObject(),
        subcategories: subordersWithUser,
        user: usernames,
      };

      ordersWithUser.push(orderData);
    }

    // Sort orders from latest to newest
    ordersWithUser.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const statistics = await statisticsByDatesAdmin(orders);
    res.json({ ok: true, orders: { orders: ordersWithUser, statistics } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, message: "An error occurred" });
  }
};

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [
        { status: "reservation-pending" },
        { status: "pending-complete-payed" },
        { status: "CONFIRMADA" },
        { status: "reserved" },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("category")
      .populate("userID")
      .populate("ownerID")
      .populate("companyID")
      .populate("subcategories.subcategory")
      .populate("branchID")
      .exec();

    let ordersFilter = orders.map((o) => {
      let newTotal = 0;
      let NewTotalEnterprice = 0;
      let suborder = o.subcategories.filter(
        (s) => s.status == "reservation-pending"
      );

      suborder.forEach((sub) => {
        newTotal += sub.subtotal * 1;
        NewTotalEnterprice += sub.subtotalEnterprice * 1;
      });

      o.total = newTotal;
      o.totalEnterprice = NewTotalEnterprice;
      o.subcategories = suborder;
      return o;
    });

    let filterNewOrders = ordersFilter.filter(
      (o) => o.subcategories.length != 0
    );

    console.log(filterNewOrders);

    res.json({ ok: true, orders: filterNewOrders });
  } catch (err) {
    res.json(err);
  }
};


export const getOrdersByCompany = async (req, res) => {
  const { userId } = req;
  console.log(userId);
  Order.find({ userID: userId })
    .populate("category")
    .populate("userID")
    .populate("ownerID")
    .populate("companyID")
    .populate("subcategories.subcategory")
    .exec()
    .then((orders) => {
      res.json({ ok: true, orders: orders });
    })
    .catch((err) => {
      res.json(err);
    });
};

export const getOrdersReserver = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate([
        "category",
        { path: "companyID", model: "Companies" },
        "subcategories.subcategory",
      ])
      .exec();

    const filterReservedOrders = orders.filter((o) => o.status === "reserved");
    const ordersWithUser = [];

    for (const o of filterReservedOrders) {
      const subordersWithUser = [];

      for (const suborder of o.subcategories) {
        if (suborder.status === "reserved") {
          const ownerID = suborder.ownerID;
          const user = await User.findById(ownerID).exec();
          const username = user?.username || "";

          // Retrieve "dui" field from the Gatherer collection
          const gatherer = await Gatherer.findOne({ userID: ownerID }).exec();
          const dui = gatherer?.dui || ""; // Replace 'dui' with the actual field name

          const suborderWithUser = {
            ...suborder.toObject(),
            user: username,
            dui: dui, // Add 'dui' to the suborderWithUser object
          };

          subordersWithUser.push(suborderWithUser);
        }
      }

      const { ownerID } = o;
      const users = await User.find({ _id: { $in: ownerID } }).exec();
      const usernames = users.map((user) => user.username || "");

      const branch = await Branch.findById(o.branchID).exec();
      const branchName = branch?.branchName || "";

      const orderData = {
        ...o.toObject(),
        subcategories: subordersWithUser,
        user: usernames,
        branch: branchName,
      };

      ordersWithUser.push(orderData);
    }

    // Sort orders from the latest (most recent) to the oldest
    ordersWithUser.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ ok: true, orders: ordersWithUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "An error occurred" });
  }
};

export const getCancelledOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("category")
      .populate("userID")
      .populate("companyID")
      .populate("subcategories.subcategory")
      .exec();

    const cancelledOrders = orders.filter((order) => order.status === "cancel");

    // Sort orders from the latest (most recent) to the oldest
    cancelledOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const ordersWithPendingReservations = cancelledOrders.map((order) => {
      const subcategoriesWithPendingReservations = order.subcategories.filter(
        (subcategory) => subcategory.status === "reservation-pending"
      );

      return {
        ...order.toObject(),
        subcategories: subcategoriesWithPendingReservations,
      };
    });

    res.status(200).json({ ok: true, orders: ordersWithPendingReservations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get cancelled orders" });
  }
};


export const getMetricasOrdersForAdmin_OLD = async (req, res) => {
  Order.find({ status: "CONFIRMADA" })
    .populate("subcategories.subcategory")
    .exec()
    .then((orders) => {
      let PET = 0;
      let PP = 0;
      let HDPE = 0;
      let LDPE = 0;
      let LATAS = 0;
      let PAPEL = 0;
      let CARTON = 0;
      let PRUEBA = 0;
      //TARIMA MADERA
      let TMADERA = 0;
      //HIERRO
      let HIERRO = 0;
      //RESIDUO ELECTRONICO
      let RELECTRONICO = 0;

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

      let SUMEQPRUEBA = 0;
      let SUMEQPETMJ2 = 0;
      let SUMEQPETAGUA2 = 0;
      let SUMEQPETAR2 = 0;

      let SUMEQTMADERA = 0;
      let SUMEQHIERRO = 0;
      let SUMEQRELECTRONICO = 0;

      let SUMEQTMADERAMJ = 0;
      let SUMEQHIERROMJ = 0;
      let SUMEQRELECTRONICOMJ = 0;

      let SUMEQTMADERAAGUA = 0;
      let SUMEQHIERROAGUA = 0;
      let SUMEQRELECTRONICOAGUA = 0;


      orders.forEach((order) => {
        console.log(order.subcategories);
        order.subcategories.forEach((suborder) => {
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
          // Calculadora
          if (suborder.subcategory.subCategoryName == "Calculadora") {
            SUMEQPRUEBA = (PRUEBA / 2204) * suborder.subcategory.eq;
            SUMEQPETMJ2 = (PRUEBA / 2204) * suborder.subcategory.eq_mj;
            SUMEQPETAGUA2 = (PRUEBA / 2204) * suborder.subcategory.eq_water;
            SUMEQPETAR2 = (PRUEBA / 2204) * suborder.subcategory.eq_ar;
          }
          // TARIMA MADERA
          if (suborder.subcategory.subCategoryName == "TARIMA MADERA") {
            SUMEQTMADERA = (TMADERA / 2204) * suborder.subcategory.eq;
            SUMEQTMADERAMJ = (TMADERA / 2204) * suborder.subcategory.eq_mj;
            SUMEQTMADERAAGUA = (TMADERA / 2204) * suborder.subcategory.eq_water;
          }

          // HIERRO
          if (suborder.subcategory.subCategoryName == "HIERRO") {
            SUMEQHIERRO = (HIERRO / 2204) * suborder.subcategory.eq;
            SUMEQHIERROMJ = (HIERRO / 2204) * suborder.subcategory.eq_mj;
            SUMEQHIERROAGUA = (HIERRO / 2204) * suborder.subcategory.eq_water;
          }

          // RESIDUO ELECTRONICO
          if (suborder.subcategory.subCategoryName == "RESIDUO ELECTRONICO") {
            SUMEQRELECTRONICO = (RELECTRONICO / 2204) *
              suborder.subcategory.eq;
            SUMEQRELECTRONICOMJ = (RELECTRONICO / 2204) *
              suborder.subcategory.eq_mj;
            SUMEQRELECTRONICOAGUA = (RELECTRONICO / 2204) *
              suborder.subcategory.eq_water;
          }
        });
      });

      res.json({
        ok: true,
        statistics: {
          TON: (
            (PET + PP + HDPE + LDPE + LATAS + PAPEL + CARTON +
              PRUEBA + TMADERA + HIERRO + RELECTRONICO) *
            0.000454
          ).toFixed(2),
          TON_CO2: (
            SUMEQPET +
            SUMEQPP +
            SUMEQHDPE +
            SUMLDPE +
            SUMLATAS +
            SUMPAPEL +
            SUMCARTON +
            SUMEQPRUEBA +
            SUMEQTMADERA +
            SUMEQHIERRO +
            SUMEQRELECTRONICO
          ).toFixed(2),
          TOTAL_LB: (
            (PET + PP + HDPE + LDPE + LATAS + PAPEL + CARTON +
              PRUEBA + TMADERA + HIERRO + RELECTRONICO
            ) *
            2.20462
          ).toFixed(2),
          MJ_ENERGIA: (
            SUMEQPETMJ +
            SUMEQPPMJ +
            SUMEQHDPEMJ +
            SUMLDPEMJ +
            SUMLATASMJ +
            SUMPAPELMJ +
            SUMCARTONMJ +
            SUMEQPETMJ2 +
            SUMEQTMADERAMJ +
            SUMEQHIERROMJ +
            SUMEQRELECTRONICOMJ
          ).toFixed(2),
          M_AGUA: (
            SUMEQPETAGUA +
            SUMEQPPAGUA +
            SUMEQHDPEAGUA +
            SUMLDPEAGUA +
            SUMLATASAGUA +
            SUMPAPELAGUA +
            SUMCARTONAGUA +
            SUMEQPETAGUA2 +
            SUMEQTMADERAAGUA +
            SUMEQHIERROAGUA +
            SUMEQRELECTRONICOAGUA
          ).toFixed(2),

          ARBOLES: (
            SUMEQPETAR +
            SUMEQPPAR +
            SUMEQHDPEAR +
            SUMLDPEAR +
            SUMLATASAR +
            SUMPAPELAR +
            SUMCARTONAR +
            SUMEQPETAR2 +
            SUMEQTMADERAMJ +
            SUMEQHIERROMJ +
            SUMEQRELECTRONICOMJ
          ).toFixed(2),
        },
      });
    });
};

const CONVERSION_FACTOR = 2204; // Define a constant for repeated values

// Helper function to calculate metrics
function calculateMetrics(suborder, quantity) {
  return {
    sumEq: (quantity / CONVERSION_FACTOR) * suborder.subcategory.eq,
    sumEqMJ: (quantity / CONVERSION_FACTOR) * suborder.subcategory.eq_mj,
    sumEqAgua: (quantity / CONVERSION_FACTOR) * suborder.subcategory.eq_water,
    sumEqAr: (quantity / CONVERSION_FACTOR) * suborder.subcategory.eq_ar,
  };
}

export const getMetricasOrdersForAdmin = async (req, res) => {
  try {

    // Retrieve the UID from the request body
    const { userId } = req;
    console.log("userId: " + userId);

    // Define today's date range for checking existing statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to the start of the day

    // Check if a Statistics document for today already exists
    const existingStats = await Statistics.findOne({
      userId: userId,
      createdAt: {
        $gte: today,
        $lt: new Date(today).setDate(today.getDate() + 1)
      }, ROLE: "ADMIN"
    });

    // If statistics for today already exist, return them
    if (existingStats) {
      return res.json({
        ok: true,
        message: 'Statistics for today already exist',
        statistics: existingStats
      });
    }

    // Calculate new statistics
    const orders = await Order.find({ status: "CONFIRMADA" })
      .populate("subcategories.subcategory")
      .exec();

    let materialMetrics = {
      sumEq: 0,
      sumEqMJ: 0,
      sumEqAgua: 0,
      sumEqAr: 0,
      totalQuantity: 0,
    };

    orders.forEach((order) => {
      order.subcategories.forEach((suborder) => {
        const metrics = calculateMetrics(suborder, suborder.quantity);

        materialMetrics.sumEq += metrics.sumEq;
        materialMetrics.sumEqMJ += metrics.sumEqMJ;
        materialMetrics.sumEqAgua += metrics.sumEqAgua;
        materialMetrics.sumEqAr += metrics.sumEqAr;
        materialMetrics.totalQuantity += suborder.quantity;
      });
    });

    // Formatting function to make numbers more readable
    function formatNumber(num) {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
    }

    // Consolidate and format final statistics
    const statistics = {
      TON: formatNumber(materialMetrics.totalQuantity * 0.000454),
      TON_CO2: formatNumber(materialMetrics.sumEq),
      TOTAL_LB: formatNumber(materialMetrics.totalQuantity * 2.20462),
      MJ_ENERGIA: formatNumber(materialMetrics.sumEqMJ),
      M_AGUA: formatNumber(materialMetrics.sumEqAgua),
      ARBOLES: formatNumber(materialMetrics.sumEqAr),
    };

    // Create a new Statistics document
    const newStatistics = new Statistics({
      userId: userId,
      TON: parseFloat(statistics.TON),
      TON_CO2: parseFloat(statistics.TON_CO2),
      TOTAL_LB: parseFloat(statistics.TOTAL_LB),
      MJ_ENERGIA: parseFloat(statistics.MJ_ENERGIA),
      M_AGUA: parseFloat(statistics.M_AGUA),
      ARBOLES: parseFloat(statistics.ARBOLES),
      ROLE: "ADMIN"
    });

    // Save the new document to the database
    await newStatistics.save();

    // Return the newly created statistics
    res.json({
      ok: true,
      message: 'Statistics calculated and saved successfully',
      statistics: newStatistics
    });
  } catch (error) {
    res.status(500).send("Error processing request: " + error.message);
  }
};

export const getMetricasOrdersByCompany = async (req, res) => {
  const { idCompany } = req.body;

  Order.find({ companyID: idCompany, status: "CONFIRMADA" })
    .populate("subcategories.subcategory")
    .exec()
    .then((orders) => {
      console.log(orders);
      let PET = 0;
      let PP = 0;
      let HDPE = 0;
      let LDPE = 0;
      let LATAS = 0;
      let PAPEL = 0;
      let CARTON = 0;
      let PRUEBA = 0;
      let TMADERA = 0;
      let HIERRO = 0;
      let RELECTRONICO = 0;

      let EQPET = 1.45;
      let EQPP = 1.11;
      let EQHDPE = 1.19;
      let EQLDPE = 1.46;
      let EQLATAS = 8.0;
      let EQPAPEL = 2.3;
      let EQCARTON = 2.3;

      let EQPETMJ = 30685;
      let EQPPMJ = 36056;
      let EQHDPEMJ = 34003;
      let EQLDPEMJ = 38973;
      let EQLATASMJ = 0;
      let EQPAPELMJ = 14400;
      let EQCARTONMJ = 14400;

      let EQPETAGUA = 18;
      let EQPPAGUA = 8.21;
      let EQHDPEAGUA = 9.47;
      let EQLDPEAGUA = 14;
      let EQLATASAGUA = 0;
      let EQPAPELAGUA = 50;
      let EQCARTONAGUA = 50;

      let EQPETAR = 0;
      let EQPPAR = 0;
      let EQHDPEAR = 0;
      let EQLDPEAR = 0;
      let EQLATASAR = 0;
      let EQPAPELAR = 17;
      let EQCARTONAR = 17;

      let EQPRUEBA = 1.45;
      let EQPRUEBAMJ = 30685;
      let EQPRUEBAAGUA = 18;
      let EQPRUEBAAR = 0;

      let EQTMADERA = 1.45;
      let EQTMADERAMJ = 30685;
      let EQTMADERAAGUA = 18;
      let EQTMADERAAR = 0;

      let EQHIERRO = 1.45;
      let EQHIERROMJ = 30685;
      let EQHIERROAGUA = 18;
      let EQHIERROAR = 0;

      let EQRELECTRONICO = 1.45;
      let EQRELECTRONICOMJ = 30685;
      let EQRELECTRONICOAGUA = 18;
      let EQRELECTRONICOAR = 0;

      orders.forEach((order) => {
        console.log(order.subcategories);
        order.subcategories.forEach((suborder) => {
          if (suborder.subcategory.subCategoryName == "PLASTICO PET/PETE") {
            PET += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "PLASTICO PP") {
            PP += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "PLASTICO HDPE") {
            HDPE += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "PLASTICO LDPE") {
            LDPE += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "LATAS") {
            LATAS += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "PAPEL BOND") {
            PAPEL += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "CARTON") {
            CARTON += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "Calculadora") {
            PRUEBA += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "TARIMA MADERA") {
            TMADERA += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "HIERRO") {
            HIERRO += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "RESIDUO ELECTRONICO") {
            RELECTRONICO += suborder.quantity;
          }
        });
      });

      let SUMEQPET = (PET / 2204) * EQPET;
      let SUMEQPP = (PP / 2204) * EQPP;
      let SUMEQHDPE = (HDPE / 2204) * EQHDPE;
      let SUMLDPE = (LDPE / 2204) * EQLDPE;
      let SUMLATAS = (LATAS / 2204) * EQLATAS;
      let SUMPAPEL = (PAPEL / 2204) * EQPAPEL;
      let SUMCARTON = (CARTON / 2204) * EQCARTON;
      let SUMEQPRUEBA = (PRUEBA / 2204) * EQPRUEBA;
      let SUMTMADERA = (TMADERA / 2204) * EQTMADERA;
      let SUMHIERRO = (HIERRO / 2204) * EQHIERRO;
      let SUMRELECTRONICO = (RELECTRONICO / 2204) * EQRELECTRONICO;

      let SUMEQPETMJ = (PET / 2204) * EQPETMJ;
      let SUMEQPPMJ = (PP / 2204) * EQPPMJ;
      let SUMEQHDPEMJ = (HDPE / 2204) * EQHDPEMJ;
      let SUMLDPEMJ = (LDPE / 2204) * EQLDPEMJ;
      let SUMLATASMJ = (LATAS / 2204) * EQLATASMJ;
      let SUMPAPELMJ = (PAPEL / 2204) * EQPAPELMJ;
      let SUMCARTONMJ = (CARTON / 2204) * EQCARTONMJ;
      let SUMEQPRUEBAMJ = (PRUEBA / 2204) * EQPRUEBAMJ;
      let SUMTMADERAMJ = (TMADERA / 2204) * EQTMADERAMJ;
      let SUMHIERROMJ = (HIERRO / 2204) * EQHIERROMJ;
      let SUMRELECTRONICOMJ = (RELECTRONICO / 2204) * EQRELECTRONICOMJ;

      let SUMEQPETAGUA = (PET / 2204) * EQPETAGUA;
      let SUMEQPPAGUA = (PP / 2204) * EQPPAGUA;
      let SUMEQHDPEAGUA = (HDPE / 2204) * EQHDPEAGUA;
      let SUMLDPEAGUA = (LDPE / 2204) * EQLDPEAGUA;
      let SUMLATASAGUA = (LATAS / 2204) * EQLATASAGUA;
      let SUMPAPELAGUA = (PAPEL / 2204) * EQPAPELAGUA;
      let SUMCARTONAGUA = (CARTON / 2204) * EQCARTONAGUA;
      let SUMEQPRUEBAAGUA = (PRUEBA / 2204) * EQPRUEBAAGUA;
      let SUMTMADERAAGUA = (TMADERA / 2204) * EQTMADERAAGUA;
      let SUMHIERROAGUA = (HIERRO / 2204) * EQHIERROAGUA;
      let SUMRELECTRONICOAGUA = (RELECTRONICO / 2204) * EQRELECTRONICOAGUA;

      let SUMEQPETAR = (PET / 2204) * EQPETAR;
      let SUMEQPPAR = (PP / 2204) * EQPPAR;
      let SUMEQHDPEAR = (HDPE / 2204) * EQHDPEAR;
      let SUMLDPEAR = (LDPE / 2204) * EQLDPEAR;
      let SUMLATASAR = (LATAS / 2204) * EQLATASAR;
      let SUMPAPELAR = (PAPEL / 2204) * EQPAPELAR;
      let SUMCARTONAR = (CARTON / 2204) * EQCARTONAR;
      let SUMEQPRUEBAAR = (PRUEBA / 2204) * EQPRUEBAAR;
      let SUMTMADERAAR = (TMADERA / 2204) * EQTMADERAAR;
      let SUMHIERROAR = (HIERRO / 2204) * EQHIERROAR;
      let SUMRELECTRONICOAR = (RELECTRONICO / 2204) * EQRELECTRONICOAR;

      res.json({
        ok: true,
        statistics: {
          TON: (
            (PET + PP + HDPE + LDPE + LATAS + PAPEL + CARTON + PRUEBA
              + TMADERA + HIERRO + RELECTRONICO
            ) *
            0.000454
          ).toFixed(2),
          TON_CO2: (
            SUMEQPET +
            SUMEQPP +
            SUMEQHDPE +
            SUMLDPE +
            SUMLATAS +
            SUMPAPEL +
            SUMCARTON +
            SUMEQPRUEBA +
            SUMTMADERA +
            SUMHIERRO +
            SUMRELECTRONICO
          ).toFixed(2),
          TOTAL_LB: (
            (PET + PP + HDPE + LDPE + LATAS + PAPEL + CARTON + PRUEBA
              + TMADERA + HIERRO + RELECTRONICO
            ) *
            2.20462
          ).toFixed(2),
          MJ_ENERGIA: (
            SUMEQPETMJ +
            SUMEQPPMJ +
            SUMEQHDPEMJ +
            SUMLDPEMJ +
            SUMLATASMJ +
            SUMPAPELMJ +
            SUMCARTONMJ +
            SUMEQPRUEBAMJ +
            SUMTMADERAMJ +
            SUMHIERROMJ +
            SUMRELECTRONICOMJ
          ).toFixed(2),
          M_AGUA: (
            SUMEQPETAGUA +
            SUMEQPPAGUA +
            SUMEQHDPEAGUA +
            SUMLDPEAGUA +
            SUMLATASAGUA +
            SUMPAPELAGUA +
            SUMCARTONAGUA +
            SUMEQPRUEBAAGUA +
            SUMTMADERAAGUA +
            SUMHIERROAGUA +
            SUMRELECTRONICOAGUA
          ).toFixed(2),

          ARBOLES: (
            SUMEQPETAR +
            SUMEQPPAR +
            SUMEQHDPEAR +
            SUMLDPEAR +
            SUMLATASAR +
            SUMPAPELAR +
            SUMCARTONAR +
            SUMEQPRUEBAAR +
            SUMTMADERAAR +
            SUMHIERROAR +
            SUMRELECTRONICOAR
          ).toFixed(2),
        },
      });
    });
};

export const getMetricasOrdersByGatherer = async (req, res) => {
  const { userId } = req;

  Order.find({
    ownerID: userId,
    $or: [{ status: "CONFIRMADA" }, { status: "reserved" }],
  })
    .populate("subcategories.subcategory")
    .exec()
    .then((orders) => {
      //console.log(orders)
      let PET = 0;
      let PP = 0;
      let HDPE = 0;
      let LDPE = 0;
      let LATAS = 0;
      let PAPEL = 0;
      let CARTON = 0;
      let PRUEBA = 0;
      let TMADERA = 0;
      let HIERRO = 0;
      let RELECTRONICO = 0;

      let EQPET = 1.45;
      let EQPP = 1.11;
      let EQHDPE = 1.19;
      let EQLDPE = 1.46;
      let EQLATAS = 8.0;
      let EQPAPEL = 2.3;
      let EQCARTON = 2.3;
      let EQPRUEBA = 1.45;
      let EQTMADERA = 0.1;
      let EQHIERRO = 0.1;
      let EQRELECTRONICO = 0.1;

      let EQPETMJ = 30685;
      let EQPPMJ = 36056;
      let EQHDPEMJ = 34003;
      let EQLDPEMJ = 38973;
      let EQLATASMJ = 0;
      let EQPAPELMJ = 14400;
      let EQCARTONMJ = 14400;
      let EQPRUEBAMJ = 30685;
      let EQTMADERAMJ = 0;
      let EQHIERROMJ = 0;
      let EQRELECTRONICOMJ = 0;

      let EQPETAGUA = 18;
      let EQPPAGUA = 8.21;
      let EQHDPEAGUA = 9.47;
      let EQLDPEAGUA = 14;
      let EQLATASAGUA = 0;
      let EQPAPELAGUA = 50;
      let EQCARTONAGUA = 50;
      let EQPRUEBAAGUA = 18;
      let EQTMADERAAGUA = 0;
      let EQHIERROAGUA = 0;
      let EQRELECTRONICOAGUA = 0;

      let EQPETAR = 0;
      let EQPPAR = 0;
      let EQHDPEAR = 0;
      let EQLDPEAR = 0;
      let EQLATASAR = 0;
      let EQPAPELAR = 17;
      let EQCARTONAR = 17;
      let EQPRUEBAAR = 0;
      let EQTMADERAAR = 0;
      let EQHIERROAR = 0;
      let EQRELECTRONICOAR = 0;

      orders.forEach((order) => {
        const subordersFilter = order.subcategories.filter(
          (sub) => sub.ownerID == userId && sub.status == "reserved"
        );
        console.log(subordersFilter);
        subordersFilter.forEach((suborder) => {
          if (suborder.subcategory.subCategoryName == "PLASTICO PET/PETE") {
            PET += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "PLASTICO PP") {
            PP += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "PLASTICO HDPE") {
            HDPE += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "PLASTICO LDPE") {
            LDPE += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "LATAS") {
            LATAS += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "PAPEL BOND") {
            PAPEL += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "CARTON") {
            CARTON += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "Calculadora") {
            PRUEBA += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "TARIMA MADERA") {
            TMADERA += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "HIERRO") {
            HIERRO += suborder.quantity;
          }
          if (suborder.subcategory.subCategoryName == "RESIDUO ELECTRONICO") {
            RELECTRONICO += suborder.quantity;
          }
        });
      });

      let SUMEQPET = (PET / 2204) * EQPET;
      let SUMEQPP = (PP / 2204) * EQPP;
      let SUMEQHDPE = (HDPE / 2204) * EQHDPE;
      let SUMLDPE = (LDPE / 2204) * EQLDPE;
      let SUMLATAS = (LATAS / 2204) * EQLATAS;
      let SUMPAPEL = (PAPEL / 2204) * EQPAPEL;
      let SUMCARTON = (CARTON / 2204) * EQCARTON;
      let SUMEQPRUEBA = (PRUEBA / 2204) * EQPRUEBA;
      let SUMTMADERA = (TMADERA / 2204) * EQTMADERA;
      let SUMHIERRO = (HIERRO / 2204) * EQHIERRO;
      let SUMRELECTRONICO = (RELECTRONICO / 2204) * EQRELECTRONICO;

      let SUMEQPETMJ = (PET / 2204) * EQPETMJ;
      let SUMEQPPMJ = (PP / 2204) * EQPPMJ;
      let SUMEQHDPEMJ = (HDPE / 2204) * EQHDPEMJ;
      let SUMLDPEMJ = (LDPE / 2204) * EQLDPEMJ;
      let SUMLATASMJ = (LATAS / 2204) * EQLATASMJ;
      let SUMPAPELMJ = (PAPEL / 2204) * EQPAPELMJ;
      let SUMCARTONMJ = (CARTON / 2204) * EQCARTONMJ;
      let SUMEQPRUEBAMJ = (PRUEBA / 2204) * EQPRUEBAMJ;
      let SUMTMADERAMJ = (TMADERA / 2204) * EQTMADERAMJ;
      let SUMHIERROMJ = (HIERRO / 2204) * EQHIERROMJ;
      let SUMRELECTRONICOMJ = (RELECTRONICO / 2204) * EQRELECTRONICOMJ;

      let SUMEQPETAGUA = (PET / 2204) * EQPETAGUA;
      let SUMEQPPAGUA = (PP / 2204) * EQPPAGUA;
      let SUMEQHDPEAGUA = (HDPE / 2204) * EQHDPEAGUA;
      let SUMLDPEAGUA = (LDPE / 2204) * EQLDPEAGUA;
      let SUMLATASAGUA = (LATAS / 2204) * EQLATASAGUA;
      let SUMPAPELAGUA = (PAPEL / 2204) * EQPAPELAGUA;
      let SUMCARTONAGUA = (CARTON / 2204) * EQCARTONAGUA;
      let SUMEQPRUEBAAGUA = (PRUEBA / 2204) * EQPRUEBAAGUA;
      let SUMTMADERAAGUA = (TMADERA / 2204) * EQTMADERAAGUA;
      let SUMHIERROAGUA = (HIERRO / 2204) * EQHIERROAGUA;
      let SUMRELECTRONICOAGUA = (RELECTRONICO / 2204) * EQRELECTRONICOAGUA;

      let SUMEQPETAR = (PET / 2204) * EQPETAR;
      let SUMEQPPAR = (PP / 2204) * EQPPAR;
      let SUMEQHDPEAR = (HDPE / 2204) * EQHDPEAR;
      let SUMLDPEAR = (LDPE / 2204) * EQLDPEAR;
      let SUMLATASAR = (LATAS / 2204) * EQLATASAR;
      let SUMPAPELAR = (PAPEL / 2204) * EQPAPELAR;
      let SUMCARTONAR = (CARTON / 2204) * EQCARTONAR;
      let SUMEQPRUEBAAR = (PRUEBA / 2204) * EQPRUEBAAR;
      let SUMTMADERAAR = (TMADERA / 2204) * EQTMADERAAR;
      let SUMHIERROAR = (HIERRO / 2204) * EQHIERROAR;
      let SUMRELECTRONICOAR = (RELECTRONICO / 2204) * EQRELECTRONICOAR;

      res.json({
        ok: true,
        statistics: {
          TON: (
            (PET + PP + HDPE + LDPE + LATAS + PAPEL + CARTON + PRUEBA
              + TMADERA + HIERRO + RELECTRONICO
            ) *
            0.000454
          ).toFixed(2),
          TON_CO2: (
            SUMEQPET +
            SUMEQPP +
            SUMEQHDPE +
            SUMLDPE +
            SUMLATAS +
            SUMPAPEL +
            SUMCARTON +
            SUMEQPRUEBA +
            SUMTMADERA +
            SUMHIERRO +
            SUMRELECTRONICO
          ).toFixed(2),
          TOTAL_LB: (
            (PET + PP + HDPE + LDPE + LATAS + PAPEL + CARTON + PRUEBA
              + TMADERA + HIERRO + RELECTRONICO
            ) *
            2.20462
          ).toFixed(2),
          MJ_ENERGIA: (
            SUMEQPETMJ +
            SUMEQPPMJ +
            SUMEQHDPEMJ +
            SUMLDPEMJ +
            SUMLATASMJ +
            SUMPAPELMJ +
            SUMCARTONMJ +
            SUMEQPRUEBAMJ +
            SUMTMADERAMJ +
            SUMHIERROMJ +
            SUMRELECTRONICOMJ
          ).toFixed(2),
          M_AGUA: (
            SUMEQPETAGUA +
            SUMEQPPAGUA +
            SUMEQHDPEAGUA +
            SUMLDPEAGUA +
            SUMLATASAGUA +
            SUMPAPELAGUA +
            SUMCARTONAGUA +
            SUMEQPRUEBAAGUA +
            SUMTMADERAAGUA +
            SUMHIERROAGUA +
            SUMRELECTRONICOAGUA
          ).toFixed(2),

          ARBOLES: (
            SUMEQPETAR +
            SUMEQPPAR +
            SUMEQHDPEAR +
            SUMLDPEAR +
            SUMLATASAR +
            SUMPAPELAR +
            SUMCARTONAR +
            SUMEQPRUEBAAR +
            SUMTMADERAAR +
            SUMHIERROAR +
            SUMRELECTRONICOAR
          ).toFixed(2),
        },
      });
    });
};

export const getMetricasOrdersBySucursal_OLD = async (req, res) => {
  const { userId } = req;
  const brand = await Branch.findOne({ ownerID: userId });
  Order.find({
    branchID: brand._id,
    $or: [{ status: "CONFIRMADA" }, { status: "reserved" }],
  })
    .populate("subcategories.subcategory")
    .exec()
    .then((orders) => {
      let PET = 0;
      let PP = 0;
      let HDPE = 0;
      let LDPE = 0;
      let LATAS = 0;
      let PAPEL = 0;
      let CARTON = 0;
      let PRUEBA = 0;
      let TMADERA = 0;
      let HIERRO = 0;
      let RELECTRONICO = 0;

      let SUMEQPET = 0;
      let SUMEQPP = 0;
      let SUMEQHDPE = 0;
      let SUMLDPE = 0;
      let SUMLATAS = 0;
      let SUMPAPEL = 0;
      let SUMCARTON = 0;
      let SUMEQPRUEBA = 0;
      let SUMTMADERA = 0;
      let SUMHIERRO = 0;
      let SUMRELECTRONICO = 0;

      let SUMEQPETMJ = 0;
      let SUMEQPPMJ = 0;
      let SUMEQHDPEMJ = 0;
      let SUMLDPEMJ = 0;
      let SUMLATASMJ = 0;
      let SUMPAPELMJ = 0;
      let SUMCARTONMJ = 0;
      let SUMEQPRUEBAMJ = 0;
      let SUMTMADERAMJ = 0;
      let SUMHIERROMJ = 0;
      let SUMRELECTRONICOMJ = 0;

      let SUMEQPETAGUA = 0;
      let SUMEQPPAGUA = 0;
      let SUMEQHDPEAGUA = 0;
      let SUMLDPEAGUA = 0;
      let SUMLATASAGUA = 0;
      let SUMPAPELAGUA = 0;
      let SUMCARTONAGUA = 0;
      let SUMEQPRUEBAAGUA = 0;
      let SUMTMADERAAGUA = 0;
      let SUMHIERROAGUA = 0;
      let SUMRELECTRONICOAGUA = 0;

      let SUMEQPETAR = 0;
      let SUMEQPPAR = 0;
      let SUMEQHDPEAR = 0;
      let SUMLDPEAR = 0;
      let SUMLATASAR = 0;
      let SUMPAPELAR = 0;
      let SUMCARTONAR = 0;
      let SUMEQPRUEBAAR = 0;
      let SUMTMADERAAR = 0;
      let SUMHIERROAR = 0;
      let SUMRELECTRONICOAR = 0;

      orders.forEach((order) => {
        const subordersFilter = order.subcategories.filter(
          (sub) => sub.status == "reserved"
        );
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
          if (suborder.subcategory.subCategoryName == "Calculadora") {
            PRUEBA += suborder.quantity;
            SUMEQPRUEBA = (PRUEBA / 2204) * suborder.subcategory.eq;
            SUMEQPRUEBAMJ = (PRUEBA / 2204) * suborder.subcategory.eq_mj;
            SUMEQPRUEBAAGUA = (PRUEBA / 2204) * suborder.subcategory.eq_water;
            SUMEQPRUEBAAR = (PRUEBA / 2204) * suborder.subcategory.eq_ar;
          }
          if (suborder.subcategory.subCategoryName == "TARIMA MADERA") {
            TMADERA += suborder.quantity;
            SUMTMADERA = (TMADERA / 2204) * suborder.subcategory.eq;
            SUMTMADERAMJ = (TMADERA / 2204) * suborder.subcategory.eq_mj;
            SUMTMADERAAGUA = (TMADERA / 2204) * suborder.subcategory.eq_water;
            SUMTMADERAAR = (TMADERA / 2204) * suborder.subcategory.eq_ar;
          }
          if (suborder.subcategory.subCategoryName == "HIERRO") {
            HIERRO += suborder.quantity;
            SUMHIERRO = (HIERRO / 2204) * suborder.subcategory.eq;
            SUMHIERROMJ = (HIERRO / 2204) * suborder.subcategory.eq_mj;
            SUMHIERROAGUA = (HIERRO / 2204) * suborder.subcategory.eq_water;
            SUMHIERROAR = (HIERRO / 2204) * suborder.subcategory.eq_ar;
          }
          if (suborder.subcategory.subCategoryName == "RESIDUO ELECTRONICO") {
            RELECTRONICO += suborder.quantity;
            SUMRELECTRONICO = (RELECTRONICO / 2204) * suborder.subcategory.eq;
            SUMRELECTRONICOMJ =
              (RELECTRONICO / 2204) * suborder.subcategory.eq_mj;
            SUMRELECTRONICOAGUA =
              (RELECTRONICO / 2204) * suborder.subcategory.eq_water;
            SUMRELECTRONICOAR =
              (RELECTRONICO / 2204) * suborder.subcategory.eq_ar;
          }
        });
      });

      res.json({
        ok: true,
        statistics: {
          TON: (
            (PET + PP + HDPE + LDPE + LATAS + PAPEL + CARTON + PRUEBA
              + TMADERA + HIERRO + RELECTRONICO
            ) *
            0.000454
          ).toFixed(2),
          TON_CO2: (
            SUMEQPET +
            SUMEQPP +
            SUMEQHDPE +
            SUMLDPE +
            SUMLATAS +
            SUMPAPEL +
            SUMCARTON +
            SUMEQPRUEBA +
            SUMTMADERA +
            SUMHIERRO +
            SUMRELECTRONICO
          ).toFixed(2),
          TOTAL_LB: (
            (PET + PP + HDPE + LDPE + LATAS + PAPEL + CARTON + PRUEBA
              + TMADERA + HIERRO + RELECTRONICO
            ) *
            2.20462
          ).toFixed(2),
          MJ_ENERGIA: (
            SUMEQPETMJ +
            SUMEQPPMJ +
            SUMEQHDPEMJ +
            SUMLDPEMJ +
            SUMLATASMJ +
            SUMPAPELMJ +
            SUMCARTONMJ +
            SUMEQPRUEBAMJ +
            SUMTMADERAMJ +
            SUMHIERROMJ +
            SUMRELECTRONICOMJ
          ).toFixed(2),
          M_AGUA: (
            SUMEQPETAGUA +
            SUMEQPPAGUA +
            SUMEQHDPEAGUA +
            SUMLDPEAGUA +
            SUMLATASAGUA +
            SUMPAPELAGUA +
            SUMCARTONAGUA +
            SUMEQPRUEBAAGUA +
            SUMTMADERAAGUA +
            SUMHIERROAGUA +
            SUMRELECTRONICOAGUA
          ).toFixed(2),

          ARBOLES: (
            SUMEQPETAR +
            SUMEQPPAR +
            SUMEQHDPEAR +
            SUMLDPEAR +
            SUMLATASAR +
            SUMPAPELAR +
            SUMCARTONAR +
            SUMEQPRUEBAAR +
            SUMTMADERAAR +
            SUMHIERROAR +
            SUMRELECTRONICOAR
          ).toFixed(2),
        },
      });
    });
};

export const getMetricasOrdersBySucursal = async (req, res) => {
  try {
    const { userId } = req;
    const brand = await Branch.findOne({ ownerID: userId });

    // Define today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to the start of the day

    // Check if a Statistics document for today already exists for this branch
    const existingStats = await Statistics.findOne({
      userId: userId,
      createdAt: {
        $gte: today,
        $lt: new Date(today).setDate(today.getDate() + 1)
      },
      ROLE: "SUCURSAL"
    });

    // If statistics for today already exist, return them
    if (existingStats) {
      return res.json({
        ok: true,
        message: 'Statistics for today already exist',
        statistics: existingStats
      });
    }

    const orders = await Order.find({
      branchID: brand._id,
      $or: [{ status: "CONFIRMADA" }, { status: "reserved" }]
    }).populate("subcategories.subcategory").exec();

    let materialMetrics = {
      sumEq: 0,
      sumEqMJ: 0,
      sumEqAgua: 0,
      sumEqAr: 0,
      totalQuantity: 0,
    };

    orders.forEach((order) => {
      order.subcategories.forEach((suborder) => {
        const metrics = calculateMetrics(suborder, suborder.quantity);

        materialMetrics.sumEq += metrics.sumEq;
        materialMetrics.sumEqMJ += metrics.sumEqMJ;
        materialMetrics.sumEqAgua += metrics.sumEqAgua;
        materialMetrics.sumEqAr += metrics.sumEqAr;
        materialMetrics.totalQuantity += suborder.quantity;
      });
    });

    // Formatting function to make numbers more readable
    function formatNumber(num) {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
    }

    // Consolidate and format final statistics
    const statistics = {
      TON: formatNumber(materialMetrics.totalQuantity * 0.000454),
      TON_CO2: formatNumber(materialMetrics.sumEq),
      TOTAL_LB: formatNumber(materialMetrics.totalQuantity * 2.20462),
      MJ_ENERGIA: formatNumber(materialMetrics.sumEqMJ),
      M_AGUA: formatNumber(materialMetrics.sumEqAgua),
      ARBOLES: formatNumber(materialMetrics.sumEqAr),
    };

    // Create a new Statistics document
    const newStatistics = new Statistics({
      userId: userId,
      branchID: brand._id,
      TON: parseFloat(statistics.TON),
      TON_CO2: parseFloat(statistics.TON_CO2),
      TOTAL_LB: parseFloat(statistics.TOTAL_LB),
      MJ_ENERGIA: parseFloat(statistics.MJ_ENERGIA),
      M_AGUA: parseFloat(statistics.M_AGUA),
      ARBOLES: parseFloat(statistics.ARBOLES),
      ROLE: "SUCURSAL"
    });

    // Save the new document to the database
    await newStatistics.save();

    // Return the newly created statistics
    res.json({
      ok: true,
      message: 'Statistics calculated and saved successfully',
      statistics: newStatistics
    });

  } catch (error) {
    res.status(500).send("Error processing request: " + error.message);
  }
};

export const getMetricasByOrder_OLD = async (req, res) => {
  const { idOrder } = req.query;
  const { userId } = req;
  Order.findById(idOrder)
    .populate("subcategories.subcategory")
    .exec()
    .then((order) => {
      let PET = 0;
      let PP = 0;
      let HDPE = 0;
      let LDPE = 0;
      let LATAS = 0;
      let PAPEL = 0;
      let CARTON = 0;
      let PRUEBA = 0;
      let TMADERA = 0;
      let HIERRO = 0;
      let RELECTRONICO = 0;

      let SUMEQPET = 0;
      let SUMEQPP = 0;
      let SUMEQHDPE = 0;
      let SUMLDPE = 0;
      let SUMLATAS = 0;
      let SUMPAPEL = 0;
      let SUMCARTON = 0;
      let SUMEQPRUEBA = 0;
      let SUMTMADERA = 0;
      let SUMHIERRO = 0;
      let SUMRELECTRONICO = 0;

      let SUMEQPETMJ = 0;
      let SUMEQPPMJ = 0;
      let SUMEQHDPEMJ = 0;
      let SUMLDPEMJ = 0;
      let SUMLATASMJ = 0;
      let SUMPAPELMJ = 0;
      let SUMCARTONMJ = 0;
      let SUMEQPRUEBAMJ = 0;
      let SUMTMADERAMJ = 0;
      let SUMHIERROMJ = 0;
      let SUMRELECTRONICOMJ = 0;

      let SUMEQPETAGUA = 0;
      let SUMEQPPAGUA = 0;
      let SUMEQHDPEAGUA = 0;
      let SUMLDPEAGUA = 0;
      let SUMLATASAGUA = 0;
      let SUMPAPELAGUA = 0;
      let SUMCARTONAGUA = 0;
      let SUMEQPRUEBAAGUA = 0;
      let SUMTMADERAAGUA = 0;
      let SUMHIERROAGUA = 0;
      let SUMRELECTRONICOAGUA = 0;

      let SUMEQPETAR = 0;
      let SUMEQPPAR = 0;
      let SUMEQHDPEAR = 0;
      let SUMLDPEAR = 0;
      let SUMLATASAR = 0;
      let SUMPAPELAR = 0;
      let SUMCARTONAR = 0;
      let SUMEQPRUEBAAR = 0;
      let SUMTMADERAAR = 0;
      let SUMHIERROAR = 0;
      let SUMRELECTRONICOAR = 0;

      const subordersFilter = order.subcategories.filter(
        (sub) => sub.ownerID == userId && sub.status == "reserved"
      );
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
        if (suborder.subcategory.subCategoryName == "Calculadora") {
          PRUEBA += suborder.quantity;
          SUMEQPRUEBA = (PRUEBA / 2204) * suborder.subcategory.eq;
          SUMEQPRUEBAMJ = (PRUEBA / 2204) * suborder.subcategory.eq_mj;
          SUMEQPRUEBAAGUA = (PRUEBA / 2204) * suborder.subcategory.eq_water;
          SUMEQPRUEBAAR = (PRUEBA / 2204) * suborder.subcategory.eq_ar;
        }
        if (suborder.subcategory.subCategoryName == "TARIMA MADERA") {
          TMADERA += suborder.quantity;
          SUMTMADERA = (TMADERA / 2204) * suborder.subcategory.eq;
          SUMTMADERAMJ = (TMADERA / 2204) * suborder.subcategory.eq_mj;
          SUMTMADERAAGUA = (TMADERA / 2204) * suborder.subcategory.eq_water;
          SUMTMADERAAR = (TMADERA / 2204) * suborder.subcategory.eq_ar;
        }
        if (suborder.subcategory.subCategoryName == "HIERRO") {
          HIERRO += suborder.quantity;
          SUMHIERRO = (HIERRO / 2204) * suborder.subcategory.eq;
          SUMHIERROMJ = (HIERRO / 2204) * suborder.subcategory.eq_mj;
          SUMHIERROAGUA = (HIERRO / 2204) * suborder.subcategory.eq_water;
          SUMHIERROAR = (HIERRO / 2204) * suborder.subcategory.eq_ar;
        }
        if (suborder.subcategory.subCategoryName == "RESIDUO ELECTRONICO") {
          RELECTRONICO += suborder.quantity;
          SUMRELECTRONICO = (RELECTRONICO / 2204) * suborder.subcategory.eq;
          SUMRELECTRONICOMJ =
            (RELECTRONICO / 2204) * suborder.subcategory.eq_mj;
          SUMRELECTRONICOAGUA =
            (RELECTRONICO / 2204) * suborder.subcategory.eq_water;
          SUMRELECTRONICOAR =
            (RELECTRONICO / 2204) * suborder.subcategory.eq_ar;
        }
      });

      res.json({
        ok: true,
        statistics: {
          TON: (
            (PET + PP + HDPE + LDPE + LATAS + PAPEL + CARTON + PRUEBA
              + TMADERA + HIERRO + RELECTRONICO
            ) *
            0.000454
          ).toFixed(2),
          TON_CO2: (
            SUMEQPET +
            SUMEQPP +
            SUMEQHDPE +
            SUMLDPE +
            SUMLATAS +
            SUMPAPEL +
            SUMCARTON +
            SUMEQPRUEBA +
            SUMTMADERA +
            SUMHIERRO +
            SUMRELECTRONICO
          ).toFixed(2),
          TOTAL_LB: (
            (PET + PP + HDPE + LDPE + LATAS + PAPEL + CARTON + PRUEBA
              + TMADERA + HIERRO + RELECTRONICO
            ) *
            2.20462
          ).toFixed(2),
          MJ_ENERGIA: (
            SUMEQPETMJ +
            SUMEQPPMJ +
            SUMEQHDPEMJ +
            SUMLDPEMJ +
            SUMLATASMJ +
            SUMPAPELMJ +
            SUMCARTONMJ +
            SUMEQPRUEBAMJ +
            SUMTMADERAMJ +
            SUMHIERROMJ +
            SUMRELECTRONICOMJ
          ).toFixed(2),
          M_AGUA: (
            SUMEQPETAGUA +
            SUMEQPPAGUA +
            SUMEQHDPEAGUA +
            SUMLDPEAGUA +
            SUMLATASAGUA +
            SUMPAPELAGUA +
            SUMCARTONAGUA +
            SUMEQPRUEBAAGUA +
            SUMTMADERAAGUA +
            SUMHIERROAGUA +
            SUMRELECTRONICOAGUA
          ).toFixed(2),

          ARBOLES: (
            SUMEQPETAR +
            SUMEQPPAR +
            SUMEQHDPEAR +
            SUMLDPEAR +
            SUMLATASAR +
            SUMPAPELAR +
            SUMCARTONAR +
            SUMEQPRUEBAAR +
            SUMTMADERAAR +
            SUMHIERROAR +
            SUMRELECTRONICOAR
          ).toFixed(2),
        },
      });
    });
};

export const getMetricasByOrder = async (req, res) => {
  try {
    const { idOrder } = req.query;
    const { userId } = req;

    const order = await Order.findById(idOrder)
      .populate("subcategories.subcategory")
      .exec();

    let materialMetrics = {
      sumEq: 0,
      sumEqMJ: 0,
      sumEqAgua: 0,
      sumEqAr: 0,
      totalQuantity: 0,
    };

    const subordersFilter = order.subcategories.filter(
      (sub) => sub.ownerID == userId && sub.status == "reserved"
    );

    subordersFilter.forEach((suborder) => {
      const metrics = calculateMetrics(suborder, suborder.quantity);

      materialMetrics.sumEq += metrics.sumEq;
      materialMetrics.sumEqMJ += metrics.sumEqMJ;
      materialMetrics.sumEqAgua += metrics.sumEqAgua;
      materialMetrics.sumEqAr += metrics.sumEqAr;
      materialMetrics.totalQuantity += suborder.quantity;
    });

    // Use formatNumber function as defined in getMetricasOrdersForAdmin

    // Consolidate and format final statistics
    const statistics = {
      TON: formatNumber(materialMetrics.totalQuantity * 0.000454),
      TON_CO2: formatNumber(materialMetrics.sumEq),
      TOTAL_LB: formatNumber(materialMetrics.totalQuantity * 2.20462),
      MJ_ENERGIA: formatNumber(materialMetrics.sumEqMJ),
      M_AGUA: formatNumber(materialMetrics.sumEqAgua),
      ARBOLES: formatNumber(materialMetrics.sumEqAr),
    };

    res.json({
      ok: true,
      statistics,
    });

  } catch (error) {
    res.status(500).send("Error processing request: " + error.message);
  }
};

export const reservedAllSubOrden = async (req, res) => {
  const { orderId } = req.body;
  console.log(orderId);
  const idRecolecor = req.userId;
  Order.findOne({ _id: orderId })
    .exec()
    .then(async (order) => {
      console.log(order);
      const newOrder = order.subcategories.map((o, i) => {
        if (o.status == "reservation-pending") {
          o.status = "reserved";
          o.ownerID = idRecolecor;
        }
        return o;
      });
      if (order.status != "pending-complete-payed") {
        order.status = "reserved";
      }
      if (!order.ownerID) {
        order.ownerID.push(idRecolecor);
      }
      else if (!order.ownerID.includes(idRecolecor)) {
        order.ownerID.push(idRecolecor);
      }

      order.subcategories = newOrder;
      await order.save();

      res.json({ ok: true, message: "reserved" });
    })
    .catch((err) => {
      console.log(err);
      res.json({ ok: false, message: "Ocurrio un Error" });
    });
};

export const finalizarSubOrden = async (req, res) => {
  const { orderId } = req.body;
  Order.findOne({ _id: orderId })
    .exec()
    .then((order) => {
      const newOrder = order.subcategories.map((o, i) => {
        if (o.status == "reserved") {
          o.status = "finalized";
        }
        return o;
      });
      order.status = "finalized";
      order.subcategories = newOrder;
      order
        .save()
        .then((ok) => {
          res.json({ ok: true, message: "finalized" });
        })
        .catch((err) => {
          res.json(err);
        });
    })
    .catch((err) => {
      res.json({ ok: false, message: "Ocurrio un Error" });
    });
};

export const reservarSubOrden = async (req, res) => {
  const idRecolecor = req.userId;
  const { subcategoryId, orderId } = req.body;
  Order.findOne({ _id: orderId })
    .exec()
    .then((order) => {
      const orderFilter = order.subcategories.filter(
        (s) => s.status == "reservation-pending"
      );
      if (orderFilter.length == 1) {
        const newOrder = order.subcategories.map((o, i) => {
          if (o._id == subcategoryId) {
            o.status = "reserved";
            o.ownerID = idRecolecor;
          }
          return o;
        });
        order.status = "reserved";
        if (!order.ownerID.includes(idRecolecor)) {
          order.ownerID.push(idRecolecor);
        }
        order.subcategories = newOrder;
        order
          .save()
          .then((ok) => {
            res.json({ ok: true, message: "Reserved" });
          })
          .catch((err) => {
            res.json(err);
          });
      } else {
        const suborder = order.subcategories.map((s) => {
          let suborder = s;
          if (s._id == subcategoryId) {
            suborder.status = "reserved";
            suborder.ownerID = idRecolecor;
          }
          return suborder;
        });
        if (!order.ownerID.includes(idRecolecor)) {
          order.ownerID.push(idRecolecor);
        }
        order.subcategories = suborder;
        order
          .save()
          .then((ok) => {
            res.json({ ok: true, message: "Reserved" });
          })
          .catch((err) => {
            res.json(err);
          });
      }
    })
    .catch((err) => {
      res.json({ ok: false, message: "Ocurrio un Error" });
    });
};

export const getMyReservations = async (req, res) => {
  const { userId } = req;
  const { status } = req.query;

  Order.find({
    ownerID: userId,
    $or: [
      { status: "reserved" },
      { status: "pending-complete-payed" },
      { status: "reservation-pending" },
    ],
  })
    .populate({ path: "companyID", model: "Companies" })
    .populate("category")
    .populate("subcategories.subcategory")
    .exec()
    .then((orders) => {
      let newOrders = orders.map((order) => {
        order.subcategories = order.subcategories.filter(
          (o) => o.ownerID == userId && o.status == "reserved"
        );
        return order;
      });
      const filterNewOrders = newOrders.filter(
        (o) => o.subcategories.length != 0
      );
      //sub.ownerID == userId && sub.status == 'payed'
      res.json({ ok: true, orders: filterNewOrders });
    });
};

export const getOrdersPayedByGatherer = async (req, res) => {
  const { userId } = req;
  const { status } = req.query;
  console.log(userId);

  Order.find({
    ownerID: userId,
    $or: [{ status: "CONFIRMADA" }, { status: "reserved" }],
  })
    .populate({ path: "companyID", model: "Companies" })
    .populate("category")
    .populate("billID")
    .populate("subcategories.subcategory")
    .exec()
    .then((orders) => {
      let newOrders = orders.map((order) => {
        order.subcategories = order.subcategories.filter(
          (o) => o.ownerID == userId && o.status == "reserved"
        );
        return order;
      });
      const filterNewOrders = newOrders.filter(
        (o) => o.subcategories.length != 0
      );
      res.json({ ok: true, orders: filterNewOrders });
    });
};

export const getOrdersCompletedByGatherer = async (req, res) => {
  const { userId } = req;
  const { status } = req.query;

  Order.find({
    ownerID: userId,
    status: "CONFIRMADA",
  })
    .populate({ path: "companyID", model: "Companies" })
    .populate("category")
    // .populate("billID")
    .populate("subcategories.subcategory")
    .exec()
    .then((orders) => {
      let newOrders = orders.map((order) => {
        order.subcategories = order.subcategories.filter(
          (o) => o.ownerID == userId && o.status == "reserved"
        );
        return order;
      });
      const filterNewOrders = newOrders.filter(
        (o) => o.subcategories.length != 0
      );
      res.json({ ok: true, orders: filterNewOrders });
    });
};

export const getOrdersPayedForAdmin = async (req, res) => {
  try {
    const { userId } = req;
    const { status } = req.query;

    if (status !== "CONFIRMADA") {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }

    const orders = await Order.find({ status })
      .populate([
        { path: "companyID", model: "Companies" },
        "category",
        "branchID",
        "ownerID",
        "billID",
        "subcategories.subcategory",
      ])
      .exec();

    const ordersWithUser = [];

    for (const order of orders) {
      if (order.status === "CONFIRMADA") {
        const subordersWithUser = [];

        for (const suborder of order.subcategories) {
          if (suborder.status === "reserved") {
            const ownerID = suborder.ownerID;
            const user = await User.findById(ownerID).exec();
            const username = user?.username || "";

            // Retrieve "dui" field from the Gatherer collection
            const gatherer = await Gatherer.findOne({ userID: ownerID }).exec();
            const dui = gatherer?.dui || ""; // Replace 'dui' with the actual field name

            const suborderWithUser = {
              ...suborder.toObject(),
              user: username,
              dui: dui, // Add 'dui' to the suborderWithUser object
            };

            subordersWithUser.push(suborderWithUser);
          }
        }

        const branch = await Branch.findById(order.branchID).exec();
        const branchName = branch?.branchName || "";

        const ownerID = order.ownerID.map(owner => {
          const user = {
            username: owner.username,
            email: owner.email
            // Add other properties you want to include
          };
          return user;
        });

        const orderData = {
          ...order.toObject(),
          subcategories: subordersWithUser,
          branch: branchName,
          user: ownerID
        };

        ordersWithUser.push(orderData);
      }
    }

    // Sort orders from latest to newest
    ordersWithUser.sort((a, b) => new Date(b.date) - new Date(a.date));

    const statistics = await statisticsByDatesAdmin(orders);
    res.json({ ok: true, orders: ordersWithUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, message: "An error occurred" });
  }
};

export const getOrdersConciliadasForAdmin = async (req, res) => {
  try {
    const { userId } = req;
    const { status } = req.query;

    if (status !== "conciliada") {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }

    const orders = await Order.find({ status })
      .populate([
        { path: "companyID", model: "Companies" }, // Ensure company information is populated
        "category",
        "branchID",
        "ownerID",
        "billID",
        "subcategories.subcategory",
      ])
      .exec();

    console.log(orders);

    const filterConciliadasOrders = orders.filter((o) => o.status === "conciliada");
    const ordersWithUser = [];

    for (const o of filterConciliadasOrders) {
      const subordersWithUser = [];

      for (const suborder of o.subcategories) {
        if (suborder.status === "reserved") {
          const ownerID = suborder.ownerID;
          const user = await User.findById(ownerID).exec();
          const username = user?.username || "";

          // Retrieve "dui" field from the Gatherer collection
          const gatherer = await Gatherer.findOne({ userID: ownerID }).exec();
          const dui = gatherer?.dui || ""; // Replace 'dui' with the actual field name

          const suborderWithUser = {
            ...suborder.toObject(),
            user: username,
            dui: dui, // Add 'dui' to the suborderWithUser object
          };

          subordersWithUser.push(suborderWithUser);
        }
      }

      const ownerID = o.ownerID;
      const users = await User.find({ _id: { $in: ownerID } }).exec();
      const usernames = users.map((user) => user.username || "");

      const branch = await Branch.findById(o.branchID).exec();
      const branchName = branch?.branchName || "";

      const orderData = {
        ...o.toObject(),
        subcategories: subordersWithUser,
        user: usernames,
        branch: branchName,
      };

      ordersWithUser.push(orderData);
    }

    // Sort orders from the latest (most recent) to the oldest
    ordersWithUser.sort((a, b) => new Date(b.date) - new Date(a.date));

    const statistics = await statisticsByDatesAdmin(orders);
    res.json({ ok: true, orders: ordersWithUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, message: "An error occurred" });
  }
};


export const getOrdersCompletedForAdmin = async (req, res) => {
  const { userId } = req;
  const { status } = req.query;

  if (status != "CONFIRMADA") {
    return res.status(404).json({ ok: false, message: "Estatus incorrecto" });
  }
  Order.find({
    status: status,
  })
    .populate({ path: "companyID", model: "Companies" })
    .populate("category")
    .populate("billID")
    .populate("subcategories.subcategory")
    .exec()
    .then(async (orders) => {
      const statistics = await statisticsByDatesAdmin(orders);
      res.json({ ok: true, orders: { orders: orders, statistics } });
    });
};

export const getCanceledOrdersForAdmin = async (req, res) => {
  const { userId } = req;
  const { status } = req.query;

  if (status != "cancel") {
    return res.status(404).json({ ok: false, message: "Estatus incorrecto" });
  }
  Order.find({
    status: status,
  })
    .populate({ path: "companyID", model: "Companies" })
    .populate("category")
    .populate("billID")
    .populate("subcategories.subcategory")
    .exec()
    .then(async (orders) => {
      const statistics = await statisticsByDatesAdmin(orders);
      res.json({ ok: true, orders: { orders: orders, statistics } });
    });
};


export const getOrdersByMunicipio = async (req, res) => {
  const { municipio } = req.body;
  console.log(municipio);
  Order.find({
    municipio: municipio,
    $or: [{ ownerID: [] },
    { status: "reservation-pending" },
    { status: "pending-complete-payed" },
    { status: "CONFIRMADA" },
    { status: "reserved" },
    ],
  })
    .sort({ createdAt: -1 })
    .populate("branchID")
    .populate("ownerID")
    .populate("companyID")
    .populate("subcategories.subcategory")
    .exec()
    .then((orders) => {
      console.log(orders);
      let ordersFilter = orders.map((o) => {
        let newTotal = 0;
        let NewTotalEnterprice = 0;
        let suborder = o.subcategories.filter(
          (s) => s.status == "reservation-pending"
        );
        suborder.forEach((sub) => {
          newTotal += sub.subtotal * 1;
          NewTotalEnterprice += sub.subtotalEnterprice * 1;
        });

        o.total = newTotal;
        o.totalEnterprice = NewTotalEnterprice;
        o.subcategories = suborder;
        return o;
      });
      let filterNewOrders = ordersFilter.filter(
        (o) => o.subcategories.length != 0
      );

      console.log(filterNewOrders);

      return res.json({ ok: true, orders: filterNewOrders });
    });
};

export const getOrderById = async (req, res) => {
  const { id } = req.body;
  const { userId } = req;
  console.log(userId);
  Order.findById(id)
    .sort({ createdAt: -1 })
    .populate("branchID")
    .populate("ownerID")
    .populate("category")
    .populate("companyID")
    .populate("subcategories.subcategory")
    .exec()
    .then((order) => {
      let newTotal = 0;
      let NewTotalEnterprice = 0;
      let reservedSubOrders = order.subcategories.filter((sub) => {
        if (sub.ownerID == userId && sub.status == "reserved") {
          return true;
        } else {
          return false;
        }
      });

      reservedSubOrders.forEach((sub) => {
        newTotal += sub.subtotal * 1;
        NewTotalEnterprice += sub.subtotal * 1;
      });
      order.total = newTotal;
      order.subcategories = reservedSubOrders;
      order.totalEnterprice = NewTotalEnterprice;
      return res.json({ ok: true, order });
    });
};

export const deleteOrder = async (req, res) => {
  const { id } = req.body;
  Order.findByIdAndRemove(id).then(() => {
    return res.json({ ok: true, message: "Orden eliminada con éxito" });
  });
};

export const cancelOrder = async (req, res) => {
  const { id } = req.body;
  Order.findOne({ _id: id })
    .exec()
    .then((order) => {
      const newOrder = order.subcategories.map((o, i) => {
        if (o.status == "cancel") {
          o.status = "cancel";
        }
        return o;
      });
      order.status = "cancel";
      order.subcategories = newOrder;
      order
        .save()
        .then((ok) => {
          res.json({ ok: true, message: "cancel" });
        })
        .catch((err) => {
          res.json(err);
        });
    })
    .catch((err) => {
      res.json({ ok: false, message: "Ocurrio un Error" });
    });
};

export const conciliarOrder = async (req, res) => {
  try {
    const { id } = req.body;
    const order = await Order.findOne({ _id: id }).exec();

    const newOrder = order.subcategories.map((o) => {
      if (o.status === "conciliada") {
        o.status = "conciliada";
      }
      return o;
    });

    order.status = "conciliada";
    order.fecha_conciliacion = new Date();
    order.subcategories = newOrder;

    const savedOrder = await order.save();
    res.json({ ok: true, message: "Conciliada" });
  } catch (err) {
    res.json({ ok: false, message: "Ocurrió un Error", error: err });
  }
};


export const filterOrdersbydates = async (req, res) => {
  const { start, end } = req.query;

  let startDate = new Date(start);
  let endDate = new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(404).json({ ok: true, message: "Fechas invalidas" });
  }
  let query = { date: { $gte: startDate, $lt: endDate } };

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .populate("branchID")
    .populate("ownerID")
    .populate("category")
    .populate("companyID")
    .populate("subcategories.subcategory")
    .exec();

  const filterReservedOrders = orders.filter(
    (o) => o.status == "reservation-pending"
  );
  const ordersFilter = filterReservedOrders.map((o) => {
    const suborder = o.subcategories.filter(
      (s) => s.status == "reservation-pending"
    );
    o.subcategories = suborder;
    return o;
  });
  res.json({ ok: true, orders: ordersFilter });
};

export const filterOrdersPayedbydates = async (req, res) => {
  const { start, end } = req.query;
  const { userId } = req;

  let startDate = new Date(start);
  let endDate = new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(404).json({ ok: true, message: "Fechas invalidas" });
  }
  let query = {
    date: { $gte: startDate, $lt: endDate },
    $or: [{ status: "CONFIRMADA" }, { status: "reserved" }],
  };

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .populate("branchID")
    .populate("ownerID")
    .populate("category")
    .populate("companyID")
    .populate("subcategories.subcategory")
    .exec();

  let newOrders = orders.map((order) => {
    order.subcategories = order.subcategories.filter(
      (o) => o.ownerID == userId && o.status == "reserved"
    );
    return order;
  });
  const filterNewOrders = newOrders.filter((o) => o.subcategories.length != 0);

  const statistics = await statisticsByDatesAdmin(filterNewOrders);
  res.json({ ok: true, orders: { orders: filterNewOrders, statistics } });
};

//filterOrdersCompletedbydates
export const filterOrdersCompletedbydates = async (req, res) => {
  const { start, end } = req.query;
  const { userId } = req;

  let startDate = new Date(start);
  let endDate = new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(404).json({ ok: true, message: "Fechas invalidas" });
  }
  let query = {
    date: { $gte: startDate, $lt: endDate },
    $or: [{ status: "CONFIRMADA" }, { status: "reserved" }],
  };

  const order = await Order.find(query)
    .sort({ createdAt: -1 })
    .populate("branchID")
    .populate("ownerID")
    .populate("category")
    .populate("companyID")
    .populate("subcategories.subcategory")
    .exec();

  let newOrders = order.map((order) => {
    order.subcategories = order.subcategories.filter(
      (o) => o.ownerID == userId && o.status == "CONFIRMADA"
    );
    return order;
  });
  const filterNewOrders = newOrders.filter((o) => o.subcategories.length != 0);
  const statistics = await statisticsByDatesAdmin(filterNewOrders);
  res.json({ ok: true, orders: { orders: filterNewOrders, statistics } });
};


export const filterOrdersPayedbydatesAdmin = async (req, res) => {

  const { start, end } = req.query;

  let startDate = new Date(start);
  let endDate = new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(404).json({ ok: true, message: "Fechas invalidas" });
  }

  const orders = await Order.find({
    date: { $gte: startDate, $lt: endDate },
    $or: [{ status: "CONFIRMADA" }, { status: "reserved" }]
  })
    .populate([
      { path: "companyID", model: "Companies" },
      "category",
      "branchID",
      "ownerID",
      "billID",
      "subcategories.subcategory",
    ])
    .exec();
  const filterPayedOrders = orders.filter((o) => o.status == "CONFIRMADA");
  const ordersFilter = filterPayedOrders.map(async (o) => {
    const suborder = o.subcategories.filter((s) => s.status == "reserved");
    o.subcategories = suborder;
    const ownerID = o.ownerID;

    const user = await User.find({ _id: ownerID }).exec();
    const username = user[0]?.username || ""; // Get the username value

    const branch = await Branch.find({ _id: o.branchID }).exec();
    const branchName = branch[0]?.branchName || "";

    return { ...o.toObject(), user: username, branch: branchName };
  });

  const ordersWithUser = await Promise.all(ordersFilter);

  const filterNewOrders = ordersWithUser.filter((o) => o.subcategories.length != 0);
  const statistics = await statisticsByDatesAdmin(filterNewOrders);
  res.json({ ok: true, orders: { orders: filterNewOrders, statistics } });
};

export const filterOrdersCanceledbydates = async (req, res) => {
  const { start, end } = req.query;

  let startDate = new Date(start);
  let endDate = new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(404).json({ ok: true, message: "Fechas invalidas" });
  }
  let query = { date: { $gte: startDate, $lt: endDate } };

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .populate("branchID")
    .populate("ownerID")
    .populate("category")
    .populate("companyID")
    .populate("subcategories.subcategory")
    .exec();

  const filterCancelledOrders = orders.filter(
    (o) => o.status == "cancel"
  );
  const ordersFilter = filterCancelledOrders.map((o) => {
    const suborder = o.subcategories.filter(
      (s) => s.status == "payed"
    );
    o.subcategories = suborder;
    return o;
  });
  res.json({ ok: true, orders: ordersFilter });
};

export const updateWeightOrder = async (req, res) => {
  const { orderUpdated } = req.body;
  console.log(orderUpdated);
  Order.findOne({ _id: orderUpdated._id })
    .exec()
    .then((order) => {
      const newOrder = order.subcategories.map((o, i) => {
        if (o._id == orderUpdated.subcategories[i]._id) {
          o.quantity = orderUpdated.subcategories[i].quantity;
          o.subtotal = orderUpdated.subcategories[i].subtotal; // Aqui se actualiza el subtotal
          o.subtotalEnterprice = orderUpdated.subcategories[i].subtotalEnterprice;
          o.comision_porcentaje = orderUpdated.subcategories[i].comision_porcentaje;
        }
        return o;
      });
      order.total = orderUpdated.total;
      order.totalEnterprice = orderUpdated.totalEnterprice;
      order.subcategories = newOrder;
      order
        .save()
        .then((ok) => {
          res.json({ ok: true, message: "update weight" });
        })
        .catch((err) => {
          res.json(err);
        });
    })
    .catch((err) => {
      console.log();
      res.status(500).json({ ok: false, message: "Ocurrio un Error" });
    });
};

export const updateStatusOrder = async (req, res) => {
  try {
    const { orderId, subcategoryId, newStatus } = req.body;
    if (!orderId || !subcategoryId || !newStatus) {
      throw new Error('Invalid input');
    }

    const order = await Order.findOne({ _id: orderId }).exec();
    if (!order) {
      throw new Error('Order not found');
    }

    const subcategory = order.subcategories.find(({ _id }) => _id.toString() === subcategoryId);
    if (!subcategory) {
      throw new Error('Subcategory not found');
    }

    // Check if newStatus is a valid status value
    if (!['reservation-pending', 'CONFIRMADA', 'reserved'].includes(newStatus)) {
      throw new Error(`Invalid status value: ${newStatus}`);
    }

    // Update status of main order
    order.status = newStatus;

    // Update status of subcategory
    subcategory.status = newStatus;
    subcategory.ownerID = null;

    await order.save();

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getOrderReport = async (req, res) => {
  try {
    const orders = await Order.find({}).populate("userID").populate("companyID").populate("branchID");

    const orderReport = orders.map((order) => {
      return {
        orderNumber: order.order_n,
        date: order.date,
        customerName: `${order.userID.firstName} ${order.userID.lastName}`,
        companyName: order.companyID ? order.companyID.name : "N/A",
        branchName: order.branchID ? order.branchID.name : "N/A",
        category: order.category,
        subcategories: order.subcategories,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        status: order.status
      };
    });

    res.json({ success: true, report: orderReport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reports for Admin

export const getOrdersReport = async (req, res) => {
  try {
    const { start, end, status } = req.query;
    console.log("Start " + start);
    console.log("End " + end);
    console.log("Status " + status);

    let startDate = new Date(start);
    console.log("Start Date: " + startDate);

    let endDate = new Date(end);
    console.log("End Date: " + endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(404).json({ ok: true, message: "Fechas invalidas" });
    }

    let query = { date: { $gte: startDate, $lt: endDate } };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("branchID")
      .populate("ownerID")
      .populate("category")
      .populate("companyID")
      .populate("subcategories.subcategory")
      .exec();

    const filterStatusOrders = orders.filter(
      (o) => o.status == "CONFIRMADA"
    );
    const ordersFilter = filterStatusOrders.map((o) => {
      const suborder = o.subcategories.filter(
        (s) => s.status == "reserved"
      );
      o.subcategories = suborder;
      return o;
    });

    const orderReport = ordersFilter.map((order) => {
      return {
        orderNumber: order.order_n,
        date: order.date,
        customerName: `${order.ownerID.fullName}`,
        companyName: order.companyID ? order.companyID.businessName : "N/A",
        branchName: order.branchID ? order.branchID.branchName : "N/A",
        category: order.category,
        subcategories: order.subcategories,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        status: order.status
      };
    });

    res.json({ success: true, report: orderReport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}





export const getOrdersReportByCompany = async (req, res) => {
  try {
    const { start, end, companyId } = req.query;

    let startDate = new Date(start);
    let endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(404).json({ ok: true, message: "Fechas invalidas" });
    }
    let query = { date: { $gte: startDate, $lt: endDate }, companyID: companyId };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("branchID")
      .populate("ownerID")
      .populate("category")
      .populate("companyID")
      .populate("subcategories.subcategory")
      .exec();

    const filterCancelledOrders = orders.filter(
      (o) => o.status == "cancel"
    );
    const ordersFilter = filterCancelledOrders.map((o) => {
      const suborder = o.subcategories.filter(
        (s) => s.status == "payed"
      );
      o.subcategories = suborder;
      return o;
    });

    const orderReport = ordersFilter.map((order) => {
      return {
        orderNumber: order.order_n,
        date: order.date,
        customerName: `${order.ownerID.firstName} ${order.ownerID.lastName}`,
        companyName: order.companyID ? order.companyID.name : "N/A",
        branchName: order.branchID ? order.branchID.name : "N/A",
        category: order.category,
        subcategories: order.subcategories,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        status: order.status
      };
    });

    res.json({ success: true, report: orderReport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export const getOrdersReportByBranch = async (req, res) => {
  try {
    const { start, end, branchId } = req.query;

    let startDate = new Date(start);
    let endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(404).json({ ok: true, message: "Fechas invalidas" });
    }
    let query = { date: { $gte: startDate, $lt: endDate }, branchID: branchId };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("branchID")
      .populate("ownerID")
      .populate("category")
      .populate("companyID")
      .populate("subcategories.subcategory")
      .exec();

    const filterCancelledOrders = orders.filter(
      (o) => o.status == "cancel"
    );
    const ordersFilter = filterCancelledOrders.map((o) => {
      const suborder = o.subcategories.filter(
        (s) => s.status == "payed"
      );
      o.subcategories = suborder;
      return o;
    });

    const orderReport = ordersFilter.map((order) => {
      return {
        orderNumber: order.order_n,
        date: order.date,
        customerName: `${order.ownerID.firstName} ${order.ownerID.lastName}`,
        companyName: order.companyID ? order.companyID.name : "N/A",
        branchName: order.branchID ? order.branchID.name : "N/A",
        category: order.category,
        subcategories: order.subcategories,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        status: order.status
      };
    });

    res.json({ success: true, report: orderReport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export const getOrdersReportByGatherer = async (req, res) => {
  try {
    const { start, end, gathererId } = req.query;

    let startDate = new Date(start);
    let endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(404).json({ ok: true, message: "Fechas invalidas" });
    }
    let query = { date: { $gte: startDate, $lt: endDate }, gathererID: gathererId };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("branchID")
      .populate("ownerID")
      .populate("category")
      .populate("companyID")
      .populate("subcategories.subcategory")
      .exec();

    const filterCancelledOrders = orders.filter(
      (o) => o.status == "cancel"
    );
    const ordersFilter = filterCancelledOrders.map((o) => {
      const suborder = o.subcategories.filter(
        (s) => s.status == "payed"
      );
      o.subcategories = suborder;
      return o;
    });

    const orderReport = ordersFilter.map((order) => {
      return {
        orderNumber: order.order_n,
        date: order.date,
        customerName: `${order.ownerID.firstName} ${order.ownerID.lastName}`,
        companyName: order.companyID ? order.companyID.name : "N/A",
        branchName: order.branchID ? order.branchID.name : "N/A",
        category: order.category,
        subcategories: order.subcategories,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        status: order.status
      };
    });

    res.json({ success: true, report: orderReport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export const getOrdersReportByCategory = async (req, res) => {
  try {
    const { start, end, categoryId } = req.query;

    let startDate = new Date(start);
    let endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(404).json({ ok: true, message: "Fechas invalidas" });
    }
    let query = { date: { $gte: startDate, $lt: endDate }, category: categoryId };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("branchID")
      .populate("ownerID")
      .populate("category")
      .populate("companyID")
      .populate("subcategories.subcategory")
      .exec();

    const filterCancelledOrders = orders.filter(
      (o) => o.status == "cancel"
    );
    const ordersFilter = filterCancelledOrders.map((o) => {
      const suborder = o.subcategories.filter(
        (s) => s.status == "payed"
      );
      o.subcategories = suborder;
      return o;
    });

    const orderReport = ordersFilter.map((order) => {
      return {
        orderNumber: order.order_n,
        date: order.date,
        customerName: `${order.ownerID.firstName} ${order.ownerID.lastName}`,
        companyName: order.companyID ? order.companyID.name : "N/A",
        branchName: order.branchID ? order.branchID.name : "N/A",
        category: order.category,
        subcategories: order.subcategories,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        status: order.status
      };
    });

    res.json({ success: true, report: orderReport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export const getOrdersReportBySubcategory = async (req, res) => {
  try {
    const { start, end, subcategoryId } = req.query;

    let startDate = new Date(start);
    let endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(404).json({ ok: true, message: "Fechas invalidas" });
    }
    let query = { date: { $gte: startDate, $lt: endDate }, "subcategories.subcategory": subcategoryId };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("branchID")
      .populate("ownerID")
      .populate("category")
      .populate("companyID")
      .populate("subcategories.subcategory")
      .exec();

    const filterCancelledOrders = orders.filter(
      (o) => o.status == "cancel"
    );
    const ordersFilter = filterCancelledOrders.map((o) => {
      const suborder = o.subcategories.filter(
        (s) => s.status == "payed"
      );
      o.subcategories = suborder;
      return o;
    });

    const orderReport = ordersFilter.map((order) => {
      return {
        orderNumber: order.order_n,
        date: order.date,
        customerName: `${order.ownerID.firstName} ${order.ownerID.lastName}`,
        companyName: order.companyID ? order.companyID.name : "N/A",
        branchName: order.branchID ? order.branchID.name : "N/A",
        category: order.category,
        subcategories: order.subcategories,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        status: order.status
      };
    });

    res.json({ success: true, report: orderReport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export const getOrdersReportByMunicipality = async (req, res) => {
  try {
    const { start, end, municipalityId } = req.query;

    let startDate = new Date(start);
    let endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(404).json({ ok: true, message: "Fechas invalidas" });
    }
    let query = { date: { $gte: startDate, $lt: endDate }, municipality: municipalityId };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("branchID")
      .populate("ownerID")
      .populate("category")
      .populate("companyID")
      .populate("subcategories.subcategory")
      .exec();

    const filterCancelledOrders = orders.filter(
      (o) => o.status == "cancel"
    );
    const ordersFilter = filterCancelledOrders.map((o) => {
      const suborder = o.subcategories.filter(
        (s) => s.status == "payed"
      );
      o.subcategories = suborder;
      return o;
    });

    const orderReport = ordersFilter.map((order) => {
      return {
        orderNumber: order.order_n,
        date: order.date,
        customerName: `${order.ownerID.firstName} ${order.ownerID.lastName}`,
        companyName: order.companyID ? order.companyID.name : "N/A",
        branchName: order.branchID ? order.branchID.name : "N/A",
        category: order.category,
        subcategories: order.subcategories,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        status: order.status
      };
    });

    res.json({ success: true, report: orderReport });
  }
  catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

//getOrdersReportByStatus
export const getOrdersReportByStatus = async (req, res) => {
  try {
    const { start, end, status } = req.query;

    let startDate = new Date(start);
    let endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(404).json({ ok: true, message: "Fechas invalidas" });
    }
    let query = { date: { $gte: startDate, $lt: endDate }, status: status };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("branchID")
      .populate("ownerID")
      .populate("category")
      .populate("companyID")
      .populate("subcategories.subcategory")
      .exec();

    const filterCancelledOrders = orders.filter(
      (o) => o.status == "cancel"
    );
    const ordersFilter = filterCancelledOrders.map((o) => {
      const suborder = o.subcategories.filter(
        (s) => s.status == "payed"
      );
      o.subcategories = suborder;
      return o;
    });

    const orderReport = ordersFilter.map((order) => {
      return {
        orderNumber: order.order_n,
        date: order.date,
        customerName: `${order.ownerID.firstName} ${order.ownerID.lastName}`,
        companyName: order.companyID ? order.companyID.name : "N/A",
        branchName: order.branchID ? order.branchID.name : "N/A",
        category: order.category,
        subcategories: order.subcategories,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        status: order.status
      };
    });

    res.json({ success: true, report: orderReport });
  }
  catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

//getOrdersReportByDate
export const getOrdersReportByDate = async (req, res) => {
  try {
    const { start, end } = req.query;

    let startDate = new Date(start);
    let endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(404).json({ ok: true, message: "Fechas invalidas" });
    }
    let query = { date: { $gte: startDate, $lt: endDate } };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("branchID")
      .populate("ownerID")
      .populate("category")
      .populate("companyID")
      .populate("subcategories.subcategory")
      .exec();

    const filterCancelledOrders = orders.filter(
      (o) => o.status == "cancel"
    );
    const ordersFilter = filterCancelledOrders.map((o) => {
      const suborder = o.subcategories.filter(
        (s) => s.status == "payed"
      );
      o.subcategories = suborder;
      return o;
    });

    const orderReport = ordersFilter.map((order) => {
      return {
        orderNumber: order.order_n,
        date: order.date,
        customerName: `${order.ownerID.firstName} ${order.ownerID.lastName}`,
        companyName: order.companyID ? order.companyID.name : "N/A",
        branchName: order.branchID ? order.branchID.name : "N/A",
        category: order.category,
        subcategories: order.subcategories,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        status: order.status
      };
    });

    res.json({ success: true, report: orderReport });
  }
  catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}


const ORDER_STATUSES = {
  CONFIRMADA: "CONFIRMADA",
  RESERVED: "reserved",
};

//getMonthlyOrdersReportCONFIRMADA
export const getMonthlyOrdersReportCONFIRMADA = async (req, res) => {
  try {
    const { start, end, status } = req.query;
    console.log("Start " + start);
    console.log("End " + end);
    console.log("Status " + status);

    let startDate = new Date(start);
    console.log("Start Date: " + startDate);

    let endDate = new Date(end);
    console.log("End Date: " + endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(404).json({ ok: true, message: "Fechas invalidas" });
    }

    let query = { date: { $gte: startDate, $lt: endDate } };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("branchID")
      .populate("ownerID")
      .populate("category")
      .populate("companyID")
      .populate("subcategories.subcategory")
      .exec();

    const filterStatusOrders = orders.filter(
      (o) => o.status == req.query.status
    );
    const ordersFilter = filterStatusOrders.map((o) => {
      const suborder = o.subcategories.filter(
        (s) => s.status == ORDER_STATUSES.RESERVED
      );
      o.subcategories = suborder;
      return o;
    });

    const orderReport = ordersFilter.map((order) => {
      return {
        orderNumber: order.order_n,
        date: order.date,
        customerName: `${order.ownerID.fullName}`,
        companyName: order.companyID ? order.companyID.businessName : "N/A",
        branchName: order.branchID ? order.branchID.branchName : "N/A",
        category: order.category,
        subcategories: order.subcategories,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        status: order.status
      };
    });

    // Group orders by month
    const ordersByMonth = {};
    let totalRevenue = 0;
    orderReport.forEach((order) => {
      const month = order.date.getMonth() + 1;
      if (!ordersByMonth[month]) {
        ordersByMonth[month] = {
          orders: 1,
          revenue: order.total
        };
      } else {
        ordersByMonth[month].orders++;
        ordersByMonth[month].revenue += order.total;
      }
      totalRevenue += order.total;
    });

    res.json({ success: true, ordersByMonth, totalRevenue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

//getMonthlyOrdersReportByStatus | <- Check this one
export const getMonthlyOrdersReportByStatus = async (req, res) => {
  try {
    const { start, end, status } = req.body;
    console.log("Start " + start);
    console.log("End " + end);
    console.log("Status " + status);

    let startDate = new Date(start);
    console.log("Start Date: " + startDate);

    let endDate = new Date(end);
    console.log("End Date: " + endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(404).json({ ok: true, message: "Fechas invalidas" });
    }

    let query = { date: { $gte: startDate, $lt: endDate } };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("branchID")
      .populate("ownerID")
      .populate("category")
      .populate("companyID")
      .populate("subcategories.subcategory")
      .exec();

    const filterStatusOrders = orders.filter(
      (o) => o.status == status
    );

    const orderReport = filterStatusOrders.map((order) => {
      return {
        orderNumber: order.order_n,
        date: order.date,
        customerName: `${order.ownerID.fullName}`,
        companyName: order.companyID ? order.companyID.businessName : "N/A",
        branchName: order.branchID ? order.branchID.branchName : "N/A",
        category: order.category,
        subcategories: order.subcategories,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        status: order.status
      };
    });

    // Group orders by month
    const ordersByMonth = {};
    let totalRevenue = 0;
    orderReport.forEach((order) => {
      const month = order.date.getMonth() + 1;
      if (!ordersByMonth[month]) {
        ordersByMonth[month] = {
          orders: 1,
          revenue: order.total
        };
      } else {
        ordersByMonth[month].orders++;
        ordersByMonth[month].revenue += order.total;
      }
      totalRevenue += order.total;
    });

    res.json({ success: true, ordersByMonth, totalRevenue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

const BRANCH_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

// getTotalBranchesByCompany I want to get the total of branches by company displayed in the dashboard
export const getTotalBranchesByCompany = async (req, res) => {
  try {
    const { companyID } = req.query;
    const branches = await Branch.find({ companyID: companyID }).exec();

    const filterStatusBranches = branches.filter(
      (b) => b.status == BRANCH_STATUSES.ACTIVE
    );

    const branchesByCompany = filterStatusBranches.map((branch) => {
      return {
        branchName: branch.branchName
      };
    });
    // Get the total of branches by company
    const totalBranches = branches ? branches.length : 0;

    // Return the total of branches by company and the branches
    res.json({ success: true, totalBranches, branchesByCompany });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

//getTotalOfNewUsersByDayFromTheLastMonth I want to get the total of new users by day from the last month
export const getTotalOfNewUsersByDayFromTheLastMonth = async (req, res) => {
  try {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    const users = await User.find({ createdAt: { $gte: lastMonth, $lt: today } }).exec();

    // Group users by day
    const usersByDay = {};
    users.forEach((user) => {
      const day = user.createdAt.getDate();
      if (!usersByDay[day]) {
        usersByDay[day] = 1;
      } else {
        usersByDay[day]++;
      }
    });

    res.json({ success: true, usersByDay });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

//getTotalOfNewCompaniesByDayFromTheLastMonth I want to get the total of new companies by day from the last month
export const getTotalOfNewCompaniesByDayFromTheLastMonth = async (req, res) => {
  try {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    const companies = await Company.find({ createdAt: { $gte: lastMonth, $lt: today } }).exec();

    // Group companies by day
    const companiesByDay = {};
    companies.forEach((company) => {
      const day = company.createdAt.getDate();
      if (!companiesByDay[day]) {
        companiesByDay[day] = 1;
      } else {
        companiesByDay[day]++;
      }
    });

    res.json({ success: true, companiesByDay });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

//getAllCompaniesAndTheRespectiveBranches I want to get all the companies and the respective branches from each company
export const getAllCompaniesAndTheRespectiveBranches = async (req, res) => {
  try {
    const companies = await Company.find().exec();
    const branches = await Branch.find().exec();

    // Group branches by company
    const branchesByCompany = {};
    branches.forEach((branch) => {
      const { companyID } = branch;
      if (!branchesByCompany[companyID]) {
        branchesByCompany[companyID] = [branch];
      } else {
        branchesByCompany[companyID].push(branch);
      }
    }
    );

    const companiesWithBranches = companies.map((company) => {
      return {
        ...company._doc,
        branches: branchesByCompany[company._id]
      };
    }
    );

    // Get the total of branches by company and add it to the company object with the businessName
    const companiesWithTotalBranches = companiesWithBranches.map((company) => {
      return {
        ...company,
        totalBranches: company.branches ? company.branches.length : 0
      };
    });

    // Return the businessName of the Company and the total of branches by company 
    const companiesWithTotalBranchesAndBusinessName = companiesWithTotalBranches.map((company) => {
      return {
        businessName: company.businessName,
        totalBranches: company.totalBranches
      };
    }
    );

    res.json({ success: true, companiesWithTotalBranchesAndBusinessName });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export const getLatestBranchesThatWereCreated = async (req, res) => {
  try {
    const end = new Date();
    end.setDate(end.getDate() - 84); // 12 weeks ago
    const branches = await Branch.find({ createdAt: { $gte: end } }).sort({ createdAt: -1 }).exec();

    const latestBranches = branches.map((branch) => {
      return {
        branchName: branch.branchName,
        createdAt: branch.createdAt
      };
    });

    // Group branches by week and get the total of branches by week
    const branchesByWeek = {};
    branches.forEach((branch) => {
      const week = new Date(branch.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: '2-digit', day: '2-digit' });
      if (!branchesByWeek[week]) {
        branchesByWeek[week] = 1;
      } else {
        branchesByWeek[week]++;
      }
    });

    // Return the latest branches that were created and the total of branches by week
    res.json({ success: true, latestBranches, branchesByWeek });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export const getLatestGatherersThatWereCreated = async (req, res) => {
  try {
    const end = new Date();
    end.setDate(end.getDate() - 84); // 12 weeks ago
    const gatherers = await Gatherer.find({ createdAt: { $gte: end } }).sort({ createdAt: -1 }).exec();

    const latestGatherers = gatherers.map((gatherer) => {
      return {
        name: gatherer.fullName,
        createdAt: gatherer.createdAt
      };
    });

    // Group gatherers by week and get the total of gatherers by week
    const gatherersByWeek = {};
    gatherers.forEach((gatherer) => {
      const week = new Date(gatherer.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: '2-digit', day: '2-digit' });
      if (!gatherersByWeek[week]) {
        gatherersByWeek[week] = 1;
      } else {
        gatherersByWeek[week]++;
      }
    });

    // Return the latest gatherers that were created and the total of gatherers by week
    res.json({ success: true, latestGatherers, gatherersByWeek });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

//getTotalOrdersByDayFromTheLastWeek I want to get all the orders that have been created and the total of orders by day from the last 10 days from all the branches 
export const getTotalOrdersByDayFromTheLastWeek = async (req, res) => {
  try {
    const today = new Date();
    const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10);
    const orders = await Order.find({ createdAt: { $gte: lastWeek, $lt: today } }).exec();

    const latestOrders = orders.map((order) => {
      return {
        orderNumber: order.order_n,
        createdAt: order.createdAt
      };
    });

    // Group orders by day
    const ordersByDay = {};
    orders.forEach((order) => {
      const day = order.createdAt.getDate();
      if (!ordersByDay[day]) {
        ordersByDay[day] = 1;
      } else {
        ordersByDay[day]++;
      }
    });

    res.json({ success: true, ordersByDay, latestOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

//getTotalOrdersByDayThatHaveBeenConciliadas I want to get all the orders that have been conciliadas and the total of orders by day from the last 10 days from all the branches
export const getTotalOrdersByDayThatHaveBeenConciliadas = async (req, res) => {
  try {
    const today = new Date();
    const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10);
    const orders = await Order.find({ status: 'CONFIRMADA', createdAt: { $gte: lastWeek, $lt: today } }).exec();

    const latestOrders = orders.map((order) => {
      return {
        orderNumber: order.order_n,
        createdAt: order.createdAt,
        status: order.status,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        comision: order.total - order.totalEnterprice
      };
    });

    // Group orders by day
    const ordersByDay = {};
    orders.forEach((order) => {
      const day = order.createdAt.getDate();
      if (!ordersByDay[day]) {
        ordersByDay[day] = 1;
      } else {
        ordersByDay[day]++;
      }
    });

    res.json({ success: true, ordersByDay, latestOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

//getTotalOrdersByBanchFromTheLastMonth I want to get all the orders that have been created and the total of orders by branch from the last 30 days from all the branches of a Company
export const getTotalOrdersByBanchFromTheLastMonth = async (req, res) => {
  try {
    const companyID = req.query.companyID; //Do bien la busqueda Kevin del futuro
    console.log(companyID);
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
    const orders = await Order.find({ companyID, createdAt: { $gte: lastMonth, $lt: today } }).exec();

    const latestOrders = orders.map((order) => {
      return {
        orderNumber: order.order_n,
        createdAt: order.createdAt,
        branchID: order.branchID,
        status: order.status,
      };
    });

    // Group orders by branch
    const ordersByBranch = {};
    for (let i = 0; i < latestOrders.length; i++) {
      const branchID = latestOrders[i].branchID;
      const branch = await Branch.findById(branchID).exec();
      const branchName = branch.branchName;
      if (!ordersByBranch[branchName]) {
        ordersByBranch[branchName] = 1;
      } else {
        ordersByBranch[branchName]++;
      }
    }

    res.json({ success: true, ordersByBranch, latestOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Clients Report

//getTotalOrdersByBranchFromTimeRange I want to get all the orders that have been created and the total of orders by branch from a time range from all the branches of a Company
export const getTotalOrdersByBranchFromTimeRange = async (req, res) => {
  try {
    console.log('Function started.'); // Debug log
    const { companyID, start, end, type } = req.query;
    const cacheKey = `totalOrdersByBranch_${companyID}_${start}_${end}_${type}`;

    // Check if the result exists in the cache
    const cachedResult = await redisGetData(cacheKey);
    if (cachedResult) {
      console.log('Cache hit!'); // Debug log
      return res.json({ fromRedis: true, success: true, ...cachedResult });
    }

    console.log('Cache miss!'); // Debug log

    // Validate if "start" and "end" parameters are valid dates and the start date is before the end date
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
      return res.status(404).json({ ok: true, message: "Invalid start and/or end date." });
    }

    // Validate if "type" parameter is valid
    if (type !== "month" && type !== "week" && type !== "day") {
      return res.status(404).json({ ok: true, message: "Invalid type parameter. Please use 'month', 'week', or 'day'." });
    }

    const orders = await Order.find({ companyID, createdAt: { $gte: start, $lt: end } }).exec();

    const latestOrders = orders.map((order) => {
      return {
        orderNumber: order.order_n,
        createdAt: order.createdAt,
        branchID: order.branchID,
        status: order.status,
      };
    });

    // Group orders by each branch and get the total of orders by branch
    const ordersByBranch = {};
    for (let i = 0; i < latestOrders.length; i++) {
      const branchID = latestOrders[i].branchID;
      const branch = await Branch.findById(branchID).exec();
      const branchName = branch.branchName;
      const orderCount = ordersByBranch[branchName] || 0; // Check if the branch already exists in the object

      ordersByBranch[branchName] = orderCount + 1; // Increment the count for the branch
    }

    // Calculate the previous period's start and end dates based on the "type" parameter
    let prevStart;
    let prevEnd;
    if (type === "month") {
      prevStart = new Date(new Date(start).setMonth(new Date(start).getMonth() - 1));
      prevEnd = new Date(start);
    } else if (type === "week") {
      prevStart = new Date(new Date(start).setDate(new Date(start).getDate() - 7));
      prevEnd = new Date(start);
    } else if (type === "day") {
      prevStart = new Date(new Date(start).setDate(new Date(start).getDate() - 1));
      prevEnd = new Date(start);
    } else {
      throw new Error("Invalid type parameter. Please use 'month', 'week', or 'day'.");
    }

    // Fetch orders for the previous period
    const prevOrders = await Order.find({ companyID, createdAt: { $gte: prevStart, $lt: prevEnd } }).exec();

    // Calculate order counts by branch for the previous period
    const prevOrdersByBranch = {};
    for (let i = 0; i < prevOrders.length; i++) {
      const branchID = prevOrders[i].branchID;
      const branch = await Branch.findById(branchID).exec();
      const branchName = branch.branchName;
      const orderCount = prevOrdersByBranch[branchName] || 0; // Check if the branch already exists in the object

      prevOrdersByBranch[branchName] = orderCount + 1; // Increment the count for the branch
    }

    // Calculate percentage change for each branch
    const branchPercentageChanges = {};
    Object.keys(ordersByBranch).forEach((branchName) => {
      const currentOrders = ordersByBranch[branchName] || 0;
      const prevOrders = prevOrdersByBranch[branchName] || 0;

      // Check if there are previous orders for this branch
      if (prevOrders > 0) {
        const percentageChange = ((currentOrders - prevOrders) / prevOrders) * 100;
        branchPercentageChanges[branchName] = percentageChange;
      } else {
        // Set to null or any other value to indicate no comparison data available
        branchPercentageChanges[branchName] = null;
      }
    });

    // Generate Excel workbook
    const workbook = generateExcelForTotalOrdersByBranchFromTimeRange(ordersByBranch);

    // Convert workbook to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Upload file to AWS S3 bucket
    const nameFile = `orders-by-branch-${Date.now()}.xlsx`;
    const fileURL = await uploadToBucketExcelFile(buffer, nameFile);

    // Remove file from server after 30 minutes
    setTimeout(() => {
      storage.deleteObject({
        Bucket: 'filemanagerrecir',
        Key: nameFile,
      }).promise();
    }, 1800000); // 30 minutes

    // Cache the result with a time-to-live (TTL) of 30 min (you can adjust the TTL as needed)
    await redisSetDataWithTTL(cacheKey, { ordersByBranch, branchPercentageChanges, fileURL }, 1800);

    res.json({ success: true, ordersByBranch, branchPercentageChanges, fileURL });
  } catch (error) {
    console.error('Error:', error); // Debug log
    res.status(500).json({ success: false, message: error.message });
  }
};

//getTotalOrdersFromAllBranchesFromTimeRange I want to get all the orders that have been created and the total of orders from a time range from all the branches of a Company
export const getTotalOrdersFromAllBranchesFromTimeRange = async (req, res) => {
  try {
    const { companyID, start, end } = req.query;

    const orders = await Order.find({ companyID, createdAt: { $gte: start, $lt: end } }).exec();
    console.log(orders);

    const latestOrders = orders.map((order) => {
      return {
        orderNumber: order.order_n,
        createdAt: order.createdAt,
        branchID: order.branchID,
        status: order.status,
      };
    }
    );

    // Group orders by week
    const ordersByWeek = {};
    for (let i = 0; i < latestOrders.length; i++) {
      const getWeek = (date) => {
        const onejan = new Date(date.getFullYear(), 0, 1);
        const millisecsInDay = 86400000;
        return Math.ceil(((date - onejan) / millisecsInDay + onejan.getDay() + 1) / 7);
      };

      const week = getWeek(latestOrders[i].createdAt);
      if (!ordersByWeek[week]) {
        ordersByWeek[week] = 1;
      } else {
        ordersByWeek[week]++;
      }
    }

    // Generate Excel workbook
    const workbook = generateExcelForTotalOrdersFromAllBranchesFromTimeRange(ordersByWeek);

    // Convert workbook to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Upload file to AWS S3 bucket
    const nameFile = `orders-by-week-${Date.now()}.xlsx`;
    const fileURL = await uploadToBucketExcelFile(buffer, nameFile);

    // Remove file from server after 30 minutes
    setTimeout(() => {
      storage.deleteObject({
        Bucket: 'filemanagerrecir',
        Key: nameFile
      }).promise();
    }, 1800000); // 30 minutes

    res.json({ success: true, ordersByWeek, latestOrders, fileURL });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

//getTotalRevenueFromAllBranchesFromTimeRange I want to get all the orders that have been created and the total of revenue from a time range from all the branches of a Company
export const getTotalRevenueFromAllBranchesFromTimeRange = async (req, res) => {
  try {
    const { companyID, status, start, end } = req.query;

    const orders = await Order.find({ companyID, status, createdAt: { $gte: start, $lt: end } }).exec();
    console.log(orders);

    const latestOrders = orders.map((order) => {
      return {
        orderNumber: order.order_n,
        createdAt: order.createdAt,
        branchID: order.branchID,
        status: order.status,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        comision: order.total - order.totalEnterprice
      };
    }
    );

    // Group orders by date
    const ordersByDate = {};
    for (let i = 0; i < latestOrders.length; i++) {
      const date = latestOrders[i].createdAt.toLocaleDateString("en-US", { year: 'numeric', month: '2-digit', day: '2-digit' });
      if (!ordersByDate[date]) {
        ordersByDate[date] = latestOrders[i].totalEnterprice;
      } else {
        ordersByDate[date] += latestOrders[i].totalEnterprice;
      }
    }

    // Round the revenue to 2 decimal places
    Object.keys(ordersByDate).forEach((key) => {
      ordersByDate[key] = ordersByDate[key] //.toFixed(2);
    });

    // Generate Excel workbook
    const workbook = generateExcelForTotalRevenueFromAllBranchesFromTimeRange(ordersByDate);

    // Convert workbook to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Upload file to AWS S3 bucket
    const nameFile = `revenue-by-day-${Date.now()}.xlsx`;
    const fileURL = await uploadToBucketExcelFile(buffer, nameFile);

    // Remove file from server after 30 minutes
    setTimeout(() => {
      storage.deleteObject({
        Bucket: 'filemanagerrecir',
        Key: nameFile
      }).promise();
    }, 1800000); // 30 minutes

    res.json({ success: true, ordersByDate, latestOrders, fileURL });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

//getTotalRevenueByBranchFromTimeRange I want to get all the orders that have been created and the total of revenue from a time range by branch of a Company
export const getTotalRevenueByBranchFromTimeRange = async (req, res) => {
  try {
    const { companyID, status, start, end } = req.query;

    const orders = await Order.find({ companyID, status, createdAt: { $gte: start, $lt: end } }).exec();
    console.log(orders);

    const latestOrders = orders.map((order) => {
      return {
        orderNumber: order.order_n,
        createdAt: order.createdAt,
        branchID: order.branchID,
        status: order.status,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        comision: order.total - order.totalEnterprice
      };
    });

    // Group orders by branch
    const ordersByBranch = {};
    for (let i = 0; i < latestOrders.length; i++) {
      const branchID = latestOrders[i].branchID;

      if (!ordersByBranch[branchID]) {
        ordersByBranch[branchID] = [];
      }

      ordersByBranch[branchID].push(latestOrders[i]);
    }

    // Get the branch names and calculate total revenue by date for each branch
    const revenueByBranchByDate = {};
    for (const branchID in ordersByBranch) {
      const branch = await Branch.findById(branchID).exec();
      const branchName = branch ? branch.branchName : `Branch ID ${branchID}`;

      for (let i = 0; i < ordersByBranch[branchID].length; i++) {
        const date = ordersByBranch[branchID][i].createdAt.toLocaleDateString("en-US", { year: 'numeric', month: '2-digit', day: '2-digit' });
        const totalRevenue = ordersByBranch[branchID][i].totalEnterprice;

        if (!revenueByBranchByDate[date]) {
          revenueByBranchByDate[date] = {};
        }

        if (!revenueByBranchByDate[date][branchName]) {
          revenueByBranchByDate[date][branchName] = {
            branchName,
            revenue: totalRevenue
          };
        } else {
          revenueByBranchByDate[date][branchName].revenue += totalRevenue;
        }
      }
    }

    // Round the revenue for each branch on each date to 2 decimal places
    for (const date in revenueByBranchByDate) {
      for (const branchName in revenueByBranchByDate[date]) {
        revenueByBranchByDate[date][branchName].revenue = revenueByBranchByDate[date][branchName].revenue.toFixed(2);
      }
    }

    // Generate Excel workbook
    const workbook = generateExcelForTotalRevenueByBranchFromTimeRange(revenueByBranchByDate);

    // Convert workbook to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Upload file to AWS S3 bucket
    const nameFile = `revenue-by-branch-${Date.now()}.xlsx`;
    const fileURL = await uploadToBucketExcelFile(buffer, nameFile);

    // Remove file from server after 30 minutes
    setTimeout(() => {
      storage.deleteObject({
        Bucket: 'filemanagerrecir',
        Key: nameFile
      }).promise();
    }, 1800000); // 30 minutes

    res.json({ success: true, revenueByBranchByDate, latestOrders, fileURL });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export const getTotalRevenueByBranchNameFromTimeRange = async (req, res) => {
  try {
    const { companyID, status, start, end } = req.query;

    const orders = await Order.find({ companyID, status, createdAt: { $gte: start, $lt: end } }).exec();
    console.log(orders);

    const latestOrders = orders.map((order) => {
      return {
        orderNumber: order.order_n,
        createdAt: order.createdAt,
        branchID: order.branchID,
        status: order.status,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        comision: order.total - order.totalEnterprice
      };
    });

    // Get branch information for each order
    const ordersWithBranchInfo = [];
    for (let i = 0; i < latestOrders.length; i++) {
      const branchID = latestOrders[i].branchID;
      const branch = await Branch.findById(branchID).exec();
      const branchName = branch ? branch.branchName : `Branch ID ${branchID}`;

      ordersWithBranchInfo.push({
        ...latestOrders[i],
        branchName
      });
    }

    // Group orders by branchName
    const ordersByBranchName = {};
    for (let i = 0; i < ordersWithBranchInfo.length; i++) {
      const branchName = ordersWithBranchInfo[i].branchName;

      if (!ordersByBranchName[branchName]) {
        ordersByBranchName[branchName] = [];
      }

      ordersByBranchName[branchName].push(ordersWithBranchInfo[i]);
    }

    // Calculate total revenue by date for each branchName
    const revenueByBranchNameByDate = {};
    for (const branchName in ordersByBranchName) {
      for (let i = 0; i < ordersByBranchName[branchName].length; i++) {
        const order = ordersByBranchName[branchName][i];
        const date = order.createdAt.toLocaleDateString("en-US", { year: 'numeric', month: '2-digit', day: '2-digit' });
        const totalRevenue = order.totalEnterprice;

        if (!revenueByBranchNameByDate[branchName]) {
          revenueByBranchNameByDate[branchName] = {};
        }

        if (!revenueByBranchNameByDate[branchName][date]) {
          revenueByBranchNameByDate[branchName][date] = totalRevenue;
        } else {
          revenueByBranchNameByDate[branchName][date] += totalRevenue;
        }
      }
    }

    // Round the revenue for each branchName on each date to 2 decimal places
    for (const branchName in revenueByBranchNameByDate) {
      for (const date in revenueByBranchNameByDate[branchName]) {
        revenueByBranchNameByDate[branchName][date] = revenueByBranchNameByDate[branchName][date];
      }
    }

    // Generate Excel workbook
    const workbook = generateExcelForTotalRevenueByBranchNameFromTimeRange(revenueByBranchNameByDate);

    // Convert workbook to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Upload file to AWS S3 bucket
    const nameFile = `revenue-by-branchName-${Date.now()}.xlsx`;
    const fileURL = await uploadToBucketExcelFile(buffer, nameFile);

    // Remove file from server after 30 minutes
    setTimeout(() => {
      storage.deleteObject({
        Bucket: 'filemanagerrecir',
        Key: nameFile
      }).promise();
    }, 1800000); // 30 minutes

    res.json({ success: true, revenueByBranchNameByDate, ordersWithBranchInfo, fileURL });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Helper function to promisify callback-based functions
const promisify = (fn) => util.promisify(fn);

// Helper function to retrieve subcategory details
const getSubcategoryDetails = async (subcategoryName) => {
  const subcategoryDoc = await SubCategory.findById(subcategoryName).exec();
  return subcategoryDoc.subCategoryName;
};

// Helper function to retrieve branch details
const getBranchDetails = async (branchID) => {
  const branch = await Branch.findById(branchID).exec();
  return branch.branchName;
};

// Helper function to convert weight from pounds to tons
const convertToTons = (weightInPounds) => {
  return (weightInPounds / 2204.6).toFixed(3);
};

// Handler function for getTotalWeightFromAllBranchesFromTimeRangeBySubCategory 
export const getTotalWeightFromAllBranchesFromTimeRangeBySubCategory = async (req, res) => {
  try {
    const { companyID, start, end } = req.query;

    // Validate input parameters
    if (!companyID || !start || !end) {
      return res.status(400).json({ success: false, message: 'Missing required parameters.' });
    }

    // Perform database query using query builder or aggregation pipeline
    const orders = await Order.find({ companyID, createdAt: { $gte: start, $lt: end } }).exec();

    const latestOrders = orders.map((order) => {
      return {
        orderNumber: order.order_n,
        createdAt: order.createdAt,
        branchID: order.branchID,
        status: order.status,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        comision: order.total - order.totalEnterprice,
        subcategories: order.subcategories.map((sub) => {
          return {
            SubCategoryID: sub._id,
            SubCategoryName: sub.subcategory,
            startingWeight: sub.starting_weight,
            weight: sub.quantity
          };
        })
      };
    });

    // Group orders by branch and calculate total weight
    const ordersByBranch = {};
    let totalWeightInPounds = 0;

    for (const latestOrder of latestOrders) {
      const branchID = latestOrder.branchID;
      const branchName = await getBranchDetails(branchID);

      if (!ordersByBranch[branchName]) {
        ordersByBranch[branchName] = {
          totalWeight: 0,
          subcategories: {}
        };
      }

      for (const subcategory of latestOrder.subcategories) {
        const subcategoryName = subcategory.SubCategoryName;
        const subcategoryDocName = await getSubcategoryDetails(subcategoryName);

        const subcategoryWeight = subcategory.weight;
        const subcategoryWeightInTons = convertToTons(subcategoryWeight);

        if (!ordersByBranch[branchName].subcategories[subcategoryDocName]) {
          ordersByBranch[branchName].subcategories[subcategoryDocName] = {
            subcategoryWeightInTons: 0
          };
        }

        ordersByBranch[branchName].subcategories[subcategoryDocName].subcategoryWeightInTons += Number(subcategoryWeightInTons);
        ordersByBranch[branchName].totalWeight += subcategoryWeight;

        totalWeightInPounds += subcategoryWeight;
      }
    }

    const totalWeightInTons = convertToTons(totalWeightInPounds);

    // Generate Excel workbook
    const workbook = generateExcel(ordersByBranch, totalWeightInTons);

    // Convert workbook to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Upload file to AWS S3 bucket
    const nameFile = `orders-by-branch-${Date.now()}.xlsx`;
    const fileURL = await uploadToBucketExcelFile(buffer, nameFile);

    // Remove file from server after 30 minutes
    setTimeout(() => {
      storage.deleteObject({
        Bucket: 'filemanagerrecir',
        Key: nameFile
      }).promise();
    }, 1800000); // 30 minutes

    // Send response
    res.json({ success: true, ordersByBranch, totalWeight: totalWeightInTons, fileURL });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTotalSubcategoryWeightFromAllBranchesFromTimeRangeBySubCategory = async (req, res) => {
  try {
    const { companyID, start, end } = req.query;

    // Validate input parameters
    if (!companyID || !start || !end) {
      return res.status(400).json({ success: false, message: 'Missing required parameters.' });
    }

    // Perform database query using query builder or aggregation pipeline
    const orders = await Order.find({ companyID, createdAt: { $gte: start, $lt: end } }).exec();

    const latestOrders = orders.map((order) => {
      return {
        orderNumber: order.order_n,
        createdAt: order.createdAt,
        branchID: order.branchID,
        status: order.status,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        comision: order.total - order.totalEnterprice,
        subcategories: order.subcategories.map((sub) => {
          return {
            SubCategoryID: sub._id,
            SubCategoryName: sub.subcategory,
            startingWeight: sub.starting_weight,
            weight: sub.quantity
          };
        })
      };
    });

    // Helper function to retrieve subcategory details
    const getSubcategoryDetails = async (SubCategoryID) => {
      const subcategoryDoc = await SubCategory.findById(SubCategoryID).exec();
      return subcategoryDoc ? subcategoryDoc.subCategoryName : SubCategoryID;
    };


    // Calculate total subcategory weight
    const subcategoriesTotalWeight = {};

    for (const latestOrder of latestOrders) {
      for (const subcategory of latestOrder.subcategories) {
        const subcategoryName = await getSubcategoryDetails(subcategory.SubCategoryName);

        if (!subcategoriesTotalWeight[subcategoryName]) {
          subcategoriesTotalWeight[subcategoryName] = 0;
        }

        subcategoriesTotalWeight[subcategoryName] += subcategory.weight;
      }
    }

    // Convert total subcategory weight to tons
    for (const subcategoryName in subcategoriesTotalWeight) {
      subcategoriesTotalWeight[subcategoryName] = convertToTons(subcategoriesTotalWeight[subcategoryName]);
    }

    // Generate Excel workbook with the updated subcategory names
    const workbook = generateExcelWithSubcategoryWeight(subcategoriesTotalWeight);

    // Convert workbook to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Upload file to AWS S3 bucket
    const nameFile = `subcategory-weight-${Date.now()}.xlsx`;
    const fileURL = await uploadToBucketExcelFile(buffer, nameFile);

    // Remove file from server after 30 minutes
    setTimeout(() => {
      storage.deleteObject({
        Bucket: 'filemanagerrecir',
        Key: nameFile
      }).promise();
    }, 1800000); // 30 minutes

    // Send response
    res.json({ success: true, subcategoriesTotalWeight, fileURL });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Handler function for getTotalWeightByBranchFromTimeRange
export const getTotalWeightByBranchFromTimeRange = async (req, res) => {
  try {
    const { companyID, start, end } = req.query;

    // Validate input parameters
    if (!companyID || !start || !end) {
      return res.status(400).json({ success: false, message: 'Missing required parameters.' });
    }

    // Perform database query using query builder or aggregation pipeline
    const orders = await Order.find({ companyID, createdAt: { $gte: start, $lt: end } }).exec();

    const latestOrders = orders.map((order) => {
      // Mapping logic...
      return {
        orderNumber: order.order_n,
        createdAt: order.createdAt,
        branchID: order.branchID,
        status: order.status,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        comision: order.total - order.totalEnterprice,
        subcategories: order.subcategories.map((sub) => {
          return {
            SubCategoryID: sub._id,
            startingWeight: sub.starting_weight,
            weight: sub.quantity
          }
        })
      };
    });

    // Group orders by branch
    const ordersByBranch = {};
    for (let i = 0; i < latestOrders.length; i++) {
      // Grouping logic...
      const branchID = latestOrders[i].branchID;
      const branch = await Branch.findById(branchID).exec();
      const branchName = branch.branchName;
      if (!ordersByBranch[branchName]) {
        ordersByBranch[branchName] = {
          totalWeightBranch: 0,
          subcategories: {}
        };
      }
      for (let j = 0; j < latestOrders[i].subcategories.length; j++) {
        const subcategory = latestOrders[i].subcategories[j];
        const subcategoryID = subcategory.SubCategoryID;
        const subcategoryWeight = subcategory.weight;
        if (!ordersByBranch[branchName].subcategories[subcategoryID]) {
          ordersByBranch[branchName].subcategories[subcategoryID] = 0;
        }
        ordersByBranch[branchName].subcategories[subcategoryID] += subcategoryWeight;
        ordersByBranch[branchName].totalWeightBranch += subcategoryWeight;
      }
    }

    // Convert totalWeight from pounds to tons
    const totalWeightInTons = (Object.values(ordersByBranch).reduce((acc, curr) => acc + curr.totalWeightBranch, 0) / 2204.6).toFixed(3);

    // Generate Excel workbook
    const workbook = generateExcelForTotalWeightByBranchFromTimeRange(ordersByBranch, totalWeightInTons);

    // Convert workbook to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Upload file to AWS S3 bucket
    const nameFile = `orders-by-branch-${Date.now()}.xlsx`;
    const fileURL = await uploadToBucketExcelFile(buffer, nameFile);

    // Remove file from server after 30 minutes
    setTimeout(() => {
      storage.deleteObject({
        Bucket: 'filemanagerrecir',
        Key: nameFile
      }).promise();
    }, 1800000); // 30 minutes

    // Send response
    res.json({ success: true, ordersByBranch: { ...ordersByBranch, totalWeight: totalWeightInTons }, fileURL });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//getTotalWeightFromAllBranchesFromTimeRange I want to get all the orders that have been created and the total of weight of each subcategorie from a time range from all the branches of a Company
export const getTotalWeightFromAllBranchesFromTimeRange = async (req, res) => {
  try {
    console.log('Function started.'); // Debug log
    const { companyID, start, end } = req.query;
    const cacheKey = `totalWeight_${companyID}_${start}_${end}`;

    // Check if the result exists in the cache
    const cachedResult = await redisGetData(cacheKey);
    if (cachedResult) {
      console.log('Cache hit!'); // Debug log
      return res.json({ fromRedis: true, success: true, ...cachedResult });
    }

    console.log('Cache miss!'); // Debug log
    if (!companyID || !start || !end) {
      return res.status(400).json({ success: false, message: 'Missing required parameters.' });
    }

    if (start > end) {
      return res.status(400).json({ success: false, message: 'Start date must be before end date.' });
    }

    const orders = await Order.find({ companyID, createdAt: { $gte: start, $lt: end } }).exec();
    console.log('Fetched orders:', orders); // Debug log


    const latestOrders = orders.map((order) => {
      return {
        orderNumber: order.order_n,
        createdAt: order.createdAt,
        branchID: order.branchID,
        status: order.status,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        comision: order.total - order.totalEnterprice,
        subcategories: order.subcategories.map((sub) => {
          return {
            SubCategoryID: sub._id,
            startingWeight: sub.starting_weight,
            weight: sub.quantity
          }
        })
      };
    }
    );

    // Group orders by branch
    const ordersByBranch = {};
    for (let i = 0; i < latestOrders.length; i++) {
      const branchID = latestOrders[i].branchID;
      const branch = await Branch.findById(branchID).exec();
      const branchName = branch.branchName;
      if (!ordersByBranch[branchName]) {
        ordersByBranch[branchName] = {
          totalWeight: 0,
          subcategories: {}
        };
      }
      for (let j = 0; j < latestOrders[i].subcategories.length; j++) {
        const subcategory = latestOrders[i].subcategories[j];
        const subcategoryID = subcategory.SubCategoryID;
        const subcategoryWeight = subcategory.weight;
        if (!ordersByBranch[branchName].subcategories[subcategoryID]) {
          ordersByBranch[branchName].subcategories[subcategoryID] = 0;
        }
        ordersByBranch[branchName].subcategories[subcategoryID] += subcategoryWeight;
        ordersByBranch[branchName].totalWeight += subcategoryWeight / 2204.6; // Convert to tons
      }
    }

    // Convert totalWeight from pounds to tons
    const totalWeightInTons = (Object.values(ordersByBranch).reduce((acc, curr) => acc + curr.totalWeight, 0)).toFixed(3);

    // Generate Excel workbook
    const workbook = generateExcelForTotalWeightFromAllBranchesFromTimeRange(ordersByBranch, totalWeightInTons);

    // Convert workbook to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Upload file to AWS S3 bucket
    const nameFile = `orders-by-branch-${Date.now()}.xlsx`;
    const fileURL = await uploadToBucketExcelFile(buffer, nameFile);

    // Remove file from server after 30 minutes
    setTimeout(() => {
      storage.deleteObject({
        Bucket: 'filemanagerrecir',
        Key: nameFile
      }).promise();
    }, 1800000); // 30 minutes

    // Cache the result with a time-to-live (TTL) of 30 min (you can adjust the TTL as needed)
    // I removed latestOrders from the response because it was too big
    await redisSetDataWithTTL(cacheKey, { ordersByBranch, totalWeightInTons, fileURL }, 3600);

    // I removed latestOrders from the response because it was too big
    res.json({ success: true, ordersByBranch: { ...ordersByBranch, totalWeight: totalWeightInTons }, fileURL });
  } catch (error) {
    console.error('Error:', error); // Debug log
    res.status(500).json({ success: false, message: error.message });
  }
}

// Function to get the total quantity for each companyID
export async function getTotalQuantityByCompany() {
  try {
    const pipeline = [
      {
        $unwind: '$subcategories',
      },
      {
        $group: {
          _id: '$companyID',
          totalQuantity: { $sum: '$subcategories.quantity' },
        },
      },
    ];

    const result = await Order.aggregate(pipeline);
    return result;
  } catch (error) {
    throw error;
  }
}

// Function to get the total quantity for all companyIDs
export async function getTotalQuantityForAllCompanies() {
  try {
    const pipeline = [
      {
        $unwind: '$subcategories',
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$subcategories.quantity' },
        },
      },
    ];

    const result = await Order.aggregate(pipeline);
    return result;
  } catch (error) {
    throw error;
  }
}

export const getOrdersWithAllDetails = async (req, res) => {
  try {
    const { start, end, companyID, status } = req.query;

    if (!start || !end || !status) {
      return res.status(400).json({ success: false, message: 'Missing required parameters.' });
    }

    if (status && !['CONFIRMADA', 'reservation-pending', 'cancel', 'reserved', 'conciliada'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status provided.' });
    }
    // Construct the search query based on whether companyID is provided
    let searchQuery = {
      status, createdAt: { $gte: start, $lt: end }
    };

    if (companyID) { // If a companyID is provided, include it in the search query
      searchQuery.companyID = companyID;
    }

    // Step 1: Fetch orders
    const orders = await Order.find(searchQuery).exec();

    // Step 2: Transform the orders data
    const latestOrders = await Promise.allSettled(orders.map(async (order) => {
      const latestOrder = {
        orderId: order._id,
        orderNumber: order.order_n,
        createdAt: order.createdAt,
        branchID: order.branchID,
        status: order.status,
        total: order.total,
        totalEnterprice: order.totalEnterprice,
        comision: order.total - order.totalEnterprice,
        subcategories: [],
      };

      // Step 3: Fetch subcategory details
      const subcategoryPromises = order.subcategories.map(async (sub) => {
        const gatherer = sub.ownerID ? await getGathererDetailsForOrders(sub.ownerID) : 'N/A';
        const subcategoryName = await getSubcategoryDetailsForOrders(sub.subcategory);
        latestOrder.subcategories.push({
          gatherer,
          SubCategoryID: sub._id,
          SubCategoryName: subcategoryName,
          startingWeight: sub.starting_weight,
          weight: sub.quantity,
          // Adding new fields to the response
          gatherer_invoice_status: sub.gatherer_invoice_status || 'No Definido',
          gatherer_bill_status: sub.gatherer_bill_status || 'No Definido',
          gatherer_deliver_invoice: sub.gatherer_deliver_invoice || 'No Definido',
          client_invoice_status: sub.client_invoice_status || 'No Definido',
          client_bill_status: sub.client_bill_status || 'No Definido',
          client_deliver_invoice: sub.client_deliver_invoice || 'No Definido'
        });
      });

      await Promise.allSettled(subcategoryPromises);

      // Step 4: Fetch branch details
      latestOrder.branchName = await getBranchDetailsForOrders(latestOrder.branchID);

      return latestOrder;
    }));

    // Step 5: Generate Excel workbook with all the orders and their details
    const workbook = generateExcelForOrdersWithAllDetails(latestOrders);

    // Step 6: Convert workbook to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Step 7: Upload file to AWS S3 bucket
    const nameFile = `orders-with-all-details-${Date.now()}.xlsx`;
    const fileURL = await uploadToBucketExcelFile(buffer, nameFile);

    // Step 8: Remove file from server after 30 minutes
    setTimeout(() => {
      storage.deleteObject({
        Bucket: 'filemanagerrecir',
        Key: nameFile
      }).promise();
    }, 1800000);

    // Step 9: Send response
    res.json({ success: true, latestOrders, fileURL });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Define a function to get subcategory details
const getSubcategoryDetailsForOrders = async (SubCategoryID) => {
  const subcategoryDoc = await SubCategory.findById(SubCategoryID).exec();
  return subcategoryDoc ? subcategoryDoc.subCategoryName : SubCategoryID;
};

// Define a function to get branch details
const getBranchDetailsForOrders = async (branchID) => {
  const branch = await Branch.findById(branchID).exec();
  return branch.branchName;
};

// Define a function to get gatherer details
const getGathererDetailsForOrders = async (gathererID) => {
  if (gathererID === 'N/A') {
    return 'N/A';
  }

  const gatherer = await User.findById(gathererID).exec();
  return gatherer ? gatherer.username : gathererID;
};

export const updateSubcategoryFields = async (req, res) => {
  try {
    const { orderId, subcategoryId } = req.query;
    const updateData = {};

    if (!orderId || !subcategoryId) {
      return res.status(400).json({ success: false, message: 'orderId or subcategoryId is missing.' });
    }

    // After processing the fields
    // if (Object.keys(updateData).length === 0) {
    //   return res.status(400).json({ success: false, message: 'No valid fields provided for update.', receivedData: req.body });
    // }

    // Define the fields to check
    const fields = [
      'gatherer_invoice_status',
      'gatherer_bill_status',
      'gatherer_deliver_invoice',
      'client_invoice_status',
      'client_bill_status',
      'client_deliver_invoice'
    ];

    console.log(req.body);

    // Loop through each field and if it's not empty, add it to the updateData object
    fields.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        updateData[`subcategories.$.${field}`] = req.body[field];
      }
    });

    // If none of the fields were provided, don't proceed with the database operation
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided for update.' });
    }

    // Find the order and update the specified subcategory
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, "subcategories._id": subcategoryId },
      { $set: updateData },
      { new: true } // This option returns the modified document
    );

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Order or subcategory not found.' });
    }

    // Send back the updated order
    res.status(200).json({ success: true, updatedOrder });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Retrive all the Companies have the status equal to "active"
export const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find({ status: 'active' }).exec();
    res.json({ success: true, companies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Retrive only the _id and the businessName of each Company
export const getCompaniesNames = async (req, res) => {
  try {
    const companies = await Company.find({ status: 'active' }, '_id businessName').exec();
    res.json({ success: true, companies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Retrieve orders grouped by zones with specified statuses
export const getOrdersByZoneAndStatus = async (req, res) => {
  try {
    const branchesWithStatus = await Branch.find().exec();
    const branchesIDs = branchesWithStatus.map(branch => branch._id);

    const orders = await Order.find({
      branchID: { $in: branchesIDs },
      $or: [
        { status: "reservation-pending" },
        { status: "pending-complete-payed" },
        { status: "CONFIRMADA" },
        { status: "reserved" },
      ]
    })
      .sort({ createdAt: -1 })
      .populate("category")
      .populate("userID")
      .populate("ownerID")
      .populate("companyID")
      .populate("subcategories.subcategory")
      .populate("branchID")
      .exec();

    let ordersFilter = orders.map((o) => {
      let newTotal = 0;
      let NewTotalEnterprice = 0;
      let suborder = o.subcategories.filter(
        (s) => s.status == "reservation-pending"
      );

      suborder.forEach((sub) => {
        newTotal += sub.subtotal * 1;
        NewTotalEnterprice += sub.subtotalEnterprice * 1;
      });

      o.total = newTotal;
      o.totalEnterprice = NewTotalEnterprice;
      o.subcategories = suborder;
      return o;
    });

    let filterNewOrders = ordersFilter.filter(
      (o) => o.subcategories.length != 0
    );

    const { groupedOrders, totalWeight } = groupOrdersByMaxWeight(filterNewOrders, 10);

    // Return the grouped orders along with the total weight
    res.json({ success: true, ordersByZoneAndStatusMax10Tons: groupedOrders, totalWeight });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Function to group orders by maximum weight per zone
function groupOrdersByMaxWeight(orders, maxWeightPerGroup) {
  const groupedOrders = [];
  let currentGroup = [];
  let currentWeight = 0;
  let totalWeight = 0;
  let totalGroupsByZone = 0;
  let totalSuborders = 0;
  const subCategoryNames = new Set();

  orders.forEach(order => {
    const orderWeight = order.subcategories.reduce((total, subcategory) => {
      subCategoryNames.add(subcategory.subcategory.subCategoryName); // Collecting unique subCategoryNames
      totalSuborders++;
      return total + (Number(subcategory.starting_weight) || 0);
    }, 0);

    if (currentWeight + orderWeight > maxWeightPerGroup) {
      if (currentGroup.length > 0) {
        groupedOrders.push({
          orders: currentGroup,
          groupWeight: currentWeight,
          zone: currentGroup[0].branchID.zone,
          latitude: currentGroup[0].branchID.latitude,
          longitude: currentGroup[0].branchID.longitude,
          subCategoryNames: Array.from(subCategoryNames), // Convert Set to Array
          totalSuborders: totalSuborders
        });
        totalGroupsByZone++;
        totalWeight += currentWeight;
      }
      currentGroup = [order];
      currentWeight = orderWeight;
      subCategoryNames.clear(); // Clearing Set for the next group
      totalSuborders = 0;
    } else {
      currentGroup.push(order);
      currentWeight += orderWeight;
    }
  });

  if (currentGroup.length > 0) {
    groupedOrders.push({
      orders: currentGroup,
      groupWeight: currentWeight,
      zone: currentGroup[0].branchID.zone,
      latitude: currentGroup[0].branchID.latitude,
      longitude: currentGroup[0].branchID.longitude,
      subCategoryNames: Array.from(subCategoryNames), // Convert Set to Array
      totalSuborders: totalSuborders
    });
    totalGroupsByZone++;
    totalWeight += currentWeight;
  }

  return { groupedOrders, totalWeight, totalGroupsByZone };
}
