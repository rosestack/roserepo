const envs = Object.entries(process.env).filter(([key]) => key.startsWith("ROSEREPO_"));

console.log(envs.map(([key, value]) => `${key}=${value}`).join("\n"));
