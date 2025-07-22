function registerRoutes(app) {
    require("./auth.route")(app);
    require("./message.route")(app)
    require("./groupmessage.route")(app)
};

module.exports = registerRoutes;