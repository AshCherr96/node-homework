const express = require("express");
const dogs = require("../dogData");
const { ValidationError, NotFoundError } = require("../errors");

const router = express.Router();

router.get("/dogs", (req, res) => {
  res.status(200).json(dogs);
});

router.post("/adopt", (req, res, next) => {
  const { dogId, adopterName, name, address, email, dogName } = req.body;

  const targetDogId = dogId || dogName;
  const targetAdopter = adopterName || name;
  const targetEmail = email || "ellen@codethedream.com"; // Fallback if email isn't explicitly sent

  if (!targetDogId || !targetAdopter) {
    return next(new ValidationError("Missing required fields"));
  }

  const dog = dogs.find(
    (d) => 
      String(d.id) === String(targetDogId) || 
      d.name.toLowerCase() === String(targetDogId).toLowerCase()
  );

  if (!dog || dog.available === false) {
    return next(new NotFoundError("Dog not found or not available"));
  }

  // Update message 
  res.status(201).json({
    message: `Adoption request received. We will contact you at ${targetEmail} for further details.`,
    application: {
      dogId: targetDogId,
      adopterName: targetAdopter,
      email: targetEmail,
      applicationId: Date.now(),
    },
  });
});

router.get("/error", (req, res, next) => {
  next(new Error("Test error"));
});

module.exports = router;

