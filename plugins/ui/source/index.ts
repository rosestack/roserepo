import Roserepo, {Plugin, logger} from "roserepo";

import {Command} from "commander";

import type {FastifyInstance} from "fastify";
import fastify from "fastify";

import cors from "@fastify/cors";

import type {ViteDevServer} from "vite";
import {createServer} from "vite";

import react from "@vitejs/plugin-react-swc";
import paths from "vite-tsconfig-paths";

import path from "path";

interface Options {
  port?: string;
}

class Ui extends Plugin {
  name = "ui";
  description = "Ui plugin";

  server: FastifyInstance;
  client: ViteDevServer;

  api: string;

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

    this.server.get("/tree", async (request, reply) => {
      const roserepo = this.roserepo.root;

      const getChildren = (roserepo: Roserepo): any[] => {
        return roserepo.children?.map((child) => {
          return {
            cwd: child.cwd,
            name: child.name,
            children: getChildren(child),
          };
        }) ?? [];
      };

      return reply.send({
        roserepo: {
          cwd: roserepo.cwd,
          name: roserepo.name,
          children: getChildren(this.roserepo),
        },
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

  override command(command: Command) {
    command.option("-p, --port <port>", "Port to use");
  }

  use = (options: Options) => new Promise<void>(async (resolve, reject) => {
    await this.initServer();
    await this.initClient();

    this.client.printUrls();

    this.client.httpServer?.on("close", () => {
      if (this.server.server?.listening) {
        this.server.close();
      }

      return resolve();
    });
    this.server.server?.on("close", () => {
      if (this.client.httpServer?.listening) {
        this.client.close();
      }

      return resolve();
    });

    this.client.httpServer?.on("error", (error) => {
      return reject(error);
    });
    this.server.server?.on("error", (error) => {
      return reject(error);
    });
  });
}

export default Ui;