const allQueries = require("../models/Queries");
const nodemailer = require("nodemailer");
const config = require("../config.json");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

module.exports.changePassword = async function (req, res) {
  const { email } = req.user;
  const { oldPassword, newPassword, confirmNewPassword } = req.body;
};

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sha1 = (data) => {
  return crypto.createHash("sha1").update(data).digest("hex");
};

const sendConfirmationEmail = async (email, hashedValue) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "This is your new password",
      html: `<h1>Confirmation Code</h1>
              <p>Please use this as your new password until you change it</p>
              <p>${hashedValue}</p>
            </div>`,
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

module.exports.forgotPassword = async function (req, res) {
  try {
    const code = Math.floor(Math.random() * 1000000);
    const hashedValue = sha1(code.toString());
    const { email } = req.body;

    const userExists = await allQueries.checkUserExists(email);

    if (!userExists) return res.status(404).send("Error: User does not exist");

    await allQueries.changeUserPasswordFromEmail(email, hashedValue);
    const isSent = await sendConfirmationEmail(email, hashedValue);
    if (!isSent) return res.status(500).send("Error sending email");
    return res.status(200).send("Sent a new password, please check your email");
  } catch (error) {
    console.log(error);
    return res.status(500).send("Error in the backend");
  }
};

module.exports.login = async function (req, res) {
  try {
    const { email, password } = req.body;
    const userAuthentication = await allQueries.checkUserExists(email);

    if (!userAuthentication)
      return res
        .status(400)
        .send("No user found with the specified email please register");

    const currentTime = new Date();
    const lastTimeLogin = await allQueries.lastTimeLogin(email);
    const timeDiff = (currentTime.getTime() - lastTimeLogin.getTime()) / 60000;
    let isBlocked = await allQueries.isBlocked(email);

    //If he is blocked
    if (isBlocked && timeDiff < config.block_duration) {
      return res
        .status(400)
        .send("You have attempted too many times. Try again later !");
    }
    //If the block duration has passed we reset the logins back to 0
    if (isBlocked && timeDiff > config.block_duration) {
      await allQueries.resetLogins(email);
      isBlocked = false;
    }

    const realPassword = await allQueries.findUserPassword(email);

    if (password === realPassword) {
      await allQueries.resetLogins(email);
      const token = jwt.sign({ email }, process.env.JWT_KEY);

      return res
        .cookies("access_token", token, {
          httpOnly: true,
          maxAge: 1000 * 60 * 60 * 24,
        })
        .status(200)
        .send("Login succeeded");
    }

    //If his password is not correct we increment the loging by 1
    await allQueries.incrementLogins(email);

    //If count logins is more or equals than 3 we need to update the last time he tried to enter and update time stamp
    if (isBlocked) {
      //Updating the time oh his last try to log in
      await allQueries.updateTimeStamp(email);
      return res
        .status(400)
        .send("You have attempted too many times. Try again later!");
    }
    return res
      .status(400)
      .send("Password or email are wrong! Please try again");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Error adding user");
  }
};

module.exports.register = async function (req, res) {
  try {
    const { password, email, firstName, lastName, country, status } = req.body;

    const userExists = await allQueries.checkUserExists(email);
    if (userExists)
      return res.status(400).send("You are already registered please login");

    const userInserted = await allQueries.insertUser(
      email,
      password,
      firstName,
      lastName,
      country,
      status
    );
    if (userInserted === false)
      return res
        .status(500)
        .send("Some error occured while inserting the user");

    return res.status(200).send("Registered successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Error adding user");
  }
};