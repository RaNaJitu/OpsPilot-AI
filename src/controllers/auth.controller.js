const { BadRequestError, UnauthorizedError } = require("../utils/error");
const asyncHandler = require('../utils/asyncHandler');
const { config } = require('../config');
const authService = require('../services/auth.service');
const logger = require("../config/logger");

const isProd = process.env.NODE_ENV === 'production';
logger.info(`Auth controller isProd: ${isProd}`);
const cookieOptions = (maxAge) => ({
     httpOnly: true,
     secure: isProd,
     sameSite: isProd ? 'strict' : 'lax',
     maxAge,
});




exports.VERIFY_GOOGLE_ID_TOKEN = asyncHandler(async(req, res) =>{
     const {idToken} = req.body;
     if(!idToken){
          throw new BadRequestError(
               "Google ID token is required",
               "GOOGLE_TOKEN_REQUIRED"
          );
     }

     
     const {accessToken, refreshToken, loggedInUser} = await authService.verifyGoogleIdToken(idToken);
     
     res.cookie("accessToken", accessToken, cookieOptions(config.ACCESS_TOKEN_EXP_SEC * 1000))
     res.cookie("refreshToken", refreshToken, cookieOptions(config.REFRESH_TOKEN_EXP_SEC * 1000))

     return res.status(200).json({
          success: true,
          message: "Logged in successfully",
          loggedInUser
     })
})

exports.ROTATE_REFRESH_TOKEN = asyncHandler(async(req, res) =>{
     const refreshToken = req.cookies.refreshToken;
     if(!refreshToken){
          throw new UnauthorizedError("Refresh token is missing", "LOGIN AGAIN")
     }
     
     const {newAccessToken, newRefreshToken} = await authService.rotateRefreshToken(refreshToken);
     res.cookie("accessToken", newAccessToken, cookieOptions(config.ACCESS_TOKEN_EXP_SEC * 1000))
     res.cookie("refreshToken", newRefreshToken, cookieOptions(config.REFRESH_TOKEN_EXP_SEC * 1000))
     .status(200).json({
          success: true,
          message: "Access and Refresh token reissued"
     })
})

exports.LOGOUT = asyncHandler(async(req, res) =>{
     const refreshToken = req.cookies.refreshToken;
     if(!refreshToken){
          throw new UnauthorizedError("Refresh token is missing", "LOGIN AGAIN")
     }

     await authService.logout(refreshToken);

     res.clearCookie("accessToken");
     res.clearCookie("refreshToken");
     return res.status(200).json({
          success: true,
          message: "Logged out successfully"
     })
})

exports.GET_PROFILE = asyncHandler(async(req, res) =>{
     const userId = req.user.id;
     if(!userId){
          throw new BadRequestError("User Id is missing");
     }

     const user = await authService.getProfile(userId);
     return res.status(200).json({
          success: true,
          message: "Fetched user details",
          data: {
               user
          }
     })
})