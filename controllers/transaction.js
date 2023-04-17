const Transaction = require("../models/Transaction");

exports.getUserTransactions = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const transactions = await Transaction.find({ user: userId });
    return res.send(transactions);
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};

exports.addTransaction = async (req, res, next) => {
  try {
    const { type, userId, categoryId, amount, description } = req.body;
    const newTransaction = await new Transaction({
      type,
      user: userId,
      category: categoryId,
      amount,
      description,
    });
    await newTransaction.save();
    return res.status(201).send({ message: "Created Transactions!" });
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};

exports.updateTransaction = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { type, transactionId, categoryId, amount, description } = req.body;
    const newTransaction = await Transaction.updateOne(
      { _id: transactionId },
      {
        $set: {
          type,
          user: userId,
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
