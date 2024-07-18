import SubCategory from "../models/subcategory.model";
const { promisify } = require("util");
const fs = require("fs");
const unlinkAsync = promisify(fs.unlink);
import { uploadToBucket } from "../helpers/s3.helper";

export const createSubCategory = async (req, res) => {
  const { body } = req;
  console.log(body);

  SubCategory.create(body)
    .then(async (categoryDB) => {
      await categoryDB;

      res.json({
        ok: true,
        subcategoria: categoryDB,
      });
    })
    .catch((err) => {
      res.json(err);
    });
};

export const editSubCategory = async (req, res) => {
  console.log(req.body);
  try {
    let { file } = req;
    let banner;
    if (!file) {
      const updatedSubCategory = await SubCategory.findOneAndUpdate(
        { _id: req.body.id },
        {
          $set: {
            subCategoryName: req.body.subCategoryName,
            suggested_price: req.body.suggested_price,
            comision_porcentaje: req.body.comision_porcentaje,
            category: req.body.category,
            description: req.body.description,
            units: req.body.units,
            eq: req.body.eq,
            eq_mj: req.body.eq_mj,
            eq_water: req.body.eq_water,
            eq_ar: req.body.eq_ar,
            // image: [req.body.image],
          },
        },
        { new: true }
      );

      if (!updatedSubCategory) {
        return res
          .status(404)
          .json({ ok: false, message: "SubCategoria no encontrada" });
      }

      res.json({ ok: true, message: "SubCategoria actualizada" });
    } else {
      const result = await uploadToBucket("filemanagerrecir", file, null);
      await unlinkAsync(file.path);
      banner = result.Location;

      const updatedSubCategory = await SubCategory.findOneAndUpdate(
        { _id: req.body.id },
        {
          $set: {
            subCategoryName: req.body.subCategoryName,
            suggested_price: req.body.suggested_price,
            comision_porcentaje: req.body.comision_porcentaje,
            category: req.body.category,
            description: req.body.description,
            units: req.body.units,
            eq: req.body.eq,
            eq_mj: req.body.eq_mj,
            eq_water: req.body.eq_water,
            eq_ar: req.body.eq_ar,
            // image: [banner],
          },
        },
        { new: true }
      );

      if (!updatedSubCategory) {
        return res
          .status(404)
          .json({ ok: false, message: "SubCategoria no encontrada" });
      }

      res.json({ ok: true, message: "SubCategoria actualizada" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, message: "Error al actualizar" });
  }
};

export const changeStateSubcategory = async (req, res) => {
  const { id, status } = req.body;
  SubCategory.findOne({ _id: id })
    .exec()
    .then(async (subcategoryFetched) => {
      console.log(subcategoryFetched);
      SubCategory.findOneAndUpdate(
        { _id: subcategoryFetched._id },
        { $set: { status: status == "active" ? "disabled " : "active" } }
      )
        .exec()
        .then(async () => {
          res.status(200).json({ ok: true, message: "Estado actualizado" });
        });
    })
    .catch((error) => {
      res.json({ ok: false, message: error.response });
      console.log(error.response.body);
    });
};

export const subGetCategorias = async (req, res) => {
  SubCategory.find()
    .populate("category")
    .exec()
    .then(async (categoriaDB) => {
      await categoriaDB;
      res.json({
        ok: true,
        subcategoria: categoriaDB,
      });
    })
    .catch((err) => {
      res.json(err);
    });
};

export const getSubCategoriasByCategory = async (req, res) => {
  const { id } = req.body;
  SubCategory.find({ category: id })
    .populate("category")
    .exec()
    .then(async (categoriaDB) => {
      await categoriaDB;
      res.json({
        ok: true,
        subcategoria: categoriaDB,
      });
    })
    .catch((err) => {
      res.json(err);
    });
};

export const getSingleSubCategory = async (req, res) => {
  const { id } = req.body;
  SubCategory.find({ _id: id })
    .populate("category")
    .exec()
    .then(async (categoriaDB) => {
      await categoriaDB;
      res.json({
        ok: true,
        subcategoria: categoriaDB,
      });
    })
    .catch((err) => {
      res.json(err);
    });
};
