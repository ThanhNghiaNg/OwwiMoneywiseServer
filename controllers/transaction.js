const Transaction = require("../models/Transaction");
const Type = require("../models/Type");
const Category = require("../models/Category");
const Partner = require("../models/Partner");
const mongoose = require("mongoose");

function buildCreatedByProfileSnapshot(profile) {
  if (!profile) {
    return undefined;
  }

  return {
    _id: profile._id,
    name: profile.name,
    avatarUrl: profile.avatarUrl || "",
    color: profile.color || "",
  };
}

function resolveViewScope(req) {
  const rawScope = req.query.scope || req.body?.scope;
  return rawScope === "account" ? "account" : "profile";
}

function getLegacyTransactionFallbackQuery(req) {
  if (!req.activeProfile?.isDefault) {
    return [];
  }

  return [
    { createdByProfile: { $exists: false } },
    { createdByProfile: null },
  ];
}

function getProfileScopedQuery(req, query = {}) {
  return {
    user: req.session.user._id,
    $or: [
      { "createdByProfile._id": req.activeProfileId },
      ...getLegacyTransactionFallbackQuery(req),
    ],
    ...query,
  };
}

function getAccountScopedQuery(req, query = {}) {
  return {
    user: req.session.user._id,
    ...query,
  };
}

function getTransactionReadQuery(req, query = {}) {
  const scope = resolveViewScope(req);
  return scope === "account"
    ? getAccountScopedQuery(req, query)
    : getProfileScopedQuery(req, query);
}

function getProfileScopedAggregateMatch(req, query = {}) {
  return {
    user: new mongoose.Types.ObjectId(req.session.user._id),
    ...query,
    $or: [
      { "createdByProfile._id": new mongoose.Types.ObjectId(req.activeProfileId) },
      ...getLegacyTransactionFallbackQuery(req),
    ],
  };
}

function getAccountScopedAggregateMatch(req, query = {}) {
  return {
    user: new mongoose.Types.ObjectId(req.session.user._id),
    ...query,
  };
}

function getTransactionAggregateMatch(req, query = {}) {
  const scope = resolveViewScope(req);
  return scope === "account"
    ? getAccountScopedAggregateMatch(req, query)
    : getProfileScopedAggregateMatch(req, query);
}

exports.getUserTransactions = async (req, res, next) => {
  try {
    const { page, pageSize, type, partner, category, amount, description, date, isDone } = req.body;
    const query = {
      ...(type ? { type } : {}),
      ...(partner ? { partner } : {}),
      ...(category ? { category } : {}),
      ...(amount ? { amount: Number(amount) } : {}),
      ...(description ? { description: { $regex: description, $options: "i" } } : {}),
      ...(date ? { date } : {}),
      ...(isDone !== undefined ? { isDone } : {}),
    };

    const readQuery = getTransactionReadQuery(req, query);
    const transactions = await Transaction.find(readQuery)
      .lean()
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate({ path: "type", select: "name", options: { lean: true } })
      .populate({ path: "partner", select: "name", options: { lean: true } })
      .populate({ path: "category", select: "name", options: { lean: true } })
      .select("-user -__v")
      .sort({ date: -1 });

    const totalCount = await Transaction.countDocuments(readQuery).lean();

    return res.send({ data: transactions, totalCount, scope: resolveViewScope(req) });
  } catch (err) {
    return res.send({ message: err.message });
  }
};

exports.getUserTransactionsV2 = async (req, res, next) => {
  try {
    const { cursor, limit, type, partner, category, amount, description, isDone } = req.query;
    const query = {
      ...(type ? { type } : {}),
      ...(partner ? { partner } : {}),
      ...(category ? { category } : {}),
      ...(amount ? { amount: Number(amount) } : {}),
      ...(description ? { description: { $regex: description, $options: "i" } } : {}),
      ...(isDone !== undefined ? { isDone } : {}),
      ...(cursor ? { date: { $lt: new Date(cursor) } } : {}),
    };
    const numberLimit = Number(limit) || 10;
    const readQuery = getTransactionReadQuery(req, query);
    const transactions = await Transaction.find(readQuery)
      .lean()
      .limit(numberLimit)
      .populate({ path: "type", select: "name", options: { lean: true } })
      .populate({ path: "partner", select: "name", options: { lean: true } })
      .populate({ path: "category", select: "name", options: { lean: true } })
      .select("-user -__v")
      .sort({ date: -1 });

    const hasNextPage = transactions.length === numberLimit;
    const nextCursor = hasNextPage ? transactions[transactions.length - 1].date : null;

    res.json({ data: transactions, nextCursor, hasNextPage, limit: numberLimit, scope: resolveViewScope(req) });
  } catch (err) {
    return res.send({ message: err.message });
  }
};

exports.getUserTransactionById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const transactions = await Transaction.find(getTransactionReadQuery(req, { _id: id }))
      .populate({ path: "type", select: "name" })
      .populate({ path: "partner", select: "name" })
      .populate({ path: "category", select: "name" })
      .select("-user -__v")
      .sort({ date: -1 });
    return res.send(transactions);
  } catch (err) {
    return res.send({ message: err.message });
  }
};

exports.addTransaction = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { type, category, partner, amount, description, date, isDone } = req.body;
    const newTransaction = await new Transaction({
      type,
      user: userId,
      category,
      partner,
      createdByProfile: buildCreatedByProfileSnapshot(req.activeProfile),
      amount,
      description,
      isDone,
      date: new Date(date),
    });
    await newTransaction.save();
    Category.findByIdAndUpdate(category, { $inc: { usedTime: 1 } }).exec();
    Partner.findByIdAndUpdate(partner, { $inc: { usedTime: 1 } }).exec();
    return res.status(201).send({ message: "Created Transactions!" });
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};

exports.deleteTransaction = async (req, res, next) => {
  try {
    const transactionId = req.params.id;
    const transaction = await Transaction.deleteOne(getProfileScopedQuery(req, { _id: transactionId }));
    if (transaction && transaction.deletedCount) {
      return res.status(200).send({ message: "Deleted Transactions!" });
    }
    return res.status(404).send({
      code: "TRANSACTION_NOT_IN_ACTIVE_PROFILE",
      message: "This transaction does not belong to the active profile. Switch profile to delete it.",
    });
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};

exports.updateTransaction = async (req, res, next) => {
  try {
    const transactionId = req.params.id;
    const { type, category, partner, amount, description, date, isDone } = req.body;
    const result = await Transaction.updateOne(
      getProfileScopedQuery(req, { _id: transactionId }),
      { $set: { type, category, partner, amount, description, date, isDone } }
    );

    const matchedCount = result?.matchedCount ?? result?.n ?? 0;
    const modifiedCount = result?.modifiedCount ?? result?.nModified ?? 0;

    if (!matchedCount) {
      return res.status(404).send({
        code: "TRANSACTION_NOT_IN_ACTIVE_PROFILE",
        message: "This transaction does not belong to the active profile. Switch profile to update it.",
      });
    }

    return res.status(201).send({ message: modifiedCount ? "Updated Transactions!" : "No changes applied." });
  } catch (err) {
    console.log(err);
    return res.status(400).send({ message: err.message });
  }
};

exports.getStatisticOutcome = async (req, res, next) => {
  try {
    const { month } = req.query;
    const currentDate = new Date();
    const monthN = Number(month);

    const startOfMonth = new Date(currentDate.getFullYear(), monthN, 1);
    const endOfMonth = new Date(currentDate.getFullYear(), monthN + 1, 0);

    const monthTransaction = await Transaction.find(
      getTransactionReadQuery(req, {
        date: { $gte: startOfMonth, $lte: endOfMonth },
        isDone: true,
      })
    )
      .populate({ path: "type", select: "name" })
      .populate({ path: "partner", select: "name" })
      .populate({ path: "category", select: "name" })
      .select("-user -__v")
      .sort({ date: 1 });

    const allTypes = await Type.find({});
    const initResult = allTypes.map((i) => i.name).reduce((result, key) => {
      result[key] = {};
      return result;
    }, {});

    const statisticByCategory = monthTransaction.reduce((result, transaction) => {
      result[transaction.type.name][transaction.category.name] =
        (result[transaction.type.name][transaction.category.name] || 0) + transaction.amount;
      return result;
    }, { ...initResult });

    Object.keys(statisticByCategory).map((key) => {
      const object = statisticByCategory[key];
      const sortedArray = Object.entries(object).sort((a, b) => b[1] - a[1]);
      statisticByCategory[key] = Object.fromEntries(sortedArray);
    });

    return res.send({ scope: resolveViewScope(req), data: statisticByCategory });
  } catch (err) {
    return res.send({ message: err.message });
  }
};

exports.getMonthOutcomeStatistic = async (req, res, next) => {
  try {
    const { month } = req.query;
    const currentDate = new Date();
    const monthN = Number(month - 1);

    const startOfMonth = new Date(currentDate.getFullYear(), monthN, 1);
    const endOfMonth = new Date(currentDate.getFullYear(), monthN + 1, 0);

    const statisticByCategory = await Transaction.aggregate([
      { $lookup: { from: "types", localField: "type", foreignField: "_id", as: "type" } },
      { $match: getTransactionAggregateMatch(req, {
        date: { $gte: startOfMonth, $lte: endOfMonth },
        isDone: true,
        "type.name": "Outcome",
      }) },
      { $lookup: { from: "categories", localField: "category", foreignField: "_id", as: "category" } },
      { $group: { _id: { category: "$category.name" }, totalAmount: { $sum: "$amount" } } },
    ]);

    const result = statisticByCategory.reduce((acc, item) => {
      const typeName = item._id.category[0];
      acc.push({ name: typeName, totalAmount: item.totalAmount });
      acc[typeName] = item.totalAmount;
      return acc;
    }, []).sort((a, b) => b.totalAmount - a.totalAmount);

    return res.send({ scope: resolveViewScope(req), data: result });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.getWeeklyOutcomeComparison = async (req, res, next) => {
  const now = new Date();
  const startOfToday = new Date(now.setHours(0, 0, 0, 0));
  const startOfCurrentWeek = new Date(startOfToday);
  startOfCurrentWeek.setDate(startOfToday.getDate() - startOfToday.getDay() + 1);
  const startOfPreviousWeek = new Date(startOfCurrentWeek);
  startOfPreviousWeek.setDate(startOfCurrentWeek.getDate() - 7);
  const endOfCurrentWeek = new Date(startOfCurrentWeek);
  endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 9);

  try {
    const result = await Transaction.aggregate([
      { $lookup: { from: "types", localField: "type", foreignField: "_id", as: "typeInfo" } },
      { $unwind: "$typeInfo" },
      { $match: getTransactionAggregateMatch(req, {
        "typeInfo.name": "Outcome",
        date: { $gte: startOfPreviousWeek, $lte: endOfCurrentWeek },
        isDone: true,
      }) },
      {
        $group: {
          _id: {
            week: { $cond: [{ $gte: ["$date", startOfCurrentWeek] }, "currentWeek", "previousWeek"] },
            day: { $dayOfWeek: "$date" }
          },
          totalAmount: { $sum: "$amount" }
        }
      },
      { $project: { _id: 0, week: "$_id.week", day: "$_id.day", totalAmount: 1 } },
      { $sort: { week: -1, day: 1 } }
    ]);

    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const currentWeekData = Array(7).fill(0);
    const previousWeekData = Array(7).fill(0);

    result.forEach(item => {
      const index = item.day === 1 ? 6 : item.day - 2;
      if (item.week === "currentWeek") currentWeekData[index] = item.totalAmount;
      else previousWeekData[index] = item.totalAmount;
    });

    res.send({
      scope: resolveViewScope(req),
      labels: daysOfWeek,
      datasets: [
        { label: "Current Week", data: currentWeekData, backgroundColor: "#4bc0c0" },
        { label: "Previous Week", data: previousWeekData, backgroundColor: "#ff6384" }
      ]
    });
  } catch (error) {
    console.error("Error fetching weekly outcome comparison:", error);
    res.status(500).send({ message: "Error fetching weekly outcome comparison" });
  }
};

exports.getMonthlyOutcomeComparison = async (req, res, next) => {
  const now = new Date();
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const startOf12MonthsAgo = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1, 0, 0, 0, 0);
  try {
    const result = await Transaction.aggregate([
      { $lookup: { from: "types", localField: "type", foreignField: "_id", as: "typeInfo" } },
      { $unwind: "$typeInfo" },
      { $match: getTransactionAggregateMatch(req, {
        "typeInfo.name": "Outcome",
        date: { $gte: startOf12MonthsAgo, $lte: endOfCurrentMonth },
        isDone: true,
      }) },
      { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" } }, totalAmount: { $sum: "$amount" } } },
      { $project: { _id: 0, year: "$_id.year", month: "$_id.month", totalAmount: 1 } },
      { $sort: { year: 1, month: 1 } }
    ]);

    const labels = [];
    const data = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(startOf12MonthsAgo.getFullYear(), startOf12MonthsAgo.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const label = date.toLocaleString("default", { month: "short" });
      labels.push(label);
      const found = result.find(item => item.year === year && item.month === month);
      data.push(found ? found.totalAmount : 0);
    }

    res.send({
      scope: resolveViewScope(req),
      labels,
      datasets: [{ label: "Monthly Outcome", data, backgroundColor: "#36a2eb" }]
    });
  } catch (error) {
    console.error("Error fetching monthly outcome comparison:", error);
    res.status(500).send({ message: "Error fetching monthly outcome comparison" });
  }
};
