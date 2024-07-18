import Category from "../models/category.model";
import Subcategory from "../models/subcategory.model";

const { promisify } = require("util");
const fs = require("fs");
const unlinkAsync = promisify(fs.unlink);
import { uploadToBucket } from "../helpers/s3.helper";

export const createCategory = async (req, res) => {
  const { body } = req;

  Category.create(body)
    .then(async (categoryDB) => {
      await categoryDB;

      res.json({
        ok: true,
        categoria: categoryDB,
      });
    })
    .catch((err) => {
      res.json(err);
    });
};

export const editCategory = async (req, res) => {
  try {
    const { id, categoryName, description, image } = req.body;
    let banner;
    if (!req.file) {
      const updatedCategory = await Category.findOneAndUpdate(
        { _id: id },
        { categoryName, description, image },
        { new: true,  }
      );
      return res.json({
        ok: true,
        message: "Categoria actualizada",
        category: updatedCategory,
      });
    } else {
      const result = await uploadToBucket("filemanagerrecir", req.file, null);
      await unlinkAsync(req.file.path);
      banner = result.Location;
      const updatedCategory = await Category.findOneAndUpdate(
        { _id: id },
        { categoryName, description, image: [banner] },
        { new: true }
      );
      return res.json({
        ok: true,
        message: "Categoria actualizada",
        category: updatedCategory,
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ ok: false, message: "Error al actualizar la categoría" });
  }
};

export const geCategorias = async (req, res) => {
  Category.find()
    .then(async (categoriaDB) => {
      await categoriaDB;
      res.json({
        ok: true,
        categoria: categoriaDB,
      });
    })
    .catch((err) => {
      res.json(err);
    });
};

export const getCategoryWithSubcategories = async (req, res) => {
  const { id } = req.body;
  const [categoria, subcategoria] = await Promise.all([
    Category.find({ _id: id }),
    Subcategory.find({ category: id }),
  ]);
  let category = categoria[0];
  let newCategory = {};
  newCategory.category = category;
  newCategory.subcategories = subcategoria;
  res.json({ ok: true, newCategory });
};

export const changeStateCategory = async (req, res) => {
  const { id, status } = req.body;
  Category.findOne({ _id: id })
    .exec()
    .then(async (categoryFetched) => {
      console.log(categoryFetched);
      Category.findOneAndUpdate(
        { _id: categoryFetched._id },
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
      // console.log(error.response.body.errors[0].message)
    });
};
