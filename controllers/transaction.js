const Transaction = require("../models/Transaction");
const Type = require("../models/Type");
const Category = require("../models/Category");
const Partner = require("../models/Partner");
const mongoose = require("mongoose");

const buildTransactionQuery = (rawFilters = {}) => {
  const {
    type,
    partner,
    category,
    amount,
    description,
    date,
    isDone,
    fromDate,
    toDate,
    createdByProfileId,
  } = rawFilters;

  const query = {
    ...(type ? { type } : {}),
    ...(partner ? { partner } : {}),
    ...(category ? { category } : {}),
    ...(amount ? { amount: Number(amount) } : {}),
    ...(description ? { description: { $regex: description, $options: "i" } } : {}),
    ...(date ? { date } : {}),
    ...(isDone !== undefined && isDone !== "" ? { isDone: isDone === true || isDone === "true" } : {}),
    ...(createdByProfileId ? { "createdByProfile.profileId": createdByProfileId } : {}),
  };

  if (fromDate || toDate) {
    query.date = {
      ...(query.date || {}),
      ...(fromDate ? { $gte: new Date(fromDate) } : {}),
      ...(toDate ? { $lte: new Date(`${toDate}T23:59:59.999Z`) } : {}),
    };
  }

  return query;
};

const getActiveProfileSnapshot = (req) => {
  if (!req.session.activeProfileId || !req.session.activeProfile) {
    return null;
  }

  return {
    profileId: new mongoose.Types.ObjectId(req.session.activeProfileId),
    name: req.session.activeProfile.name,
  };
};

exports.getUserTransactions = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { page, pageSize, ...filters } = req.body;
    const query = buildTransactionQuery(filters);

    const transactions = await Transaction.find({
      user: userId,
      ...query,
    })
      .lean()
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate({
        path: "type",
        select: "name",
        options: {
          lean: true,
        },
      })
      .populate({
        path: "partner",
        select: "name",
        options: {
          lean: true,
        },
      })
      .populate({
        path: "category",
        select: "name",
        options: {
          lean: true,
        },
      })
      .select("-user -__v")
      .sort({ date: -1 });

    const totalCount = await Transaction.countDocuments({
      user: userId,
      ...query,
    }).lean();

    return res.send({
      data: transactions,
      totalCount,
    });
  } catch (err) {
    return res.send({ message: err.message });
  }
};

exports.getUserTransactionsV2 = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { cursor, limit, ...filters } = req.query;
    const query = buildTransactionQuery({
      ...filters,
      ...(cursor ? { date: undefined } : {}),
    });

    if (cursor) {
      query.date = {
        ...(query.date || {}),
        $lt: new Date(cursor),
      };
    }

    const numberLimit = Number(limit) || 10;
    const transactions = await Transaction.find({
      user: userId,
      ...query,
    })
      .lean()
      .limit(numberLimit)
      .populate({
        path: "type",
        select: "name",
        options: {
          lean: true,
        },
      })
      .populate({
        path: "partner",
        select: "name",
        options: {
          lean: true,
        },
      })
      .populate({
        path: "category",
        select: "name",
        options: {
          lean: true,
        },
      })
      .select("-user -__v")
      .sort({ date: -1 });

    const hasNextPage = transactions.length === numberLimit;
    const nextCursor = hasNextPage ? transactions[transactions.length - 1].date : null;

    res.json({
      data: transactions,
      nextCursor,
      hasNextPage,
      limit: numberLimit,
    });
  } catch (err) {
    return res.send({ message: err.message });
  }
};

exports.getUserTransactionById = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const id = req.params.id;
    const transactions = await Transaction.find({ user: userId, _id: id })
      .populate({
        path: "type",
        select: "name",
      })
      .populate({
        path: "partner",
        select: "name",
      })
      .populate({
        path: "category",
        select: "name",
      })
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
    const activeProfile = getActiveProfileSnapshot(req);
    if (!activeProfile) {
      return res.status(400).send({ message: "Please select a profile before creating transaction!" });
    }

    const { type, category, partner, amount, description, date, isDone } = req.body;
    const newTransaction = await new Transaction({
      type,
      user: userId,
      category,
      partner,
      amount,
      description,
      isDone,
      date: new Date(date),
      createdByProfile: activeProfile,
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
    const userId = req.session.user._id;
    const transactionId = req.params.id;
    const transaction = await Transaction.deleteOne({
      user: userId,
      _id: transactionId,
    });
    if (transaction) {
      return res.status(200).send({ message: "Deleted Transactions!" });
    } else {
      return res.send(401).send({ message: "Invalid User or Transaction!" });
    }
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};

exports.updateTransaction = async (req, res, next) => {
  try {
    const transactionId = req.params.id;
    const userId = req.session.user._id;
    const { type, category, partner, amount, description, date, isDone } = req.body;
    await Transaction.updateOne(
      { _id: transactionId, user: userId },
      {
        $set: {
          type,
          category,
          partner,
          amount,
          description,
          date,
          isDone,
        },
      }
    );
    return res.status(201).send({ message: "Updated Transactions!" });
  } catch (err) {
    console.log(err);
    return res.status(400).send({ message: err.message });
  }
};

exports.getStatisticOutcome = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { month } = req.query;
    const currentDate = new Date();
    const monthN = Number(month);

    const startOfMonth = new Date(currentDate.getFullYear(), monthN, 1);
    const endOfMonth = new Date(currentDate.getFullYear(), monthN + 1, 0);

    const monthTransaction = await Transaction.find({
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
      isDone: true,
      user: userId,
    })
      .populate({
        path: "type",
        select: "name",
      })
      .populate({
        path: "partner",
        select: "name",
      })
      .populate({
        path: "category",
        select: "name",
      })
      .select("-user -__v")
      .sort({ date: 1 });

    const allTypes = await Type.find({});

    const initResult = allTypes
      .map((i) => i.name)
      .reduce((result, key) => {
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
      const sortedObj = Object.fromEntries(sortedArray);
      statisticByCategory[key] = sortedObj;
    });

    return res.send(statisticByCategory);
  } catch (err) {
    return res.send({ message: err.message });
  }
};

exports.getMonthOutcomeStatistic = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { month } = req.query;
    const currentDate = new Date();
    const monthN = Number(month - 1);

    const startOfMonth = new Date(currentDate.getFullYear(), monthN, 1);
    const endOfMonth = new Date(currentDate.getFullYear(), monthN + 1, 0);

    const statisticByCategory = await Transaction.aggregate([
      {
        $lookup: {
          from: "types",
          localField: "type",
          foreignField: "_id",
          as: "type",
        },
      },
      {
        $match: {
          date: {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
          isDone: true,
          user: new mongoose.Types.ObjectId(userId),
          "type.name": "Outcome",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $group: {
          _id: {
            category: "$category.name",
          },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const result = statisticByCategory
      .reduce((acc, item) => {
        const typeName = item._id.category[0];
        acc.push({ name: typeName, totalAmount: item.totalAmount });
        acc[typeName] = item.totalAmount;
        return acc;
      }, [])
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return res.send(result);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.getWeeklyOutcomeComparison = async (req, res, next) => {
  const userId = req.session.user._id;
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
      {
        $lookup: {
          from: "types",
          localField: "type",
          foreignField: "_id",
          as: "typeInfo",
        },
      },
      { $unwind: "$typeInfo" },
      {
        $match: {
          "typeInfo.name": "Outcome",
          date: {
            $gte: startOfPreviousWeek,
            $lte: endOfCurrentWeek,
          },
          user: new mongoose.Types.ObjectId(userId),
          isDone: true,
        },
      },
      {
        $group: {
          _id: {
            week: {
              $cond: [{ $gte: ["$date", startOfCurrentWeek] }, "currentWeek", "previousWeek"],
            },
            day: { $dayOfWeek: "$date" },
          },
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $project: {
          _id: 0,
          week: "$_id.week",
          day: "$_id.day",
          totalAmount: 1,
        },
      },
      {
        $sort: {
          week: -1,
          day: 1,
        },
      },
    ]);

    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const currentWeekData = Array(7).fill(0);
    const previousWeekData = Array(7).fill(0);

    result.forEach((item) => {
      const index = item.day === 1 ? 6 : item.day - 2;
      if (item.week === "currentWeek") {
        currentWeekData[index] = item.totalAmount;
      } else {
        previousWeekData[index] = item.totalAmount;
      }
    });

    res.send({
      labels: daysOfWeek,
      datasets: [
        {
          label: "Current Week",
          data: currentWeekData,
          backgroundColor: "#4bc0c0",
        },
        {
          label: "Previous Week",
          data: previousWeekData,
          backgroundColor: "#ff6384",
        },
      ],
    });
    return;
  } catch (error) {
    console.error("Error fetching weekly outcome comparison:", error);
    res.status(500).send({ message: "Error fetching weekly outcome comparison" });
    return;
  }
};

exports.getMonthlyOutcomeComparison = async (req, res, next) => {
  const userId = req.session.user._id;
  const now = new Date();
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const startOf12MonthsAgo = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1, 0, 0, 0, 0);
  try {
    const result = await Transaction.aggregate([
      {
        $lookup: {
          from: "types",
          localField: "type",
          foreignField: "_id",
          as: "typeInfo",
        },
      },
      { $unwind: "$typeInfo" },
      {
        $match: {
          "typeInfo.name": "Outcome",
          date: {
            $gte: startOf12MonthsAgo,
            $lte: endOfCurrentMonth,
          },
          user: new mongoose.Types.ObjectId(userId),
          isDone: true,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          totalAmount: 1,
        },
      },
      {
        $sort: {
          year: -1,
          month: -1,
        },
      },
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const labels = [];
    const data = Array(12).fill(0);

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = monthNames[date.getMonth()];
      labels.unshift(`${month}`);
    }

    result.forEach((item) => {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const itemYear = item.year;
      const itemMonth = item.month;
      const monthsDiff = (currentYear - itemYear) * 12 + (currentMonth - itemMonth);
      if (monthsDiff >= 0 && monthsDiff < 12) {
        const index = 11 - monthsDiff;
        data[index] = item.totalAmount;
      }
    });

    res.send(
      labels.map((label, index) => {
        return {
          label,
          value: data[index],
        };
      })
    );
    return;
  } catch (error) {
    console.error("Error fetching monthly outcome comparison:", error);
    res.status(500).send({ message: "Error fetching monthly outcome comparison" });
    return;
  }
};
