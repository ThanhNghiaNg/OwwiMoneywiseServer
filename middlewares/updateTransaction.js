const Transaction = require("../models/Transaction");

exports.addIsDone = async (req, res, next) => {
  await Transaction.updateMany(
    {},
    // { $set: { isDone: true } },
    { $unset: { skipped: 1 } }
  );
  //   const transactions = await Transaction.find();
  //   await Promise.all(
  //     transactions.map(async (transaction) => {
  //       await Transaction.updateOne(
  //         { _id: transaction._id },
  //         { $set: { isDone: true } }
  //       );
  //     })
  //   );
  next();
};
