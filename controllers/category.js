const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Category = require("../models/Category");

exports.getUserCategories = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const typeId = req.query.typeId || "";
    const categories = await Category.find({
      user: userId,
      ...(typeId ? { type: typeId } : {}),
    }).sort([['updatedAt', 'desc']]);
    return res.send(categories);
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};

exports.addCategory = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const categoryName = req.body.name;
    const categoryType = req.body.type;
    const newCategory = await new Category({
      name: categoryName,
      user: userId,
      type: categoryType,
    });
    await newCategory.save();
    return res.status(201).send({ message: "Created New Category!" });
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const categoryId = req.body.categoryId;
    const transactions = await Transaction.find({
      category: categoryId,
      user: userId,
    });
    if (transactions) {
      return res
        .status(403)
        .send({ message: "This category already has been in a transactions!" });
    } else {
      const category = await Category.deleteOne({
        _id: categoryId,
        user: userId,
      });
      if (category) {
        return res.status(200).send({ message: "Deleted Category!" });
      } else {
        return res.status(422).send({ message: "Invalid User or Category!" });
      }
    }
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const categoryId = req.body.categoryId;
    const categoryName = req.body.name;
    const newCategory = await Category.updateOne(
      {
        user: userId,
        _id: categoryId,
      },
      { $set: { name: categoryName } }
    );
    await newCategory.save();
    return res.status(201).send({ message: "Created New Category!" });
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};
