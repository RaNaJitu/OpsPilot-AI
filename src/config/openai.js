const OpenAI = require("openai");
const { config } = require("./index");

if (!config.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

module.exports = openai;
