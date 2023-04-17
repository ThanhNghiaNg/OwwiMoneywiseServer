const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Category = require("../models/Cartegory");

exports.getUserCategories = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const categories = await Category.find({ user: userId });
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
    const newCategory = await new Category({
      name: categoryName,
      user: userId,
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
      const category = await Category.deleteById(categoryId);
      if (category) {
        return res.status(200).send({ message: "Deleted Category!" });
      } else {
        return res.status(422).send({ message: "Category Id is not valid!" });
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
