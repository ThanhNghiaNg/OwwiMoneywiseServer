const Transaction = require("../models/Transaction");
const Type = require("../models/Type");

exports.getUserTransactions = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const transactions = await Transaction.find({ user: userId })
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
    const { type, category, partner, amount, description, date, isFinished } =
      req.body;
    const newTransaction = await new Transaction({
      type,
      user: userId,
      category: category,
      partner,
      amount: amount,
      description,
      isFinished,
      date: new Date(date),
    });
    await newTransaction.save();
    return res.status(201).send({ message: "Created Transactions!" });
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};

exports.deleteTransaction = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { transactionId } = req.body;
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
    const userId = req.session.user._id;
    const { type, transactionId, categoryId, partnerId, amount, description } =
      req.body;
    const newTransaction = await Transaction.updateOne(
      { _id: transactionId },
      {
        $set: {
          type,
          user: userId,
          partner: partnerId,
          category: categoryId,
          amount,
          description,
        },
      }
    );
    await newTransaction.save();
    return res.status(201).send({ message: "Created Transactions!" });
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};

exports.getStatisticOutcome = async (req, res, next) => {
  const currentDate = new Date();

  const monthTransaction = await Transaction.find({
    date: {
      $gte: currentDate.setDate(1), // Start date of month
      $lte: new Date().setMonth(currentDate.getMonth() + 1, 0), // End date of month
    },
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
    .select("-user -__v");
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
  return res.send(statisticByCategory);
};
