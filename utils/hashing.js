const { hash, compare } = require("bcryptjs");
const { createHmac } = require("crypto");

const doHash = async (value, saltValue) => {
  try {
    const result = await hash(value, saltValue);
    return result; // Return the hashed password
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Error hashing password");
  }
};

const doHashValidation = async (value, hasedValue) => {
  try {
    const result = compare(value, hasedValue);
    return result;
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Error hashing password");
  }
};

const hmacProcess = async (value, key) => {
  try {
    const result = createHmac("sha256", key).update(value).digest("hex");
    return result;
  } catch (error) {
    console.error("❌ Error creating HMAC:", error);
  }
};

module.exports = {
  doHash,
  doHashValidation,
  hmacProcess,
};
