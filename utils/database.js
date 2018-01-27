const mongojs = require("mongojs");
const params = require("../config/parameters");

const connectionString =
	params.db.user + ":" + params.db.password + "@" + params.db.host + ":" + params.db.port + "/" + params.db.name

const db = mongojs(connectionString);

module.exports = db;
