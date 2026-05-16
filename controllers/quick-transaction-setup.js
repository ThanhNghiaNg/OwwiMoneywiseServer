const QuickTransactionSetup = require("../models/QuickTransactionSetup");

function buildCreatedByProfileSnapshot(profile) {
  if (!profile) return undefined;

  return {
    _id: profile._id,
    name: profile.name,
    avatarUrl: profile.avatarUrl || "",
    color: profile.color || "",
  };
}

function getProfileScopedQuery(req, query = {}) {
  return {
    user: req.session.user._id,
    "createdByProfile._id": req.activeProfileId,
    ...query,
  };
}

function normalizePayload(body) {
  return {
    title: String(body.title || "").trim(),
    color: String(body.color || "#0EA5E9").trim(),
    type: body.type,
    category: body.category,
    partner: body.partner,
    amount: Number(body.amount),
    description: body.description || "",
  };
}

function validatePayload(payload) {
  if (!payload.title) return "Title is required.";
  if (!payload.color) return "Color is required.";
  if (!payload.type) return "Type is required.";
  if (!payload.category) return "Category is required.";
  if (!payload.partner) return "Partner is required.";
  if (!Number.isFinite(payload.amount) || payload.amount < 0) return "Amount is invalid.";
  return null;
}

function populateSetup(query) {
  return query
    .populate({ path: "type", select: "name", options: { lean: true } })
    .populate({ path: "partner", select: "name", options: { lean: true } })
    .populate({ path: "category", select: "name", options: { lean: true } })
    .select("-user -__v");
}

exports.getQuickTransactionSetups = async (req, res) => {
  try {
    const setups = await populateSetup(
      QuickTransactionSetup.find(getProfileScopedQuery(req)).lean().sort({ createdAt: -1 })
    );
    return res.send({ data: setups });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err.message });
  }
};

exports.getQuickTransactionSetupById = async (req, res) => {
  try {
    const setup = await populateSetup(
      QuickTransactionSetup.findOne(getProfileScopedQuery(req, { _id: req.params.id })).lean()
    );

    if (!setup) {
      return res.status(404).send({ message: "Quick transaction setup not found." });
    }

    return res.send(setup);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err.message });
  }
};

exports.createQuickTransactionSetup = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const validationError = validatePayload(payload);
    if (validationError) {
      return res.status(422).send({ message: validationError });
    }

    const setup = await QuickTransactionSetup.create({
      ...payload,
      user: req.session.user._id,
      createdByProfile: buildCreatedByProfileSnapshot(req.activeProfile),
    });

    const populated = await populateSetup(QuickTransactionSetup.findById(setup._id).lean());
    return res.status(201).send({ data: populated, message: "Created quick transaction setup!" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err.message });
  }
};

exports.updateQuickTransactionSetup = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const validationError = validatePayload(payload);
    if (validationError) {
      return res.status(422).send({ message: validationError });
    }

    const setup = await QuickTransactionSetup.findOneAndUpdate(
      getProfileScopedQuery(req, { _id: req.params.id }),
      { $set: payload },
      { new: true }
    )
      .populate({ path: "type", select: "name" })
      .populate({ path: "partner", select: "name" })
      .populate({ path: "category", select: "name" })
      .select("-user -__v");

    if (!setup) {
      return res.status(404).send({ message: "Quick transaction setup not found." });
    }

    return res.send({ data: setup, message: "Updated quick transaction setup!" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err.message });
  }
};

exports.deleteQuickTransactionSetup = async (req, res) => {
  try {
    const result = await QuickTransactionSetup.deleteOne(getProfileScopedQuery(req, { _id: req.params.id }));
    if (!result.deletedCount) {
      return res.status(404).send({ message: "Quick transaction setup not found." });
    }

    return res.send({ message: "Deleted quick transaction setup!" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err.message });
  }
};
