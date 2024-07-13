import {execaSync} from "execa";

const times = Number(process.argv[2]);

const cleanUp = () => {
  try {
    console.log("Cleaning up .turbo and .roserepo folders");
    execaSync("cmd", ["/c", "rd", "/s", "/q", ".turbo"]);
    execaSync("cmd", ["/c", "rd", "/s", "/q", ".roserepo"]);
  } catch (e) {
    console.log("No .turbo or .roserepo folders to clean up");
  }
};

const runTurbo = (noCache) => {
  const args = ["run", "build"];

  if (noCache) {
    args.push("--no-cache", "--force");
  }

  execaSync("turbo", args, {
    cwd: process.cwd(),
    stdio: "ignore",
  });
};
const runRoserepo = (noCache) => {
  const args = ["run", "build"];

  if (noCache) {
    args.push("--no-cache");
  }

  execaSync("roserepo", args, {
    cwd: process.cwd(),
    stdio: "ignore",
  });
};

let avgTurbo = 0;
let avgRoserepo = 0;

const run = (noCache) => {
  for (let i = 0; i < times; i++) {
    console.log(`Run ${i + 1} of ${times}`);

    const startTurbo = Date.now();
    runTurbo(noCache);
    const endTurbo = Date.now();
    avgTurbo += endTurbo - startTurbo;
    console.log(i + 1, "Turbo", endTurbo - startTurbo);

    const startRoserepo = Date.now();
    runRoserepo(noCache);
    const endRoserepo = Date.now();
    avgRoserepo += endRoserepo - startRoserepo;
    console.log(i + 1, "Roserepo", endRoserepo - startRoserepo);
  }

  avgTurbo /= times;
  avgRoserepo /= times;

  console.log();

  console.log(`Average time for ${times} runs:`);

  console.log(`Turbo: ${Math.round(avgTurbo)}ms`);
  console.log(`Roserepo: ${Math.round(avgRoserepo)}ms`);

  console.log();

  if (avgTurbo < avgRoserepo) {
    console.log("Turbo is", `${Math.round((1 - avgTurbo / avgRoserepo) * 100)}%`, "faster than Roserepo");
  } else {
    console.log("Roserepo is", `${Math.round((1 - avgRoserepo / avgTurbo) * 100)}%`, "faster than Turbo");
  }
};

cleanUp();

run(true);

cleanUp();

run(false);
