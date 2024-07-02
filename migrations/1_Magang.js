const Migrations = artifacts.require("Magang");

module.exports = function (deployer) {
  deployer.deploy(Migrations);
};
