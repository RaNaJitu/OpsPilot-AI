require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { config } = require('./config');
const logger = require('./config/logger');


const { corsMiddleware } = require('./middlewares/cors.middleware');
const errorHandler = require('./middlewares/error.middleware');
const { requestId } = require('./middlewares/requestId.middleware');
const { reqLogger } = require('./middlewares/req.middleware');

const app = express();

app.use(corsMiddleware);
app.use(helmet({
     crossOriginOpenerPolicy: false,
     crossOriginEmbedderPolicy: false,
}));
app.use(requestId);
app.use(reqLogger);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(cookieParser());
app.use("/api/v1/", require("./routes"));


app.get("/", (req, res) => {
     res.send("Hello from index.js of user-service");
})

app.get("/health", (req, res) => {
     res.status(200).json({
          message: "ok"
     })
})

app.use(errorHandler)

const startServer = async () => {
     try {
          const server = app.listen(config.PORT, () => {
               logger.info(
                    `${config.SERVICE_NAME} is running on http://localhost:${config.PORT}`
               );
          })
          // Graceful shutdown
          const shutdown = async () => {
               logger.info('Shutting down gracefully...');

               server.close(() => {
                    logger.info('Server closed');
                    process.exit(0);
               });
          };

          process.on('SIGTERM', shutdown);
          process.on('SIGINT', shutdown);
     } catch (error) {
          logger.error("Failed to Start Server", error);
          process.exit(1);
     }
}
startServer();