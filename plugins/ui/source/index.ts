import type { FastifyInstance } from "fastify";
import fastify from "fastify";

import cors from "@fastify/cors";

import type { ViteDevServer } from "vite";
import { createServer } from "vite";

import react from "@vitejs/plugin-react-swc";
import paths from "vite-tsconfig-paths";

import type Roserepo from "roserepo";
import { logger } from "roserepo";

import path from "path";

class Ui {
  server: FastifyInstance;
  client: ViteDevServer;

  api: string;

  roserepo: Roserepo;

  constructor(roserepo: Roserepo) {
    this.roserepo = roserepo;
  }

  initServer = async () => {
    this.server = fastify({
      logger: {
        level: "error",
      },
    });

    this.server.register(cors, {
      origin: "*",
    });

    this.server.get("/", async (request, reply) => {
      return reply.send({
        ok: true,
      });
    });

    this.server.get("/roserepo", async (request, reply) => {
      return reply.send({
        ok: true,
      });
    });

    this.api = await this.server.listen();
  };

  initClient = async () => {
    this.client = await createServer({
      root: path.resolve(__dirname, "..", "client"),
      define: {
        "process.env.API": JSON.stringify(this.api),
      },
      clearScreen: false,
      customLogger: {
        hasWarned: false,
        hasErrorLogged() {
          return false;
        },
        warnOnce() {
          return;
        },
        info(msg: string) {
          const messages = msg.trim().split("\n");

          messages.forEach((message) => {
            logger.info(message);
          });
        },
        warn(msg: string) {
          const messages = msg.trim().split("\n");

          messages.forEach((message) => {
            logger.warn(message);
          });
        },
        error(msg: string) {
          const messages = msg.trim().split("\n");

          messages.forEach((message) => {
            logger.error(message);
          });
        },
        clearScreen: () => {
          return;
        },
      },
      plugins: [
        react(),
        paths(),
      ],
    });

    return this.client.listen();
  };

  init = async () => {
    await this.initServer();
    await this.initClient();
  };

  start = async () => {
    await this.client.printUrls();
  };
}

export default Ui;