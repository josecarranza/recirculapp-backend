import Waste from "../models/waste.model";

export const createWaste = async (req, res) => {
  const { body } = req;
  console.log(body);

  Waste.create(body)
    .then(async (wasteDB) => {
      await wasteDB;

      res.json({
        ok: true,
        waste: wasteDB,
      });
    })
    .catch((err) => {
      res.json({ ok: false, message: err });
    });
};

export const getWastes = async (req, res) => {
  const wastes = await Waste.find().populate("category").exec();

  res.json({
    ok: true,
    waste: wastes,
  });
};
