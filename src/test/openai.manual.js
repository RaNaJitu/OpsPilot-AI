require("dotenv").config();

const openai = require("../config/openai");
const { config } = require("../config");

async function test() {
  try {
    const response = await openai.responses.create({
      model: config.OPENAI_MODEL,
      input: "Reply with only SUCCESS",
    });

    console.log("Response:", response.output_text);
  } catch (error) {
    console.error("Status:", error.status);
    console.error("Message:", error.message);

    if (error.response) {
      console.error(error.response.data);
    }
  }
}

test();