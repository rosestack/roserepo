console.log(Object.entries(process.env).filter((value) => {
  return value[ 0 ].startsWith("ROSEREPO");
}));