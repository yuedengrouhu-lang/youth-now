"use strict";

const news = require("./services/news");
const music = require("./services/music");
const weather = require("./services/weather");
const disaster = require("./services/disaster");
const articleLinks = require("./services/article-links");
const maps = require("./services/maps");
const quiz = require("./services/quiz");
const ai = require("./services/ai");

module.exports = { ...news, ...music, ...weather, ...disaster, ...articleLinks, ...maps, ...quiz, ...ai };
