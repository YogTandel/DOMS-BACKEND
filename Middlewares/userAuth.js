const Joi = require("joi");

const signupSchema = Joi.object({
  userName: Joi.string().min(3).max(30).required().messages({
    "any.required": "❌ Username is required",
    "string.min": "❌ Username must have at least 3 characters",
    "string.max": "❌ Username can have at most 30 characters",
  }),

  email: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({ tlds: { allow: ["com", "net"] } })
    .messages({
      "string.email": "❌ Invalid email format",
      "any.required": "❌ Email is required",
      "string.min": "❌ Email must have at least 6 characters",
      "string.max": "❌ Email can have at most 60 characters",
    }),

  password: Joi.string()
    .required()
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{6,}$"))
    .messages({
      "string.pattern.base":
        "❌ Password must be at least 6 characters long, include at least one lowercase letter, one uppercase letter, and one digit",
    }),

  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "❌ Passwords must match",
    "any.required": "❌ Confirm Password is required",
  }),
});

const signinSchema = Joi.object({
  email: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({ tlds: { allow: ["com", "net"] } })
    .messages({
      "string.email": "❌ Invalid email format",
      "any.required": "❌ Email is required",
      "string.min": "❌ Email must have at least 6 characters",
      "string.max": "❌ Email can have at most 60 characters",
    }),
  password: Joi.string()
    .required()
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{6,}$"))
    .messages({
      "string.pattern.base":
        "❌ Password must be at least 6 characters long, include at least one lowercase letter, one uppercase letter, and one digit",
    }),
});

const acceptCodeSchema = Joi.object({
  email: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({ tlds: { allow: ["com", "net"] } })
    .messages({
      "string.email": "❌ Invalid email format",
      "any.required": "❌ Email is required",
      "string.min": "❌ Email must have at least 6 characters",
      "string.max": "❌ Email can have at most 60 characters",
    }),
  providedCode: Joi.number().required(),
});

const changePasswordSchema = Joi.object({
  newPassword: Joi.string()
    .required()
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{6,}$"))
    .messages({
      "string.pattern.base":
        "❌ Password must be at least 6 characters long, include at least one lowercase letter, one uppercase letter, and one digit",
    }),

  oldPassword: Joi.string()
    .required()
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{6,}$"))
    .messages({
      "string.pattern.base":
        "❌ Password must be at least 6 characters long, include at least one lowercase letter, one uppercase letter, and one digit",
    }),
});

const acceptFPCodeSchema = Joi.object({
  email: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({ tlds: { allow: ["com", "net"] } })
    .messages({
      "string.email": "❌ Invalid email format",
      "any.required": "❌ Email is required",
      "string.min": "❌ Email must have at least 6 characters",
      "string.max": "❌ Email can have at most 60 characters",
    }),
  providedCode: Joi.number().required(),
  newPassword: Joi.string()
    .required()
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{6,}$"))
    .messages({
      "string.pattern.base":
        "❌ Password must be at least 6 characters long, include at least one lowercase letter, one uppercase letter, and one digit",
    }),
});

module.exports = {
  signupSchema,
  signinSchema,
  acceptCodeSchema,
  changePasswordSchema,
  acceptFPCodeSchema,
};
