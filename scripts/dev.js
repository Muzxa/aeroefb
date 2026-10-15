const { spawn } = require("node:child_process");

const children = ["server", "client"].map((folder) => {
  const child = spawn("npm", ["run", "dev"], {
    cwd: `${__dirname}/../${folder}`,
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    if (code) {
      children.forEach((process) => process.kill("SIGTERM"));
      process.exitCode = code;
    }
  });
  return child;
});

function stop() {
  children.forEach((child) => child.kill("SIGTERM"));
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
