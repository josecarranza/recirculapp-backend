export default {
  SECRET: "recirculaappApi",
  JWT_KEY: "the_recirculapp",

  MONGO_ATLAS_PASS: 'yheGJPgElOrYcj6z', // Production
  MONGO_ATLAS_USER: 'recirculapp', // Production

  // MONGO_ATLAS_USER: "arce", // Development
  // MONGO_ATLAS_PASS: "ukahGyRq7XkBs8JX", // Development

  // MONGO_ATLAS_URI: "@cluster0.oejaozn.mongodb.net/recirculapp?retryWrites=true&w=majority", // Development

  MONGO_ATLAS_URI: "@cluster0.e0vrb.mongodb.net/recirculapp?retryWrites=true&w=majority", // Production

  
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
