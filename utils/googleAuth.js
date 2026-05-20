const axios = require("axios");

async function verifyGoogleCredential(credential) {
  if (!credential) {
    throw new Error("Google credential is required");
  }

  const { data } = await axios.get("https://oauth2.googleapis.com/tokeninfo", {
    params: { id_token: credential },
  });

  if (process.env.GOOGLE_CLIENT_ID && data.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error("Invalid Google client");
  }

  if (data.email_verified !== "true" && data.email_verified !== true) {
    throw new Error("Google email is not verified");
  }

  return {
    googleId: data.sub,
    email: String(data.email || "").toLowerCase(),
    fullName: data.name || data.email,
    picture: data.picture,
  };
}

module.exports = { verifyGoogleCredential };
