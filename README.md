# generate-flow-types-from-ts-package

Generate Flow libdef from Package which implemented by TypeScript.

## Concept

```
TS package
   --[tsc]--> *.d.ts
   --[dts-bundle]--> <package_name>.d.ts
   --[flowgen]--> <package_name>.js.flow
```

## Usage

```
% npx generate-flow-types-from-ts-package --help

Usage: npx generate-flow-types-from-ts-package <path_to_package...>


Options:
      --version  Show version number                                   [boolean]
  -h, --help     Show help                                             [boolean]
      --verbose  Run with verbose logs                                 [boolean]
      --outdir   Path to directory to output flow types      [string] [required]
      --verify   Verify if auto-generated flow types are synchronized (withoutd]
```

## LICENSE

MIT
