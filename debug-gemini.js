const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("test-key");
const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });

console.log("Model keys:", Object.keys(model));
console.log("Model prototype keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(model)));
