const Transaction = require("../models/Transaction");
const Type = require("../models/Type");
const Category = require("../models/Category");
const Partner = require("../models/Partner");
const pagingResult = require("../utils/common").pagingResult;

exports.getUserTransactions = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { page, pageSize } = req.query;
    const { type, partner, category, amount, description, date, isDone } =
      req.body;
    const query = {
      ...(type ? { type } : {}),
      ...(partner ? { partner } : {}),
      ...(category ? { category } : {}),
      ...(amount ? { amount: Number(amount) } : {}),
      ...(description
        ? { description: { $regex: description, $options: "i" } }
        : {}),
      ...(date ? { date } : {}),
      ...(isDone !== undefined ? { isDone } : {}),
    };

    const transactions = await Transaction.find({
      user: userId,
      ...query,
      // type: "645a5254e670f076a88a8936",
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
      .sort({ date: -1 });
    return res.send(pagingResult(page, pageSize, transactions));
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
    const { type, category, partner, amount, description, date, isDone } =
      req.body;
    const newTransaction = await new Transaction({
      type,
      user: userId,
      category: category,
      partner,
      amount: amount,
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
    const { type, category, partner, amount, description, date, isDone } =
      req.body;
    await Transaction.updateOne(
      { _id: transactionId },
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
    return res.send({ message: err.message });
  }
};

exports.getStatisticOutcome = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { month } = req.query;
    const currentDate = new Date(); //(new Date().setMonth(new Date().getMonth()-2));
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

    const statisticByCategory = monthTransaction.reduce(
      (result, transaction, i) => {
        result[transaction.type.name][transaction.category.name] =
          (result[transaction.type.name][transaction.category.name] || 0) +
          transaction.amount;
        return result;
      },
      { ...initResult }
    );

    // Sort the result
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
