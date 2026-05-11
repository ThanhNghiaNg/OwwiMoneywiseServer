const mongoose = require("mongoose");
const Category = require("../models/Category");
const SixJarsConfig = require("../models/SixJarsConfig");
const Transaction = require("../models/Transaction");

const DEFAULT_JARS = [
  { id: "necessities", name: "Thiết yếu", plannedAmount: 0, categoryIds: [] },
  { id: "education", name: "Giáo dục", plannedAmount: 0, categoryIds: [] },
  { id: "play", name: "Hưởng thụ", plannedAmount: 0, categoryIds: [] },
  { id: "financial-freedom", name: "Tự do tài chính", plannedAmount: 0, categoryIds: [] },
  { id: "give", name: "Cho đi", plannedAmount: 0, categoryIds: [] },
  { id: "long-term-saving", name: "Tiết kiệm dài hạn", plannedAmount: 0, categoryIds: [] },
];

function normalizeJar(jar) {
  return {
    id: String(jar.id || "").trim(),
    name: String(jar.name || "").trim(),
    plannedAmount: Number(jar.plannedAmount || 0),
    categoryIds: Array.isArray(jar.categoryIds) ? jar.categoryIds.map((id) => String(id)) : [],
  };
}

function getRequestedMonthYear(req) {
  const now = new Date();
  return {
    month: Number(req.query.month || req.body?.month || now.getMonth() + 1),
    year: Number(req.query.year || req.body?.year || now.getFullYear()),
  };
}

function validateMonthYear(month, year) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return "Month không hợp lệ!";
  }

  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    return "Year không hợp lệ!";
  }

  return null;
}

async function validateConfig(userId, jars) {
  if (!Array.isArray(jars) || jars.length !== 6) {
    return "Config phải có đúng 6 hũ!";
  }

  const normalizedJars = jars.map(normalizeJar);

  if (normalizedJars.some((jar) => !jar.id || !jar.name)) {
    return "Mỗi hũ phải có id và name hợp lệ!";
  }

  if (normalizedJars.some((jar) => !Number.isFinite(jar.plannedAmount) || jar.plannedAmount < 0)) {
    return "plannedAmount không hợp lệ!";
  }

  const allCategoryIds = normalizedJars.flatMap((jar) => jar.categoryIds);
  const uniqueCategoryIds = new Set(allCategoryIds);
  if (uniqueCategoryIds.size !== allCategoryIds.length) {
    return "Mỗi category chỉ được thuộc đúng 1 hũ!";
  }

  const invalidObjectId = allCategoryIds.find((id) => !mongoose.Types.ObjectId.isValid(id));
  if (invalidObjectId) {
    return "Có categoryId không hợp lệ!";
  }

  if (allCategoryIds.length > 0) {
    const existingCategories = await Category.find({
      user: userId,
      _id: { $in: allCategoryIds },
    }).select("_id");

    if (existingCategories.length !== allCategoryIds.length) {
      return "Có category không tồn tại hoặc không thuộc account hiện tại!";
    }
  }

  return null;
}

async function getResolvedConfig(userId, month, year) {
  const config = await SixJarsConfig.findOne({ user: userId, month, year }).lean();
  if (config) {
    return { jars: config.jars, isDefault: false, month, year };
  }

  const previousConfig = await SixJarsConfig.findOne({
    user: userId,
    $or: [
      { year: { $lt: year } },
      { year, month: { $lt: month } },
    ],
  }).sort({ year: -1, month: -1 }).lean();

  if (previousConfig) {
    return { jars: previousConfig.jars, isDefault: false, month, year, inheritedFrom: { month: previousConfig.month, year: previousConfig.year } };
  }

  const legacyConfig = await SixJarsConfig.findOne({
    user: userId,
    $or: [
      { month: { $exists: false } },
      { year: { $exists: false } },
      { month: null },
      { year: null },
    ],
  }).lean();

  if (legacyConfig) {
    return { jars: legacyConfig.jars, isDefault: false, month, year, inheritedFrom: { month: 0, year: 0 } };
  }

  return { jars: DEFAULT_JARS, isDefault: true, month, year };
}

function getMonthBounds(year, month) {
  const monthIndex = month - 1;
  const startOfMonth = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { startOfMonth, endOfMonth };
}

exports.getConfig = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { month, year } = getRequestedMonthYear(req);
    const monthYearError = validateMonthYear(month, year);

    if (monthYearError) {
      return res.status(422).send({ message: monthYearError });
    }

    const resolved = await getResolvedConfig(userId, month, year);
    return res.send(resolved);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err.message });
  }
};

exports.upsertConfig = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { month, year } = getRequestedMonthYear(req);
    const monthYearError = validateMonthYear(month, year);

    if (monthYearError) {
      return res.status(422).send({ message: monthYearError });
    }

    const jars = Array.isArray(req.body?.jars) ? req.body.jars : [];
    const validationError = await validateConfig(userId, jars);

    if (validationError) {
      return res.status(422).send({ message: validationError });
    }

    const normalizedJars = jars.map(normalizeJar).map((jar) => ({
      ...jar,
      categoryIds: jar.categoryIds.map((id) => new mongoose.Types.ObjectId(id)),
    }));

    const config = await SixJarsConfig.findOneAndUpdate(
      { user: userId, month, year },
      { $set: { jars: normalizedJars, user: userId, month, year } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.send({ jars: config.jars, month, year, message: "Six jars config saved successfully!" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err.message });
  }
};

exports.getMonthStatistic = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { month, year } = getRequestedMonthYear(req);
    const monthYearError = validateMonthYear(month, year);

    if (monthYearError) {
      return res.status(422).send({ message: monthYearError });
    }

    const resolved = await getResolvedConfig(userId, month, year);
    const { startOfMonth, endOfMonth } = getMonthBounds(year, month);

    const outcomeByCategory = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          date: { $gte: startOfMonth, $lte: endOfMonth },
          isDone: true,
        },
      },
      { $lookup: { from: "types", localField: "type", foreignField: "_id", as: "typeInfo" } },
      { $unwind: "$typeInfo" },
      { $match: { "typeInfo.name": "Outcome" } },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const incomeResult = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          date: { $gte: startOfMonth, $lte: endOfMonth },
          isDone: true,
        },
      },
      { $lookup: { from: "types", localField: "type", foreignField: "_id", as: "typeInfo" } },
      { $unwind: "$typeInfo" },
      { $match: { "typeInfo.name": "Income" } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const totalIncome = incomeResult[0]?.totalAmount || 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    const now = new Date();
    const passedDays = year === now.getFullYear() && month === now.getMonth() + 1
      ? now.getDate()
      : daysInMonth;

    const outcomeByCategoryMap = outcomeByCategory.reduce((acc, item) => {
      acc[String(item._id)] = item.totalAmount;
      return acc;
    }, {});

    const jars = resolved.jars.map((rawJar) => {
      const jar = normalizeJar(rawJar);
      const totalSpent = jar.categoryIds.reduce((sum, categoryId) => sum + (outcomeByCategoryMap[categoryId] || 0), 0);
      const plannedAmount = jar.plannedAmount;
      const allowedToDate = daysInMonth > 0 ? (plannedAmount / daysInMonth) * passedDays : plannedAmount;

      let tone = "default";
      if (totalSpent > plannedAmount) {
        tone = "danger";
      } else if (totalSpent > allowedToDate) {
        tone = "warning";
      }

      return {
        id: jar.id,
        name: jar.name,
        plannedAmount,
        categoryIds: jar.categoryIds,
        totalSpent,
        allowedToDate,
        tone,
      };
    });

    return res.send({
      scope: "account",
      month,
      year,
      monthlyIncome: totalIncome,
      daysInMonth,
      passedDays,
      isDefaultConfig: resolved.isDefault,
      inheritedFrom: resolved.inheritedFrom || null,
      jars,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err.message });
  }
};
