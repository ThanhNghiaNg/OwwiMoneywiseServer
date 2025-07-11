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

exports.getUserCategoriesV2 = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const typeId = req.query.typeId || "";
    const categories = await Category.find({
      user: userId,
      ...(typeId ? { type: typeId } : {}),
    })
      .lean()
      .populate({
        path: "type",
        select: "name",
        options: {
          lean: true,
        }
      })
      .sort([['updatedAt', 'desc']]);;
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
    const categoryId = req.params.id;
    const transactions = await Transaction.find({
      category: categoryId,
      user: userId,
    });
    if (transactions && transactions.length > 0) {
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
    const categoryId = req.params.id;
    const categoryName = req.body.name;
    const description = req.body.description;
    const type = req.body.type;
    await Category.updateOne(
      {
        user: userId,
        _id: categoryId,
      },
      { $set: { name: categoryName, description, type } }
    ).then(result => {
      result.ok && result.nModified
        ? res.status(201).send({ message: "Updated New Partner!" })
        : res.status(400).send({ message: "Failed To Updated Partner!" })
    });
    return
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};
