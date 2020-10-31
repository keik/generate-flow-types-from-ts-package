import { spawn } from "child_process";
import fs from "fs";
import path from "path";

import chalk from "chalk";
import { bundle } from "dts-bundle";
import enhancedResolve from "enhanced-resolve";
import { compiler } from "flowgen";

const TMP_DIR = "./tmp/generate-flowtype-from-ts";

const handleErrorToExit = (e: Error) => {
  console.error(chalk.red(`Error: ${e.message}`));
  process.exit(1);
};
const createDeclsByTsc = async (
  packageName: string,
  entryFilepath: string,
  options: Options
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const command = `npx tsc -d --emitDeclarationOnly ${entryFilepath} --outDir ${TMP_DIR}/${packageName}`;
    if (options.verbose) {
      console.info(
        chalk.cyan(
          `[decl]: Create TypeScript declaration files with: ${command}`
        )
      );
    }

    const proc = spawn(command, [], { shell: true });
    const entryDelcFilepath = `${TMP_DIR}/${packageName}/${path
      .basename(entryFilepath)
      .replace(/\.ts$/, ".d.ts")}`;

    proc.on("error", (e) => {
      reject(e);
    });

    proc.on("close", () => {
      resolve(entryDelcFilepath);
    });
  });
};

const bundleDecls = (
  packageName: string,
  entryDeclFilepath: string,
  options: Options
) => {
  if (options.verbose) {
    console.info(
      chalk.cyan(
        `[bundle]: Bundle TypeScript declaration files of ${packageName} to ${entryDeclFilepath}`
      )
    );
  }
  const outdir = path.dirname(path.dirname(entryDeclFilepath)); // parent
  const outFilepath = `${outdir}/${packageName}.d.ts`;
  bundle({
    name: packageName,
    main: entryDeclFilepath,
    removeSource: true,
    out: `~/${outFilepath}`,
  });
  return outFilepath;
};

const createFlowTypes = (bundleDeclFilepath: string, options: Options) => {
  const outFilepath = `${options.outdir}/${path
    .basename(bundleDeclFilepath)
    .replace(/\.d\.ts/, ".js.flow")}`;
  if (options.verbose) {
    console.info(
      chalk.cyan(
        `[flowgen]: Generate Flow type from ${bundleDeclFilepath} to ${outFilepath}`
      )
    );
  }
  const flowdef = compiler.compileDefinitionFile(bundleDeclFilepath);
  if (options.verify) {
    if (
      !fs.existsSync(outFilepath) ||
      flowdef !== fs.readFileSync(outFilepath, "utf-8")
    ) {
      throw new Error(
        `Auto-generated flow types are not synchronized: ${outFilepath}`
      );
    }
  } else {
    fs.writeFileSync(outFilepath, flowdef);
  }
  return outFilepath;
};

type Options = { outdir: string; verbose: boolean; verify: boolean };
const main = async (
  packagePaths: Array<string>,
  options: Options
): Promise<void> => {
  const resolve = enhancedResolve.create({ extensions: [".ts", ".tsx"] });

  await Promise.all(
    packagePaths.map((packagePath) =>
      (async () => {
        const hrstart = process.hrtime();
        const entryFilepath = (await new Promise((res, rej) => {
          resolve(packagePath, "", (err: any, result: string) => {
            if (err) {
              rej(new Error(`Can't resolve entry of package: ${packagePath}`));
            }
            res(result);
          });
        })) as string;

        if (path.extname(entryFilepath) !== ".ts")
          throw Error(`Entry filepath must be .ts file: ${entryFilepath}`);
        if (!fs.existsSync(entryFilepath))
          throw Error(`Entry filepath is not exist: ${entryFilepath}`);

        const packageName = path.basename(path.dirname(entryFilepath));
        const entryDelcFilepath = await createDeclsByTsc(
          packageName,
          entryFilepath,
          options
        );
        const bundleDeclFilepath = bundleDecls(
          packageName,
          entryDelcFilepath,
          options
        );
        const generatedFlowFilepath = createFlowTypes(
          bundleDeclFilepath,
          options
        );
        const hrend = process.hrtime(hrstart);
        if (options.verify) {
          console.info(chalk.green("verify: ${generatedFlowFilepath}"));
        } else {
          console.info(
            chalk.green(
              `generated: ${generatedFlowFilepath} (${(
                hrend[0] * 1000 +
                hrend[1] / 1000000
              ).toFixed(0)}ms)`
            )
          );
        }
      })().catch(handleErrorToExit)
    )
  ).catch(handleErrorToExit);
};

export default main;
