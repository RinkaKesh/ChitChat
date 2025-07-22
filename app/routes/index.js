function registerRoutes(app) {
    require("./auth.route")(app);
    require("./message.route")(app)
};

module.exports = registerRoutes;