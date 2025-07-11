const Transaction = require("../models/Transaction");
const Type = require("../models/Type");
const Category = require("../models/Category");
const Partner = require("../models/Partner");
const mongoose = require("mongoose");

exports.getUserTransactions = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { page, pageSize, type, partner, category, amount, description, date, isDone } =
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

    const transactions =
      await Transaction.find({
        user: userId,
        ...query,
      })
        .lean() // Use lean to get plain JavaScript objects
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate({
          path: "type",
          select: "name",
          options: {
            lean: true,
          }
        })
        .populate({
          path: "partner",
          select: "name",
          options: {
            lean: true,
          }
        })
        .populate({
          path: "category",
          select: "name",
          options: {
            lean: true,
          }
        })
        .select("-user -__v")
        .sort({ date: -1 });

    const totalCount = await Transaction.countDocuments(
      {
        user: userId,
        ...query,
      }
    ).lean()

    return res.send({
      data: transactions,
      totalCount,
    });
    // return res.send(pagingResult(page, pageSize, transactions));
  } catch (err) {
    return res.send({ message: err.message });
  }
};

// using cursor pagination to prevent count total documents -> low performance for large datasets -> total documents is not very useful
exports.getUserTransactionsV2 = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { cursor, limit, type, partner, category, amount, description, date, isDone } =
      req.query;
    const query = {
      ...(type ? { type } : {}),
      ...(partner ? { partner } : {}),
      ...(category ? { category } : {}),
      ...(amount ? { amount: Number(amount) } : {}),
      ...(description
        ? { description: { $regex: description, $options: "i" } }
        : {}),
      // ...(date ? { date } : {}),
      ...(isDone !== undefined ? { isDone } : {}),
      ...(cursor ? { date: { $lt: new Date(cursor) } } : {}),
    };
    const numberLimit = Number(limit) || 10; // Default limit to 10 if not provided
    const transactions =
      await Transaction.find({
        user: userId,
        ...query,
      })
        .lean() // Use lean to get plain JavaScript objects
        .limit(numberLimit)
        .populate({
          path: "type",
          select: "name",
          options: {
            lean: true,
          }
        })
        .populate({
          path: "partner",
          select: "name",
          options: {
            lean: true,
          }
        })
        .populate({
          path: "category",
          select: "name",
          options: {
            lean: true,
          }
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
    return res.status(400).send({ message: err.message });
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

exports.getWeeklyOutcomeComparison = async (req, res, next) => {
  // Get current date and calculate week boundaries
  const userId = req.session.user._id;
  // Get current date and calculate week boundaries
  const now = new Date();
  const startOfToday = new Date(now.setHours(0, 0, 0, 0));

  // Calculate start of current week (Monday)
  const startOfCurrentWeek = new Date(startOfToday);
  startOfCurrentWeek.setDate(startOfToday.getDate() - startOfToday.getDay() + 1);

  // Calculate start of previous week
  const startOfPreviousWeek = new Date(startOfCurrentWeek);
  startOfPreviousWeek.setDate(startOfCurrentWeek.getDate() - 7);

  // Calculate end of current week
  const endOfCurrentWeek = new Date(startOfCurrentWeek);
  endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 9);
  console.log(startOfPreviousWeek)
  console.log(startOfCurrentWeek)
  console.log(endOfCurrentWeek)
  try {
    const result = await Transaction.aggregate([
      // Join with Type collection
      {
        $lookup: {
          from: 'types',
          localField: 'type',
          foreignField: '_id',
          as: 'typeInfo'
        }
      },
      // Unwind typeInfo array
      { $unwind: '$typeInfo' },
      // Filter for Outcome transactions, date range, and user
      {
        $match: {
          'typeInfo.name': 'Outcome',
          date: {
            $gte: startOfPreviousWeek,
            $lte: endOfCurrentWeek
          },
          user: new mongoose.Types.ObjectId(userId)
        }
      },
      // Group by week and day
      {
        $group: {
          _id: {
            week: {
              $cond: [
                { $gte: ['$date', startOfCurrentWeek] },
                'currentWeek',
                'previousWeek'
              ]
            },
            day: { $dayOfWeek: '$date' }
          },
          totalAmount: { $sum: '$amount' }
        }
      },
      // Project to format output
      {
        $project: {
          _id: 0,
          week: '$_id.week',
          day: '$_id.day',
          totalAmount: 1
        }
      },
      // Sort by week and day
      {
        $sort: {
          week: -1,
          day: 1
        }
      }
    ]);

    // Format data for chart
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const currentWeekData = Array(7).fill(0);
    const previousWeekData = Array(7).fill(0);

    result.forEach(item => {
      // Adjust day index: MongoDB $dayOfWeek returns 1=Sun, 2=Mon, ..., 7=Sat
      const index = item.day === 1 ? 6 : item.day - 2;
      if (item.week === 'currentWeek') {
        currentWeekData[index] = item.totalAmount;
      } else {
        previousWeekData[index] = item.totalAmount;
      }
    });
    console.log(result)
    res.send({
      labels: daysOfWeek,
      datasets: [
        {
          label: 'Current Week',
          data: currentWeekData,
          backgroundColor: 'rgba(75, 192, 192, 0.5)'
        },
        {
          label: 'Previous Week',
          data: previousWeekData,
          backgroundColor: 'rgba(255, 99, 132, 0.5)'
        }
      ]
    });
    return
  } catch (error) {
    console.error('Error fetching weekly outcome comparison:', error);
    throw error;
  }
}
