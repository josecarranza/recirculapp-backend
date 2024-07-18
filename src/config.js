export default {
  SECRET: "recirculaappApi",
  JWT_KEY: "the_recirculapp",

  MONGO_ATLAS_PASS: 'yheGJPgElOrYcj6z', // Production
  MONGO_ATLAS_USER: 'recirculapp', // Production

  // MONGO_ATLAS_USER: "arce", // Development
  // MONGO_ATLAS_PASS: "ukahGyRq7XkBs8JX", // Development

  // MONGO_ATLAS_URI: "@cluster0.oejaozn.mongodb.net/recirculapp?retryWrites=true&w=majority", // Development

  MONGO_ATLAS_URI: "@cluster0.e0vrb.mongodb.net/recirculapp?retryWrites=true&w=majority", // Production

  SENDGRID_API_KEY:
    "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",
  CHAT_ENGINE_PROJECT_ID: "b8a5199d-c96c-4617-8b71-6c5e1da45a53",
  CHAT_ENGINE_PRIVATE_KEY: "98dca570-df0a-450b-870d-9cca232bf055",
  TOKEN_EXPIRATION: 86400, // 24 horas
  smtp: {
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587, // You can also use 25 or 2587 for STARTTLS
    secure: false, // Set to true for port 465 or 2465 (TLS)
    auth: {
      user: 'AKIA5YH4YGO5VTBGUAPJ',
      pass: 'BKDsE/XE9LccCkmq+p75o3ZZxbqTFnVo93MWnUl+tQFn',
    },
  },
};
