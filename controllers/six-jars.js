const mongoose = require("mongoose");
const Category = require("../models/Category");
const SixJarsConfig = require("../models/SixJarsConfig");
const Transaction = require("../models/Transaction");

const DEFAULT_JARS = [
  { id: "necessities", name: "Thiết yếu", targetPercent: 55, categoryIds: [] },
  { id: "education", name: "Giáo dục", targetPercent: 10, categoryIds: [] },
  { id: "play", name: "Hưởng thụ", targetPercent: 10, categoryIds: [] },
  { id: "financial-freedom", name: "Tự do tài chính", targetPercent: 10, categoryIds: [] },
  { id: "give", name: "Cho đi", targetPercent: 5, categoryIds: [] },
  { id: "long-term-saving", name: "Tiết kiệm dài hạn", targetPercent: 10, categoryIds: [] },
];

function normalizeJar(jar) {
  return {
    id: String(jar.id || "").trim(),
    name: String(jar.name || "").trim(),
    targetPercent: Number(jar.targetPercent || 0),
    categoryIds: Array.isArray(jar.categoryIds) ? jar.categoryIds.map((id) => String(id)) : [],
  };
}

async function validateConfig(userId, jars) {
  if (!Array.isArray(jars) || jars.length !== 6) {
    return "Config phải có đúng 6 hũ!";
  }

  const normalizedJars = jars.map(normalizeJar);

  if (normalizedJars.some((jar) => !jar.id || !jar.name)) {
    return "Mỗi hũ phải có id và name hợp lệ!";
  }

  if (normalizedJars.some((jar) => !Number.isFinite(jar.targetPercent) || jar.targetPercent < 0)) {
    return "targetPercent không hợp lệ!";
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

async function getResolvedConfig(userId) {
  const config = await SixJarsConfig.findOne({ user: userId }).lean();
  if (!config) {
    return { jars: DEFAULT_JARS, isDefault: true };
  }
  return { jars: config.jars, isDefault: false };
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
    const resolved = await getResolvedConfig(userId);
    return res.send(resolved);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err.message });
  }
};

exports.upsertConfig = async (req, res) => {
  try {
    const userId = req.session.user._id;
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
      { user: userId },
      { $set: { jars: normalizedJars, user: userId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.send({ jars: config.jars, message: "Six jars config saved successfully!" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err.message });
  }
};

exports.getMonthStatistic = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const now = new Date();
    const month = Number(req.query.month || now.getMonth() + 1);
    const year = Number(req.query.year || now.getFullYear());

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(422).send({ message: "Month không hợp lệ!" });
    }

    if (!Number.isInteger(year) || year < 2000 || year > 3000) {
      return res.status(422).send({ message: "Year không hợp lệ!" });
    }

    const resolved = await getResolvedConfig(userId);
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
      const expectedSpend = totalIncome * (jar.targetPercent / 100);
      const allowedToDate = daysInMonth > 0 ? (expectedSpend / daysInMonth) * passedDays : expectedSpend;

      let tone = "default";
      if (totalSpent > expectedSpend) {
        tone = "danger";
      } else if (totalSpent > allowedToDate) {
        tone = "warning";
      }

      return {
        id: jar.id,
        name: jar.name,
        targetPercent: jar.targetPercent,
        categoryIds: jar.categoryIds,
        totalSpent,
        expectedSpend,
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
      jars,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err.message });
  }
};
