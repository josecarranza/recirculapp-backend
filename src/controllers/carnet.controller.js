import Gatherer from "../models/gatherer.model";
import { GenerateCarnet } from "../helpers/carnet-generate";
export const GenerarCarnetRecolector = (req, res) => {
  const { userID } = req.body;

  Gatherer.find({ userID: userID })
    .exec()
    .then(async (recolectorFetched) => {
      console.log(recolectorFetched)
      await GenerateCarnet(recolectorFetched[0]._doc);
      res.json({ ok: true, recolector: recolectorFetched[0]._doc });
    })
    .catch(() => {
      res.json({ ok: false, message: "Algo salio mal" });
    });
};
