import { Router } from "express";

const router = Router();

import * as orderCtrl from "../controllers/order.controller";
import { verifySignup } from "../middlewares";
import { verifyToken } from "../middlewares/authJwt";
import webpush from "web-push";

// import rateLimit from "express-rate-limit"; // Express-rate-limit is a rate-limiting middleware for Express. Used to limit repeated requests to public APIs and/or endpoints such as password reset.

// const limiter = rateLimit({ // Limit repeated requests to public APIs and/or endpoints such as password reset
//   windowMs: 60 * 1000, // 1 minute
//   max: 10, // limit each IP to 10 requests per windowMs
//   standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
// });


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

router.get('/enviar-notificacion', enviarNotificacion);
/******************** POST ROUTES ********************/
router.post("/create", verifyToken, orderCtrl.registerOrder);
router.post("/reservSuborder", verifyToken, orderCtrl.reservarSubOrden);
router.post("/reservAllSuborder", verifyToken, orderCtrl.reservedAllSubOrden);
router.post("/finalizedSuborder", verifyToken, orderCtrl.finalizarSubOrden);
router.post(
  "/getOrdersByMunicipality",
  verifyToken,
  orderCtrl.getOrdersByMunicipio
);
router.post("/getOrderById", verifyToken, orderCtrl.getOrderById);
router.post(
  "/getordersbycompanyall",
  verifyToken,
  orderCtrl.getOrdersByCompanyAll
);
router.post("/statistics", orderCtrl.getMetricasOrdersByCompany);
router.post("/cancel", verifyToken, orderCtrl.cancelOrder);
router.post("/conciliar", verifyToken, orderCtrl.conciliarOrder);
router.post("/update-weight", verifyToken, orderCtrl.updateWeightOrder);
router.post("/updateStatusOrder", verifyToken, orderCtrl.updateStatusOrder);

/******************** GET ROUTES ********************/

router.get("/getorders", verifyToken, orderCtrl.getOrders);
router.get("/getordersreserved", verifyToken, orderCtrl.getOrdersReserver);
router.get("/getCancelledOrders", verifyToken, orderCtrl.getCancelledOrders);

router.get("/getAllorders", verifyToken, orderCtrl.getAllOrders);
router.get("/getMyReservations", verifyToken, orderCtrl.getMyReservations);
router.get("/getOrdersByCompany", verifyToken, orderCtrl.getOrdersByCompany);
router.get("/getordersbysucursal", verifyToken, orderCtrl.getOrdersBySucursal);
router.get("/getorderbydates", verifyToken, orderCtrl.filterOrdersbydates);
router.get("/getorderpayedbydates", verifyToken, orderCtrl.filterOrdersPayedbydates);
router.get("/getordercompletedbydates", verifyToken, orderCtrl.filterOrdersCompletedbydates);
router.get("/getorderpayedbydatesAdmin", verifyToken, orderCtrl.filterOrdersPayedbydatesAdmin);
router.get("/getordercanceledbydatesAdmin", verifyToken, orderCtrl.filterOrdersCanceledbydates);
router.get("/getOrdersPayed", verifyToken, orderCtrl.getOrdersPayedByGatherer);
router.get("/getOrdersCompleted", verifyToken, orderCtrl.getOrdersCompletedByGatherer);
// router.get("/getOrdersCompleted", verifyToken, enviarNotificacion, orderCtrl.getOrdersCompletedByGatherer);
router.get("/getOrdersCompletedForAdmin", verifyToken, orderCtrl.getOrdersCompletedForAdmin);
router.get("/statisticsByOrder", verifyToken, orderCtrl.getMetricasByOrder);
router.get(
  "/statisticsBySucursal",
  verifyToken,
  orderCtrl.getMetricasOrdersBySucursal
);
router.get(
  "/statisticsByGatherer",
  verifyToken,
  orderCtrl.getMetricasOrdersByGatherer
);
router.get(
  "/statisticsByAdmin",
  verifyToken,
  orderCtrl.getMetricasOrdersForAdmin
);
router.get(
  "/getOrdersPayedForAdmin",
  verifyToken,
  orderCtrl.getOrdersPayedForAdmin
);

router.get(
  "/getOrdersConciliadasForAdmin",
  verifyToken,
  orderCtrl.getOrdersConciliadasForAdmin
);

router.get(
  "/getCanceledOrders",
  verifyToken,
  orderCtrl.getCanceledOrdersForAdmin
);

//Reports for Admin

router.get(
  "/getOrdersReport",
  verifyToken,
  orderCtrl.getOrdersReport
);

//getMonthlyOrdersReportCONFIRMADA
router.get(
  "/getMonthlyOrdersReportCONFIRMADA",
  verifyToken,
  orderCtrl.getMonthlyOrdersReportCONFIRMADA
);

router.get(
  "/getOrdersReportByCompany",
  verifyToken,
  orderCtrl.getOrdersReportByCompany
);

router.get(
  "/getOrdersReportByBranch",
  verifyToken,
  orderCtrl.getOrdersReportByBranch
);

router.get(
  "/getOrdersReportByGatherer",
  verifyToken,
  orderCtrl.getOrdersReportByGatherer
);

//getOrdersReportByCategory
router.get(
  "/getOrdersReportByCategory",
  verifyToken,
  orderCtrl.getOrdersReportByCategory
);

//getOrdersReportBySubcategory
router.get(
  "/getOrdersReportBySubcategory",
  verifyToken,
  orderCtrl.getOrdersReportBySubcategory
);

router.get(
  "/getOrdersReportByMunicipality",
  verifyToken,
  orderCtrl.getOrdersReportByMunicipality
);

router.get(
  "/getOrdersReportByStatus",
  verifyToken,
  orderCtrl.getOrdersReportByStatus
);

router.get(
  "/getOrdersReportByDate",
  verifyToken,
  orderCtrl.getOrdersReportByDate
);

//getMonthlyOrdersReportByStatus
router.get(
  "/getMonthlyOrdersReportByStatus",
  verifyToken,
  orderCtrl.getMonthlyOrdersReportByStatus
);

//getTotalBranchesByCompany
router.get(
  "/getTotalBranchesByCompany",
  verifyToken,
  orderCtrl.getTotalBranchesByCompany
);

//getAllCompaniesAndTheRespectiveBranches
router.get(
  "/getAllCompaniesAndTheRespectiveBranches",
  verifyToken,
  orderCtrl.getAllCompaniesAndTheRespectiveBranches
);

//getTotalOrdersByDayFromTheLastWeek
router.get(
  "/getTotalOrdersByDayFromTheLastWeek",
  verifyToken,
  orderCtrl.getTotalOrdersByDayFromTheLastWeek
);

//getTotalOfNewUsersByDayFromTheLastMonth
router.get(
  "/getTotalOfNewUsersByDayFromTheLastMonth",
  verifyToken,
  orderCtrl.getTotalOfNewUsersByDayFromTheLastMonth
);

//getTotalOfNewCompaniesByDayFromTheLastMonth
router.get(
  "/getTotalOfNewCompaniesByDayFromTheLastMonth",
  verifyToken,
  orderCtrl.getTotalOfNewCompaniesByDayFromTheLastMonth
);

//getLatestBranchesThatWereCreated
router.get(
  "/getLatestBranchesThatWereCreated",
  verifyToken,
  orderCtrl.getLatestBranchesThatWereCreated
);

//getLatestGatherersThatWereCreated
router.get(
  "/getLatestGatherersThatWereCreated",
  verifyToken,
  orderCtrl.getLatestGatherersThatWereCreated
);

//getTotalOrdersByDayThatHaveBeenConciliadas
router.get(
  "/getTotalOrdersByDayThatHaveBeenConciliadas",
  verifyToken,
  orderCtrl.getTotalOrdersByDayThatHaveBeenConciliadas
);

//getTotalOrdersByBanchFromTheLastMonth
router.get(
  "/getTotalOrdersByBanchFromTheLastMonth",
  verifyToken,
  orderCtrl.getTotalOrdersByBanchFromTheLastMonth
);

//getTotalOrdersByBranchFromTimeRange
router.get(
  "/getTotalOrdersByBranchFromTimeRange",
  verifyToken,
  orderCtrl.getTotalOrdersByBranchFromTimeRange
);

//getTotalOrdersFromAllBranchesFromTimeRange
router.get(
  "/getTotalOrdersFromAllBranchesFromTimeRange",
  verifyToken,
  orderCtrl.getTotalOrdersFromAllBranchesFromTimeRange
);

//getTotalRevenueFromAllBranchesFromTimeRange
router.get(
  "/getTotalRevenueFromAllBranchesFromTimeRange",
  verifyToken,
  orderCtrl.getTotalRevenueFromAllBranchesFromTimeRange
);

//getTotalWeightByBranchFromTimeRange
router.get(
  "/getTotalWeightByBranchFromTimeRange",
  verifyToken,
  orderCtrl.getTotalWeightByBranchFromTimeRange
);

//getTotalWeightFromAllBranchesFromTimeRange
router.get(
  "/getTotalWeightFromAllBranchesFromTimeRange",
  verifyToken,
  orderCtrl.getTotalWeightFromAllBranchesFromTimeRange
);

//getTotalWeightFromAllBranchesFromTimeRangeBySubCategory
router.get(
  "/getTotalWeightFromAllBranchesFromTimeRangeBySubCategory",
  verifyToken,
  orderCtrl.getTotalWeightFromAllBranchesFromTimeRangeBySubCategory
);

//getTotalRevenueByBranchFromTimeRange
router.get(
  "/getTotalRevenueByBranchFromTimeRange",
  verifyToken,
  orderCtrl.getTotalRevenueByBranchFromTimeRange
);

//getTotalRevenueByBranchNameFromTimeRange 
router.get(
  "/getTotalRevenueByBranchNameFromTimeRange",
  verifyToken,
  orderCtrl.getTotalRevenueByBranchNameFromTimeRange
);

//getTotalQuantityByCompany
router.get(
  "/getTotalQuantityByCompany",
  verifyToken,
  orderCtrl.getTotalQuantityByCompany
);

//getTotalQuantityForAllCompanies
router.get(
  "/getTotalQuantityForAllCompanies",
  verifyToken,
  orderCtrl.getTotalQuantityForAllCompanies
);

//getTotalSubcategoryWeightFromAllBranchesFromTimeRangeBySubCategory
router.get(
  "/getTotalSubcategoryWeightFromAllBranchesFromTimeRangeBySubCategory",
  verifyToken,
  orderCtrl.getTotalSubcategoryWeightFromAllBranchesFromTimeRangeBySubCategory
);

//getOrdersWithAllDetails
router.get(
  "/getOrdersWithAllDetails",
  verifyToken,
  orderCtrl.getOrdersWithAllDetails
);

//updateSubcategoryFields POST
router.post(
  "/updateSubcategoryFields",
  verifyToken,
  orderCtrl.updateSubcategoryFields
);

//getCompanies
router.get(
  "/getCompanies",
  verifyToken,
  orderCtrl.getCompanies
);

//getCompaniesNames
router.get(
  "/getCompaniesNames",
  verifyToken,
  orderCtrl.getCompaniesNames
);

//getOrdersByZoneAndStatus
router.post(
  "/getOrdersByZoneAndStatus",
  verifyToken,
  orderCtrl.getOrdersByZoneAndStatus
);

export default router;
