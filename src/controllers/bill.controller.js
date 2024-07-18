import Bill from "../models/bill.model";

export const getOrderById = async (req, res) => {
  const { subOrderIDs } = req.body;
  Bill.findOne({ subOrderIDs: subOrderIDs })
    .populate("orderID")
    .exec()
    .then((bill) => {
      return res.json({ ok: true, bill });
    });
};
