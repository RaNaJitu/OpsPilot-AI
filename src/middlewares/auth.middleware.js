const prisma = require("../config/prisma");
const redis = require("../config/redis");

const asyncHandler = require("../utils/asyncHandler");
const { verifyAccessToken } = require("../utils/auth");
const { UnauthorizedError } = require("../utils/error");

exports.authenticate = asyncHandler(async (req, res, next) => {
    const token = req.cookies.accessToken;

    if (!token) {
        throw new UnauthorizedError(
        "Access token is missing",
        "ACCESS_TOKEN_MISSING"
        );
    }

    let payload;

    try {
        payload = verifyAccessToken(token);
    } catch (error) {
        throw new UnauthorizedError(
        "Invalid or expired access token",
        "INVALID_ACCESS_TOKEN"
        );
    }

    const userId = payload.sub;

    let user = await redis.get(`user:${userId}`);

    if (user) {
        req.user = JSON.parse(user);
        return next();
    }

    user = await prisma.user.findUnique({
        where: {
        id: userId,
        },
        select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        createdAt: true,
        },
    });

    if (!user) {
        throw new UnauthorizedError(
        "User not found",
        "USER_NOT_FOUND"
        );
    }

    await redis.set(
        `user:${user.id}`,
        JSON.stringify(user),
        "EX",
        config.REDIS_USER_TTL
    );

    req.user = user;

    next();
});