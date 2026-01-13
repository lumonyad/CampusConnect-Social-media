const express = require("express");
const session = require("express-session");
const path = require("path");

const { STUDENT_ID } = require("./config");
const { connectDB } = require("./db/mongo");

const createAuthRouter = require("./routes/auth");
const createUsersRouter = require("./routes/users");
const createSocialRouter = require("./routes/social");


const app = express();

app.use(express.json());



app.use(
  session({
    secret: "change_this_secret_for_submission",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(createAuthRouter(STUDENT_ID));
app.use(createUsersRouter(STUDENT_ID));
app.use(createSocialRouter(STUDENT_ID));

app.use(
  `/${STUDENT_ID}`,
  express.static(path.join(__dirname, "..", "client"))
);

app.use(`/${STUDENT_ID}/uploads`, express.static(path.join(__dirname, "uploads"))); 

app.get("/", (req, res) => {
  res.redirect(`/${STUDENT_ID}/`);
});


(async () => {
  await connectDB();

  app.listen(8080, () => {
    console.log("Server running on http://localhost:8080/login");
    console.log(`SPA at http://localhost:8080/${STUDENT_ID}/login`);
    console.log(`Login status JSON at http://localhost:8080/${STUDENT_ID}/login`);
  });
})();

