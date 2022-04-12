import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

const prod = process.argv[2] === "production";

esbuild
    .build({
        banner: {
            js: banner,
        },
        entryPoints: ["src/index.ts"],
        bundle: true,
        external: [...builtins, "./node_modules/*", "src/pouchdb.js"],
        format: "cjs",
        watch: false,
        target: "node16",
        logLevel: "info",
        sourcemap: prod ? false : "inline",
        treeShaking: true,
        plugins: [
            // sveltePlugin({
            //     preprocess: sveltePreprocess(),
            //     compilerOptions: { css: true },
            // }),
        ],
        outfile: "dist/index.js",
    })
    .catch((e) => {
        console.dir(e);
        process.exit(1);
    });
