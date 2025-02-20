const Transaction = require("../models/Transaction");
const Category = require("../models/Category");
const Partner = require("../models/Partner");

exports.updateMostUsedCategoryAndType = async (req, res) => {
    try {
        const transactions = await Transaction.find();
        const categories = await Category.find();
        const partners = await Partner.find();

        const categoryMapByUser = {};
        const partnerMapByUser = {};

        transactions.forEach((transaction) => {
            const keyCategory = `${transaction.user}-${transaction.category}`;
            const keyPartner = `${transaction.user}-${transaction.partner}`;
            categoryMapByUser[keyCategory] = (categoryMapByUser[keyCategory] || 0) + 1;
            partnerMapByUser[keyPartner] = (partnerMapByUser[keyPartner] || 0) + 1;
        });

        categories.forEach(async (category) => {
            const keyCategory = `${category.user}-${category._id}`;
            await Category.findByIdAndUpdate(category._id, { usedTime: categoryMapByUser[keyCategory] || 0 }, { new: true })
        })

        partners.forEach(async (partner) => {
            const keyPartner = `${partner.user}-${partner._id}`;
            await Partner.findByIdAndUpdate(partner._id, { usedTime: partnerMapByUser[keyPartner] || 0 }, { new: true })
        })
        console.log({ categoryMapByUser, partnerMapByUser });
        return res.send({ message: "Updated Most Used Category!", categoryMapByUser });

    } catch (err) {
        console.log(err);
        return res.send({ message: err.message });
    }
}