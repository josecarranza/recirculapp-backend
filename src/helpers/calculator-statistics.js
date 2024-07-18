import Order from "../models/order.model";

const statisticsByDatesAndUser = (id) => {
  let query = {
    date: { $gte: startDate, $lt: endDate },
    $or: [{ status: "CONFIRMADA" }, { status: "reserved" }],
  };

  Order.find(query)
    .populate("subcategories.subcategory")
    .exec()
    .then((orders) => {
      let newOrders = orders.map((order) => {
        order.subcategories = order.subcategories.filter(
          (o) => o.ownerID == id && o.status == "CONFIRMADA" //payed
        );
        return order;
      });
      const filterNewOrders = newOrders.filter(
        (o) => o.subcategories.length != 0
      );
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

      //PRUEBA
      let PRUEBA = 0;

      let SUMEQPRUEBA = 0;
      let SUMEQPETMJ2 = 0;
      let SUMEQPETAGUA2 = 0;
      let SUMEQPETAR2 = 0;


      filterNewOrders.forEach((order) => {
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
          //Calculadora
          if (suborder.subcategory.subCategoryName == "Calculadora") {
            PRUEBA += suborder.quantity;
            SUMEQPRUEBA = (PRUEBA / 2204) * suborder.subcategory.eq;
            SUMEQPETMJ2 = (PRUEBA / 2204) * suborder.subcategory.eq_mj;
            SUMEQPETAGUA2 = (PRUEBA / 2204) * suborder.subcategory.eq_water;
            SUMEQPETAR2 = (PRUEBA / 2204) * suborder.subcategory.eq_ar;
          }
        });
      });

      return {
        TON: (
          (PET + PP + HDPE + LDPE + LATAS + PAPEL + CARTON + PRUEBA) *
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
          SUMEQPRUEBA
        ).toFixed(2),
        TOTAL_LB: (
          (PET + PP + HDPE + LDPE + LATAS + PAPEL + CARTON + PRUEBA) *
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
          SUMEQPETMJ2
        ).toFixed(2),
        M_AGUA: (
          SUMEQPETAGUA +
          SUMEQPPAGUA +
          SUMEQHDPEAGUA +
          SUMLDPEAGUA +
          SUMLATASAGUA +
          SUMPAPELAGUA +
          SUMCARTONAGUA +
          SUMEQPETAGUA2
        ).toFixed(2),

        ARBOLES: (
          SUMEQPETAR +
          SUMEQPPAR +
          SUMEQHDPEAR +
          SUMLDPEAR +
          SUMLATASAR +
          SUMPAPELAR +
          SUMCARTONAR +
          SUMEQPETAR2
        ).toFixed(2),
      };
    });
};
const statisticsByDatesAdmin = (orders) => {
  let PET = 0;
  let PP = 0;
  let HDPE = 0;
  let LDPE = 0;
  let LATAS = 0;
  let PAPEL = 0;
  let CARTON = 0;
  let PRUEBA = 0;

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


  orders.forEach((order) => {
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
        PRUEBA += suborder.quantity;
        SUMEQPRUEBA = (PRUEBA / 2204) * suborder.subcategory.eq;
        SUMEQPETMJ2 = (PRUEBA / 2204) * suborder.subcategory.eq_mj;
        SUMEQPETAGUA2 = (PRUEBA / 2204) * suborder.subcategory.eq_water;
        SUMEQPETAR2 = (PRUEBA / 2204) * suborder.subcategory.eq_ar;
      }
    });
  });

  return {
    TON: ((PET + PP + HDPE + LDPE + LATAS + PAPEL + CARTON + PRUEBA) * 0.000454).toFixed(
      2
    ),
    TON_CO2: (
      SUMEQPET +
      SUMEQPP +
      SUMEQHDPE +
      SUMLDPE +
      SUMLATAS +
      SUMPAPEL +
      SUMCARTON +
      SUMEQPRUEBA
    ).toFixed(2),
    TOTAL_LB: (
      (PET + PP + HDPE + LDPE + LATAS + PAPEL + CARTON + PRUEBA) *
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
      SUMEQPETMJ2
    ).toFixed(2),
    M_AGUA: (
      SUMEQPETAGUA +
      SUMEQPPAGUA +
      SUMEQHDPEAGUA +
      SUMLDPEAGUA +
      SUMLATASAGUA +
      SUMPAPELAGUA +
      SUMCARTONAGUA +
      SUMEQPETAGUA2
    ).toFixed(2),

    ARBOLES: (
      SUMEQPETAR +
      SUMEQPPAR +
      SUMEQHDPEAR +
      SUMLDPEAR +
      SUMLATASAR +
      SUMPAPELAR +
      SUMCARTONAR +
      SUMEQPETAR2
    ).toFixed(2),
  };
};

const statisticsAllByUser = (id) => {
  let query = {
    $or: [{ status: "CONFIRMADA" }, { status: "reserved" }],
  };

  Order.find(query)
    .populate("subcategories.subcategory")
    .exec()
    .then((orders) => {
      let newOrders = orders.map((order) => {
        order.subcategories = order.subcategories.filter(
          (o) => o.ownerID == id && o.status == "CONFIRMADA" // payed
        );
        return order;
      });
      const filterNewOrders = newOrders.filter(
        (o) => o.subcategories.length != 0
      );
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
      let SUMEQPETMJ2 = 0;
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
      let SUMEQPETAGUA2 = 0;
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
      let SUMEQPETAR2 = 0;
      let SUMTMADERAAR = 0;
      let SUMHIERROAR = 0;
      let SUMRESIDUOAR = 0;

      filterNewOrders.forEach((order) => {
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
            PRUEBA += suborder.quantity;
            SUMEQPRUEBA = (PRUEBA / 2204) * suborder.subcategory.eq;
            SUMEQPETMJ2 = (PRUEBA / 2204) * suborder.subcategory.eq_mj;
            SUMEQPETAGUA2 = (PRUEBA / 2204) * suborder.subcategory.eq_water;
            SUMEQPETAR2 = (PRUEBA / 2204) * suborder.subcategory.eq_ar;
          }
          // TMADERA
          if (suborder.subcategory.subCategoryName == "TARIMA MADERA") {
            TMADERA += suborder.quantity;
            SUMTMADERA = (TMADERA / 2204) * suborder.subcategory.eq;
            SUMTMADERAMJ = (TMADERA / 2204) * suborder.subcategory.eq_mj;
            SUMTMADERAAGUA = (TMADERA / 2204) * suborder.subcategory.eq_water;
            SUMTMADERAAR = (TMADERA / 2204) * suborder.subcategory.eq_ar;
          }
          // HIERRO
          if (suborder.subcategory.subCategoryName == "HIERRO") {
            HIERRO += suborder.quantity;
            SUMHIERRO = (HIERRO / 2204) * suborder.subcategory.eq;
            SUMHIERROMJ = (HIERRO / 2204) * suborder.subcategory.eq_mj;
            SUMHIERROAGUA = (HIERRO / 2204) * suborder.subcategory.eq_water;
            SUMHIERROAR = (HIERRO / 2204) * suborder.subcategory.eq_ar;
          }
          // RESIDUO ELECTRONICO
          if (suborder.subcategory.subCategoryName == "RESIDUO ELECTRONICO") {
            RELECTRONICO += suborder.quantity;
            SUMRELECTRONICO = (RELECTRONICO / 2204) * suborder.subcategory.eq;
            SUMRELECTRONICOMJ = (RELECTRONICO / 2204) * suborder.subcategory.eq_mj;
            SUMRELECTRONICOAGUA = (RELECTRONICO / 2204) * suborder.subcategory.eq_water;
            SUMRESIDUOAR = (RELECTRONICO / 2204) * suborder.subcategory.eq_ar;
          }
        });
      });

      return {
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
          SUMEQPETMJ2 +
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
          SUMEQPETAGUA2 +
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
          SUMEQPETAR2 +
          SUMTMADERAAR +
          SUMHIERROAR +
          SUMRESIDUOAR
        ).toFixed(2),
      };
    });
};

module.exports = {
  statisticsByDatesAndUser,
  statisticsAllByUser,
  statisticsByDatesAdmin,
};
