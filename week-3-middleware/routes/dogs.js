const express = require("express");
const dogs = require("../dogData");
const { ValidationError, NotFoundError } = require("../errors");

const router = express.Router();

router.get("/dogs", (req, res) => {
  res.status(200).json(dogs);
});

router.post("/adopt", (req, res, next) => {
  const { dogName, name, email } = req.body;
  const targetEmail = email || "ellen@codethedream.com";

  if (!dogName || !name) {
    return next(new ValidationError("Missing required fields"));
  }

  const dog = dogs.find((d) => String(d.name) === String(dogName));

  if (!dog || dog.status !== "available") {
    return next(new NotFoundError("Dog not found or not available"));
  }

  res.status(201).json({
    message: `Adoption request received. We will contact you at ${targetEmail} for further details.`,
    application: {
      dogName,
      name,
      applicationId: Date.now(),
    },
  });
});

router.get("/error", (req, res, next) => {
  next(new Error("Test error"));
});

module.exports = router;

