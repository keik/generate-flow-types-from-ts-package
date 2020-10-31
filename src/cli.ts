#! /usr/bin/env node

import yargs from "yargs";

import main from ".";

const argv = yargs
  .usage(
    `
Usage: npx generate-flow-types-from-ts-package <path_to_package...>
`
  )
  .help("help")
  .alias("help", "h")
  .demandCommand(1, "You need at least one entries")
  .options({
    verbose: {
      boolean: true,
      description: "Run with verbose logs",
      required: false,
      default: false,
    },
    outdir: {
      string: true,
      description: "Path to directory to output flow types",
      required: true,
    },
    verify: {
      boolean: true,
      description:
        "Verify if auto-generated flow types are synchronized (without overwriting)",
      default: false,
    },
  }).argv;

main(argv._, {
  outdir: argv.outdir,
  verbose: argv.verbose,
  verify: argv.verify,
});
