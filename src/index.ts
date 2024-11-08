import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';
import process from 'node:process';

const numCPUs = availableParallelism();

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  // Spawn n-1 processes if not specified.
  let instances = (numCPUs - 1)
  if (process.env.Instances) {
    instances = parseInt(process.env.Instances)
  }

  if (process.versions.bun) {
    // Bun can run webserver on the primary thread, nodejs cannot.
    instances -= 1;
  }

  // Fork workers.
  for (let i = 0; i < instances; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    process.exit()
  });
} else {
  console.log(`Worker ${process.pid} started`);
}

import { Hono } from 'hono'
import { trimTrailingSlash } from 'hono/trailing-slash'
import { parseGzippedJson } from 'middlewares/parse-gzip-json.js';
import { logging } from 'middlewares/logging.js';
import { createIndexes } from 'modules/database-indexes.js';
import { port } from 'modules/config.js';
import { errorHandler } from 'middlewares/error-handler.js';

import fs from "fs";
import path from "path";
import { client } from 'modules/database.js';
import { initMatchmaking } from 'modules/matchmaking.js';

// Initialize Hono app
const app = new Hono()
app.use(trimTrailingSlash())
app.use(parseGzippedJson)
app.use(logging)

// Create Indexes
createIndexes();

// Error handling middleware
app.onError(errorHandler)

// Start matchmaking if needed
if (process.env.MATCHMAKING_ENABLED === 'true') {
  initMatchmaking()
}

// Function to recursively import routes
function importRoutes(folderPath, baseRoute = "") {
  const files = fs.readdirSync(folderPath);

  const importPromises = [];

  const importFile = async (file: string) => {
    const filePath = path.join(folderPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      // Recursively import routes from subdirectories
      await importRoutes(filePath, path.join(baseRoute, file));
    } else if (file.endsWith(".js") || file.endsWith(".ts")) {
      // Import and mount JavaScript files as routes
      const requiredRoutes = await import(filePath);
      const { routes } = requiredRoutes

      const routeName = file === "index.js" ? "" : file === "index.ts" ? "" : path.parse(file).name;
      const fullRoute = path.join(baseRoute, routeName);
      app.route(fullRoute, routes);
    }
  }
  files.forEach((file) => {
    importPromises.push(importFile(file))
  });

  return Promise.all(importPromises)
}

// Import all routes from the routes folder
let fileDirectory = __dirname
if (process.versions.bun) {
  fileDirectory = import.meta.dir
}

const apiFolder = path.join(fileDirectory, "routes");
await importRoutes(apiFolder, "");

app.get('/', (c) => c.text('Are you lost?', 404))
app.get('/*', (c) => c.text('Are you lost?', 404))

// Start the server
console.log(`Matchmaking Backend (Process ${process.pid}) listening on port ${port}`)

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...')
  await client.close()
  console.log('MongoDB connection closed')
  process.exit(0)
})

let serveOptions: any = {
  port,
  fetch: app.fetch,
}

if (process.versions.bun) {
  serveOptions.reusePort = true
  Bun.serve(serveOptions)
} else {
  if (!cluster.isWorker) {
    import("@hono/node-server").then(({ serve: serveNodeJS }) => {
      serveNodeJS(serveOptions);
    });
  }
}