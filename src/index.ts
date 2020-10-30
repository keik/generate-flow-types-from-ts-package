import { spawn } from "child_process";
import fs from "fs";
import path from "path";

import chalk from "chalk";
import { bundle } from "dts-bundle";
import enhancedResolve from "enhanced-resolve";
import { compiler } from "flowgen";

const TMP_DIR = "./tmp/generate-flowtype-from-ts";

const handleErrorToExit = (e: Error) => {
  console.error(chalk.red(e.message));
  process.exit(1);
};
const createDeclsByTsc = async (
  packageName: string,
  entryFilepath: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const command = `npx tsc -d --emitDeclarationOnly ${entryFilepath} --outDir ${TMP_DIR}/${packageName}`;
    console.log(
      chalk.cyan(`[decl]: Create TypeScript declaration files with: ${command}`)
    );

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

const bundleDecls = (packageName: string, entryDeclFilepath: string) => {
  console.log(
    chalk.cyan(
      `[bundle]: Bundle TypeScript declaration files of ${packageName} to ${entryDeclFilepath}`
    )
  );
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

const createFlowTypes = (
  bundleDeclFilepath: string,
  outdir: string,
  verify: boolean
) => {
  const outFilepath = `${outdir}/${path
    .basename(bundleDeclFilepath)
    .replace(/\.d\.ts/, ".js.flow")}`;
  console.log(
    chalk.cyan(
      `[flowgen]: Generate Flow type from ${bundleDeclFilepath} to ${outFilepath}`
    )
  );
  const flowdef = compiler.compileDefinitionFile(bundleDeclFilepath);
  if (verify) {
    if (
      true ||
      !fs.existsSync(outFilepath) ||
      flowdef !== fs.readFileSync(outFilepath, "utf-8")
    ) {
      throw new Error(
        `Error: auto-generated flow types are not synchronized: ${outFilepath}`
      );
    }
  } else {
    fs.writeFileSync(outFilepath, flowdef);
  }
};

type Options = { outdir: string; verify: boolean };
const main = async (packagePaths: Array<string>, options: Options) => {
  const resolve = enhancedResolve.create({ extensions: [".ts", ".tsx"] });

  await Promise.all(
    packagePaths.map((packagePath) =>
      (async () => {
        const entryFilepath = (await new Promise((res, rej) => {
          resolve(packagePath, "", (err: any, result: string) => {
            if (err) {
              rej(
                new Error(
                  `Error: Can't resolve entrypoint from package: ${packagePath}`
                )
              );
            }
            res(result);
          });
        })) as string;

        if (path.extname(entryFilepath) !== ".ts")
          throw Error(`entry filepath must be .ts file: ${entryFilepath}`);
        if (!fs.existsSync(entryFilepath))
          throw Error(`entry filepath is not exist: ${entryFilepath}`);

        const packageName = path.basename(path.dirname(entryFilepath));
        const entryDelcFilepath = await createDeclsByTsc(
          packageName,
          entryFilepath
        );
        const bundleDeclFilepath = bundleDecls(packageName, entryDelcFilepath);
        createFlowTypes(bundleDeclFilepath, options.outdir, options.verify);
      })().catch(handleErrorToExit)
    )
  ).catch(handleErrorToExit);
};

export default main;
