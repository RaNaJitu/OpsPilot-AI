const { ConflictError, BadRequestError, ForbiddenError, UnauthorizedError } = require("../utils/error")
const {generateAccessToken, generateRefreshToken, verifyRefreshToken} = require('../utils/auth');
const prisma = require('../config/prisma');
const {redis} = require('../config/redis');
const { config } = require("../config");
const logger = require('../config/logger');
const jwt = require('jsonwebtoken');
const {OAuth2Client} = require("google-auth-library");
// const { sendOTPEmail } = require("../utils/email");
const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

exports.verifyGoogleIdToken = async(idToken) =>{
     const ticket = await client.verifyIdToken({
          idToken,
          audience: config.GOOGLE_CLIENT_ID
     })
     const payload = ticket.getPayload();

     if(!payload.sub || !payload.email){
          throw new UnauthorizedError(
               "Google account email is not verified",
               "EMAIL_NOT_VERIFIED"
          );
     }

     const {
          sub,
          email,
          name,
          picture,
          email_verified,
     } = payload;
     
     if (!email_verified) {
          throw new Error("Email is not verified");
     }

     let user = await prisma.user.findUnique({
          where: {
               email,
          },
          select: {
               id: true,
               email: true,
               name: true,
               picture: true,
               googleId: true,
               createdAt: true
          }
     });
     
     if (!user) {
          user = await prisma.user.create({
          data: {
               googleId: sub,
               email,
               name,
               picture,
          },
          });
     }else if (!user.googleId) {
          user = await prisma.user.update({
               where: { id: user.id },
               data: {
                    googleId: sub,
                    picture,
                    name,
               },
          });
     }

     const accessToken = generateAccessToken(user.id);
     const refreshToken = generateRefreshToken(user.id);
     const {jti} = jwt.decode(refreshToken);

     await redis.set(`refresh:${user.id}`, jti, 'EX', config.REFRESH_TOKEN_EXP_SEC);

     

     await redis.set(`user:${user.id}`, JSON.stringify(user), 'EX', config.REDIS_USER_TTL);

     return { accessToken, refreshToken, loggedInUser: user };
     
}

exports.rotateRefreshToken = async(refreshToken) =>{
     const payload = verifyRefreshToken(refreshToken);
     const {id: userId, jti} = payload;

     const storedJti = await redis.get(`refresh:${userId}`);

     if(!storedJti){
          throw new ForbiddenError("Session Expired", "Login AGAIN")
     }

     if(storedJti !== jti){
          await redis.del(`refresh:${userId}`);
          throw new ForbiddenError("Refresh token reused", "LOGIN AGAIN")
     }

     const newAccessToken = generateAccessToken(payload.id);
     const newRefreshToken = generateRefreshToken(payload.id);

     const {jti: newJti} = jwt.decode(newRefreshToken);

     await redis.set(`refresh:${payload.id}`, newJti, 'EX', config.REFRESH_TOKEN_EXP_SEC);
     return {newAccessToken, newRefreshToken};
}

exports.logout = async(refreshToken) =>{
     const payload = verifyRefreshToken(refreshToken);
     const {id: userId, jti} = payload;
     const storedJti = await redis.get(`refresh:${userId}`);
     logger.info(`Stored JTI: ${storedJti}`);
     logger.info(`JTI: ${jti}`);

     if(!storedJti){
          return false;
     }

     if(storedJti !== jti){
          await redis.del(`refresh:${userId}`);
          return false;
     }
     
     await redis.del(`refresh:${userId}`);
     return true;
}


exports.getProfile = async(userId) =>{
     logger.info("First check user in Redis");

     const storedUser = await redis.get(`user:${userId}`);
     if(storedUser){
          logger.info("Fetched user profile from redis");
          return JSON.parse(storedUser);
     }

     logger.info("If user is not in redis, fetch user from DB");
     const userProfile = await prisma.users.findUnique({
          where: {
               id: userId
          }
     })
     
     logger.info("Exclude password field from the user");
     const {password: _password, ...safeUser} = userProfile;
     logger.info("Store user profile in redis for future lookups");
     await redis.set(`user:${userId}`, JSON.stringify(safeUser), 'EX', config.REDIS_USER_TTL);
     return safeUser;
}
